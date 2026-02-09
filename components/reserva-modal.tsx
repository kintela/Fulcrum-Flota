"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { format, isBefore, isAfter, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import type { DateRange } from "react-day-picker"
import { crearReservaTemporal, verificarDisponibilidad } from "@/app/actions/reservas-temporales"
import { supabase } from "@/lib/supabase"
import { DialogDescription } from "@radix-ui/react-dialog"

interface ReservaModalProps {
  isOpen: boolean
  onClose: () => void
  matricula: string
  marcaModelo: string
  onReservaCreada: (mensaje: string) => void
}

export function ReservaModal({ isOpen, onClose, matricula, marcaModelo, onReservaCreada }: ReservaModalProps) {
  const roundToNext30 = (date: Date) => {
    const d = new Date(date)
    const minutes = d.getMinutes()
    if (minutes === 0 || minutes === 30) return d
    if (minutes < 30) {
      d.setMinutes(30, 0, 0)
    } else {
      d.setHours(d.getHours() + 1, 0, 0, 0)
    }
    return d
  }

  const ahora = new Date()
  const inicioBase = roundToNext30(ahora)
  const cuatroHorasDespues = new Date(inicioBase.getTime() + 4 * 60 * 60 * 1000)

  const [fechaInicio, setFechaInicio] = useState<Date>(inicioBase)
  const [fechaFin, setFechaFin] = useState<Date>(cuatroHorasDespues)
  const [horaInicio, setHoraInicio] = useState(
    `${inicioBase.getHours().toString().padStart(2, "0")}:${inicioBase.getMinutes().toString().padStart(2, "0")}`
  )
  const [horaFin, setHoraFin] = useState(
    `${cuatroHorasDespues.getHours().toString().padStart(2, "0")}:${cuatroHorasDespues.getMinutes().toString().padStart(2, "0")}`
  )
  const [observaciones, setObservaciones] = useState("")
  const [numeroMeses, setNumeroMeses] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [bloqueos, setBloqueos] = useState<Array<{ desde: Date; hasta: Date }>>([])
  const diasReservados = useMemo(() => {
    if (bloqueos.length === 0) return []
    const dias = new Map<string, Date>()
    bloqueos.forEach(({ desde, hasta }) => {
      const start = new Date(desde)
      start.setHours(0, 0, 0, 0)
      const end = new Date(hasta)
      end.setHours(0, 0, 0, 0)
      const cursor = new Date(start)
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10)
        if (!dias.has(key)) dias.set(key, new Date(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
    })
    return Array.from(dias.values())
  }, [bloqueos])

  // Nueva lógica: calcular hora mínima permitida para inicio si la fecha seleccionada es hoy
  const minHoraInicioHoy = useMemo(() => {
    if (!fechaInicio) return null
    const hoy = new Date()
    if (fechaInicio.toDateString() !== hoy.toDateString()) return null
    // Redondear a siguiente bloque de 30 minutos
    const minutes = hoy.getMinutes()
    const rounded = new Date(hoy)
    if (minutes < 30) {
      rounded.setMinutes(30, 0, 0)
    } else {
      rounded.setHours(rounded.getHours() + 1, 0, 0, 0)
    }
    const hh = rounded.getHours().toString().padStart(2, '0')
    const mm = rounded.getMinutes().toString().padStart(2, '0')
    return `${hh}:${mm}`
  }, [fechaInicio])

  // NUEVO: hora mínima de fin cuando inicio y fin son el mismo día
  const minHoraFin = useMemo(() => {
    if (!fechaInicio || !fechaFin) return null
    if (fechaInicio.toDateString() !== fechaFin.toDateString()) return null
    // sumar 30 min a horaInicio
    const [h, m] = horaInicio.split(":").map(Number)
    const base = new Date()
    base.setHours(h, m, 0, 0)
    base.setMinutes(base.getMinutes() + 30) // mínimo media hora después
    let hh = base.getHours()
    let mm = base.getMinutes()
    if (hh >= 24) return "24:00" // marcador para obligar a pasar a día siguiente
    return `${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`
  }, [fechaInicio, fechaFin, horaInicio])

  const skipAutoAjusteRef = useRef(false)
  const rangoSeleccionado = useMemo<DateRange>(
    () => ({ from: fechaInicio, to: fechaFin }),
    [fechaInicio, fechaFin]
  )

  // Si la hora seleccionada queda por debajo tras cambiar fecha -> ajustar
  useEffect(() => {
    if (minHoraInicioHoy && horaInicio < minHoraInicioHoy) {
      setHoraInicio(minHoraInicioHoy)
    }
  }, [minHoraInicioHoy, horaInicio])

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)")
    const sync = () => setNumeroMeses(mql.matches ? 2 : 1)
    sync()
    mql.addEventListener("change", sync)
    return () => mql.removeEventListener("change", sync)
  }, [])

  // Ajustar hora/fecha fin a inicio + 4h cuando cambie la hora de inicio
  useEffect(() => {
    if (!fechaInicio) return
    if (skipAutoAjusteRef.current) {
      skipAutoAjusteRef.current = false
      return
    }
    const [h, m] = horaInicio.split(":").map(Number)
    const inicioDate = new Date(fechaInicio)
    inicioDate.setHours(h, m, 0, 0)
    const finDate = new Date(inicioDate.getTime() + 4 * 60 * 60 * 1000)
    setFechaFin(finDate)
    setHoraFin(`${finDate.getHours().toString().padStart(2, "0")}:${finDate.getMinutes().toString().padStart(2, "0")}`)
  }, [horaInicio, fechaInicio])

  // Ajustar hora fin si es inválida respecto a inicio (mismo día)
  useEffect(() => {
    if (minHoraFin === "24:00") {
      // mover fecha fin al día siguiente y poner 00:00
      if (fechaFin && fechaInicio && fechaFin.toDateString() === fechaInicio.toDateString()) {
        const next = new Date(fechaFin)
        next.setDate(next.getDate() + 1)
        setFechaFin(next)
        setHoraFin("00:00")
      }
      return
    }
    if (minHoraFin && horaFin < minHoraFin && minHoraFin !== "24:00") {
      setHoraFin(minHoraFin)
    }
  }, [minHoraFin, horaFin, fechaFin, fechaInicio])

  const today = useMemo(() => startOfDay(new Date()), [])
  const isBeforeToday = (date: Date) => startOfDay(date).getTime() < today.getTime()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Validaciones básicas
      if (!fechaInicio || !fechaFin) {
        setError("Debe seleccionar fecha de inicio y fin en el calendario")
        return
      }

      // Crear las fechas completas con horas
      const fechaInicioCompleta = new Date(fechaInicio)
      const [horasInicio, minutosInicio] = horaInicio.split(":").map(Number)
      fechaInicioCompleta.setHours(horasInicio, minutosInicio, 0, 0)

      const fechaFinCompleta = new Date(fechaFin)
      const [horasFin, minutosFin] = horaFin.split(":").map(Number)
      fechaFinCompleta.setHours(horasFin, minutosFin, 0, 0)
      
      console.log(`🕒 DEBUG FECHAS RESERVA:`)
      console.log(`   Usuario selecciona: ${fechaFin.toDateString()} ${horaFin}`)
      console.log(`   Fecha local creada: ${fechaFinCompleta.toString()}`)
      console.log(`   Fecha UTC para BD: ${fechaFinCompleta.toISOString()}`)

      // Validar que las fechas sean válidas
      if (isBefore(fechaInicioCompleta, new Date())) {
        setError("La fecha de inicio no puede ser anterior a la fecha actual")
        return
      }

      if (isAfter(fechaInicioCompleta, fechaFinCompleta)) {
        setError("La fecha de fin debe ser posterior a la fecha de inicio")
        return
      }

      // Verificar disponibilidad antes de crear la reserva
      const disponibilidad = await verificarDisponibilidad(
        matricula,
        fechaInicioCompleta.toISOString(),
        fechaFinCompleta.toISOString()
      )

      if (!disponibilidad.success) {
        setError(disponibilidad.error || "Error al verificar disponibilidad")
        return
      }

      if (!disponibilidad.disponible) {
        setError("El vehículo no está disponible en el período seleccionado")
        return
      }

      // Crear la reserva
      const resultado = await crearReservaTemporal({
        matricula,
        fecha_inicio: fechaInicioCompleta.toISOString(),
        fecha_fin: fechaFinCompleta.toISOString(),
        observaciones: observaciones.trim() || undefined
      })

      if (resultado.success) {
        onReservaCreada(resultado.message || "Reserva creada exitosamente")
        handleClose()
      } else {
        setError(resultado.error || "Error al crear la reserva")
      }

    } catch (error) {
      console.error("Error creating reservation:", error)
      setError("Error inesperado al crear la reserva")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    // Limpiar el formulario
    const now = new Date()
    const inicio = roundToNext30(now)
    const plus4 = new Date(inicio.getTime() + 4 * 60 * 60 * 1000)
    setFechaInicio(inicio)
    setFechaFin(plus4)
    setHoraInicio(`${inicio.getHours().toString().padStart(2, "0")}:${inicio.getMinutes().toString().padStart(2, "0")}`)
    setHoraFin(`${plus4.getHours().toString().padStart(2, "0")}:${plus4.getMinutes().toString().padStart(2, "0")}`)
    setObservaciones("")
    setError("")
    skipAutoAjusteRef.current = false
    onClose()
  }

  const handleRangeSelect = (nextRange: DateRange | undefined) => {
    if (!nextRange?.from) return
    if (isBeforeToday(nextRange.from)) return
    if (nextRange.to && isBeforeToday(nextRange.to)) return
    setFechaInicio(nextRange.from)
    if (nextRange.to) {
      skipAutoAjusteRef.current = true
      setFechaFin(nextRange.to)
    } else {
      setFechaFin(nextRange.from)
    }
    setError("")
  }

  const generarHoras = () => {
    const horas = []
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 60; j += 30) {
        const hora = `${i.toString().padStart(2, '0')}:${j.toString().padStart(2, '0')}`
        horas.push(hora)
      }
    }
    return horas
  }

  // Cargar ventanas de bloqueo (bloqueo_desde -> fecha_fin) para la matrícula seleccionada
  useEffect(() => {
    const cargarBloqueos = async () => {
      try {
        const { data, error } = await supabase
          .from("reservas")
          .select("fecha_inicio, fecha_fin, bloqueo_desde")
          .eq("matricula", matricula)
          .in("estado", ["activa", "pendiente"])

        if (error || !data) {
          console.warn("No se pudieron cargar bloqueos de reservas:", error)
          setBloqueos([])
          return
        }

        const ventanas = data.map((r) => {
          const desde = r.bloqueo_desde ? new Date(r.bloqueo_desde) : new Date(r.fecha_inicio)
          const hasta = new Date(r.fecha_fin)
          return { desde, hasta }
        })

        setBloqueos(ventanas)
      } catch (e) {
        console.warn("Error inesperado cargando bloqueos:", e)
        setBloqueos([])
      }
    }

    if (isOpen) {
      cargarBloqueos()
    }
  }, [isOpen, matricula])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="reserva-modal-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            Reservar Vehículo
          </DialogTitle>
          <DialogDescription id="reserva-modal-description" className="sr-only">
            Formulario para crear una reserva temporal de vehículo
          </DialogDescription>
          <p className="text-sm text-gray-600">
            {matricula} - {marcaModelo}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Calendario de Reserva */}
          <div className="space-y-2">
            <Label>Fechas de Reserva</Label>
            <div className="rounded-md border bg-white">
              <Calendar
                mode="range"
                numberOfMonths={numeroMeses}
                pagedNavigation
                selected={rangoSeleccionado}
                onSelect={handleRangeSelect}
                disabled={{ before: today }}
                showOutsideDays={false}
                locale={es}
                modifiers={{ reservado: diasReservados }}
                modifiersClassNames={{
                  reservado: "bg-amber-100 text-amber-700"
                }}
                modifiersStyles={{
                  disabled: {
                    color: "#9ca3af",
                    backgroundColor: "#f3f4f6",
                    textDecoration: "line-through"
                  }
                }}
                classNames={{
                  months: "flex flex-col lg:flex-row gap-8",
                  month: "space-y-3",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-base font-semibold text-gray-900",
                  nav: "space-x-2 flex items-center",
                  nav_button:
                    "h-8 w-8 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse",
                  head_row: "flex",
                  head_cell:
                    "w-10 text-[11px] font-semibold text-gray-500 uppercase tracking-wide",
                  row: "flex w-full mt-2",
                  cell: "h-10 w-10 text-center text-sm p-0 relative",
                  day: "h-10 w-10 rounded-full cursor-pointer hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  day_selected:
                    "bg-gray-900 text-white hover:bg-gray-900 focus:bg-gray-900",
                  day_today: "border border-gray-900 text-gray-900",
                  day_outside: "text-gray-300",
                  day_disabled:
                    "text-gray-400 bg-gray-100/80 opacity-70 line-through cursor-not-allowed pointer-events-none hover:bg-gray-100",
                  day_range_start:
                    "bg-gray-900 text-white rounded-full hover:bg-gray-900",
                  day_range_end:
                    "bg-gray-900 text-white rounded-full hover:bg-gray-900",
                  day_range_middle: "bg-gray-100 text-gray-900 rounded-none",
                }}
                className="w-full"
              />
            </div>
            <p className="text-xs text-gray-500">
              Selecciona un rango de fechas. Puedes navegar entre meses para elegir cualquier día.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-800">Inicio:</span>
                <span>
                  {rangoSeleccionado?.from ? format(rangoSeleccionado.from, "PPP", { locale: es }) : "Selecciona día"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-800">Fin:</span>
                <span>
                  {rangoSeleccionado?.to ? format(rangoSeleccionado.to, "PPP", { locale: es }) : "Selecciona día"}
                </span>
              </div>
            </div>
          </div>

          {/* Hora de Inicio */}
          <div className="space-y-2">
            <Label htmlFor="horaInicio">Hora de Inicio</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {generarHoras().map((hora) => {
                  const disabledPorHora = !!minHoraInicioHoy && hora < minHoraInicioHoy
                  let disabledPorBloqueo = false

                  if (fechaInicio) {
                    const [h, m] = hora.split(":").map(Number)
                    const slot = new Date(fechaInicio)
                    slot.setHours(h, m, 0, 0)
                    disabledPorBloqueo = bloqueos.some((b) => slot >= b.desde && slot < b.hasta)
                  }

                  const disabledOpt = disabledPorHora || disabledPorBloqueo
                  return (
                    <option key={hora} value={hora} disabled={disabledOpt}>
                      {hora}{disabledOpt ? ' (no disponible)' : ''}
                    </option>
                  )
                })}
              </select>
              {minHoraInicioHoy && (
                <p className="mt-1 text-xs text-gray-500">Mínimo hoy: {minHoraInicioHoy}</p>
              )}
            </div>
          </div>

          {/* Hora de Fin */}
          <div className="space-y-2">
            <Label htmlFor="horaFin">Hora de Fin</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {generarHoras().map((hora) => {
                  let disabledOpt = false
                  if (fechaInicio && fechaFin && fechaInicio.toDateString() === fechaFin.toDateString()) {
                    if (minHoraFin === "24:00") disabledOpt = true
                    else if (minHoraFin) disabledOpt = hora <= horaInicio || hora < minHoraFin
                  }

                  if (fechaFin) {
                    const [h, m] = hora.split(":").map(Number)
                    const slot = new Date(fechaFin)
                    slot.setHours(h, m, 0, 0)
                    const bloqueado = bloqueos.some((b) => slot >= b.desde && slot < b.hasta)
                    disabledOpt = disabledOpt || bloqueado
                  }

                  return (
                    <option key={hora} value={hora} disabled={disabledOpt}>
                      {hora}{disabledOpt ? ' (no disponible)' : ''}
                    </option>
                  )
                })}
              </select>
              {fechaInicio && fechaFin && fechaInicio.toDateString() === fechaFin.toDateString() && (
                <p className="mt-1 text-xs text-gray-500">
                  {minHoraFin === "24:00" ? 'El fin debe pasar al día siguiente' : `Mínimo fin: ${minHoraFin}`}
                </p>
              )}
            </div>
          </div>

          {bloqueos.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-gray-600 flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded border border-amber-300 bg-amber-100" />
                Días con reservas existentes
              </div>
              <div className="text-xs text-gray-600">
                <p className="font-medium text-gray-700">Reservas existentes:</p>
                <ul className="mt-1 space-y-1">
                  {bloqueos.map((b, idx) => {
                    const inicio = format(b.desde, "dd/MM/yyyy HH:mm")
                    const fin = format(b.hasta, "dd/MM/yyyy HH:mm")
                    return (
                      <li key={`${inicio}-${fin}-${idx}`}>
                        {inicio} → {fin}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Motivo de la reserva, destino, etc."
              className="min-h-[80px]"
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              {observaciones.length}/500 caracteres
            </p>
          </div>

          {/* Mostrar errores */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Creando..." : "Crear Reserva"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
