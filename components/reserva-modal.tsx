"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { format, isBefore, isAfter, startOfDay, isSameDay, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { type DateRange, type OnSelectHandler, type DayButtonProps } from "react-day-picker"
import { crearReservaTemporal, verificarDisponibilidad } from "@/app/actions/reservas-temporales"
import { supabase } from "@/lib/supabase"
import { DialogDescription } from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

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
  const [fechaFin, setFechaFin] = useState<Date | undefined>(cuatroHorasDespues)
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
  const [bloqueos, setBloqueos] = useState<Array<{ desde: Date; hasta: Date; inicioReal: Date }>>([])
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

  const diasBloqueados = useMemo(() => {
    if (bloqueos.length === 0) return []
    const dayMap = new Map<
      string,
      { dayStart: Date; dayEnd: Date; intervals: Array<[number, number]> }
    >()

    bloqueos.forEach(({ desde, hasta }) => {
      let cursor = startOfDay(desde)
      const endCursor = startOfDay(hasta)

      while (cursor <= endCursor) {
        const dayStart = new Date(cursor)
        const dayEnd = addDays(dayStart, 1)
        const intervalStart = Math.max(desde.getTime(), dayStart.getTime())
        const intervalEnd = Math.min(hasta.getTime(), dayEnd.getTime())

        if (intervalEnd > intervalStart) {
          const key = dayStart.toISOString().slice(0, 10)
          const entry = dayMap.get(key) || { dayStart, dayEnd, intervals: [] }
          entry.intervals.push([intervalStart, intervalEnd])
          dayMap.set(key, entry)
        }

        cursor = addDays(cursor, 1)
      }
    })

    const bloqueados: Date[] = []
    dayMap.forEach(({ dayStart, dayEnd, intervals }) => {
      intervals.sort((a, b) => a[0] - b[0])
      let [currentStart, currentEnd] = intervals[0]
      if (currentStart > dayStart.getTime()) return
      for (let i = 1; i < intervals.length; i++) {
        const [s, e] = intervals[i]
        if (s > currentEnd) return
        if (e > currentEnd) currentEnd = e
        if (currentEnd >= dayEnd.getTime()) break
      }
      if (currentEnd >= dayEnd.getTime()) {
        bloqueados.push(dayStart)
      }
    })

    return bloqueados
  }, [bloqueos])

  const minHoraInicioPorBloqueo = useMemo(() => {
    if (!fechaInicio) return null
    const inicioDia = startOfDay(fechaInicio)
    const bloqueosArrastre = bloqueos.filter(
      (b) => b.desde < inicioDia && b.hasta > inicioDia
    )
    if (bloqueosArrastre.length === 0) return null
    const ultimoFin = bloqueosArrastre.reduce((max, current) => (current.hasta > max ? current.hasta : max), bloqueosArrastre[0].hasta)
    const redondeado = roundToNext30(ultimoFin)
    const hh = redondeado.getHours().toString().padStart(2, "0")
    const mm = redondeado.getMinutes().toString().padStart(2, "0")
    return `${hh}:${mm}`
  }, [bloqueos, fechaInicio])

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

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)")
    const sync = () => setNumeroMeses(mql.matches ? 2 : 1)
    sync()
    mql.addEventListener("change", sync)
    return () => mql.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    if (minHoraInicioPorBloqueo && horaInicio < minHoraInicioPorBloqueo) {
      setHoraInicio(minHoraInicioPorBloqueo)
    }
  }, [minHoraInicioPorBloqueo, horaInicio])

  // Ajustar hora/fecha fin a inicio + 4h cuando cambie la hora de inicio
  useEffect(() => {
    if (!fechaInicio || !fechaFin) return
    if (!isSameDay(fechaInicio, fechaFin)) return
    if (skipAutoAjusteRef.current) {
      skipAutoAjusteRef.current = false
      return
    }
    const [h, m] = horaInicio.split(":").map(Number)
    const inicioDate = new Date(fechaInicio)
    inicioDate.setHours(h, m, 0, 0)
    const finDate = new Date(inicioDate.getTime() + 4 * 60 * 60 * 1000)
    if (fechaFin.getTime() === finDate.getTime()) return
    setFechaFin(finDate)
    setHoraFin(`${finDate.getHours().toString().padStart(2, "0")}:${finDate.getMinutes().toString().padStart(2, "0")}`)
  }, [horaInicio, fechaInicio, fechaFin])

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

      // Validar que las fechas sean válidas (permitir cualquier hora del día de hoy)
      if (isBefore(fechaInicioCompleta, today)) {
        setError("La fecha de inicio no puede ser anterior a la fecha actual")
        return
      }

      if (minHoraInicioPorBloqueo && horaInicio < minHoraInicioPorBloqueo) {
        setError(`La hora de inicio no puede ser anterior a ${minHoraInicioPorBloqueo}`)
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

  const handleRangeSelect: OnSelectHandler<DateRange | undefined> = (
    _nextRange,
    selectedDay,
    modifiers
  ) => {
    if (!selectedDay) return
    if (modifiers.disabled || modifiers.full || isBeforeToday(selectedDay)) return

    const tieneRangoCompleto = !!fechaInicio && !!fechaFin

    if (!fechaInicio || tieneRangoCompleto) {
      setFechaInicio(selectedDay)
      setFechaFin(undefined)
      setError("")
      return
    }

    if (selectedDay.getTime() < fechaInicio.getTime()) {
      setFechaInicio(selectedDay)
      setFechaFin(undefined)
      setError("")
      return
    }

    skipAutoAjusteRef.current = true
    setFechaFin(selectedDay)
    setError("")
  }

  const DayButton = (props: DayButtonProps) => {
    const { day, modifiers, className, ...buttonProps } = props
    const ref = useRef<HTMLButtonElement | null>(null)
    useEffect(() => {
      if (modifiers.focused) ref.current?.focus()
    }, [modifiers.focused])

    const bloqueadoCompleto = modifiers.full === true
    const tooltip = bloqueadoCompleto ? "Día completo ya reservado" : buttonProps.title

    return (
      <button
        ref={ref}
        aria-disabled={bloqueadoCompleto || undefined}
        title={tooltip}
        {...buttonProps}
        className={cn(
          className,
          bloqueadoCompleto &&
            "cursor-not-allowed bg-amber-200 text-amber-900 hover:bg-amber-200"
        )}
      />
    )
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
          const inicioReal = new Date(r.fecha_inicio)
          const desde = r.bloqueo_desde ? new Date(r.bloqueo_desde) : inicioReal
          const hasta = new Date(r.fecha_fin)
          return { desde, hasta, inicioReal }
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
                modifiers={{ reservado: diasReservados, full: diasBloqueados }}
                modifiersClassNames={{
                  reservado: "bg-amber-100 text-amber-700",
                  full: "bg-amber-200 text-amber-900"
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
                  day: "h-10 w-10 p-0 text-center",
                  day_button:
                    "h-10 w-10 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  selected:
                    "bg-gray-900 text-white hover:bg-gray-900 focus:bg-gray-900 rounded-full",
                  today: "border border-gray-900 text-gray-900",
                  outside: "text-gray-300",
                  hidden: "invisible",
                  disabled:
                    "text-gray-400 bg-gray-100/80 opacity-70 line-through cursor-not-allowed pointer-events-none hover:bg-gray-100",
                  range_start:
                    "bg-gray-900 text-white rounded-full hover:bg-gray-900",
                  range_end:
                    "bg-gray-900 text-white rounded-full hover:bg-gray-900",
                  range_middle: "bg-gray-100 text-gray-900 rounded-none",
                }}
                components={{ DayButton }}
                className="w-full"
              />
            </div>
            <p className="text-xs text-gray-500">
              Haz clic una vez para marcar el <span className="font-medium text-gray-700">Inicio</span> y otra vez para el <span className="font-medium text-gray-700">Fin</span>. Si haces clic en otro día, se reinicia la selección.
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
                  const disabledPorMinBloqueo = !!minHoraInicioPorBloqueo && hora < minHoraInicioPorBloqueo
                  let disabledPorBloqueo = false

                  if (fechaInicio) {
                    const [h, m] = hora.split(":").map(Number)
                    const slot = new Date(fechaInicio)
                    slot.setHours(h, m, 0, 0)
                    disabledPorBloqueo = bloqueos.some((b) => slot >= b.desde && slot < b.hasta)
                  }

                  const disabledOpt = disabledPorBloqueo || disabledPorMinBloqueo
                  return (
                    <option key={hora} value={hora} disabled={disabledOpt}>
                      {hora}{disabledOpt ? ' (no disponible)' : ''}
                    </option>
                  )
                })}
              </select>
              {minHoraInicioPorBloqueo && (
                <p className="mt-1 text-xs text-gray-500">
                  Mínimo por reserva anterior: {minHoraInicioPorBloqueo}
                </p>
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
                disabled={!fechaFin}
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
              {!fechaFin && (
                <p className="mt-1 text-xs text-gray-500">Selecciona una fecha de fin para habilitar la hora.</p>
              )}
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
                    const inicio = format(b.inicioReal, "dd/MM/yyyy HH:mm")
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
