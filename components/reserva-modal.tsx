"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, X } from "lucide-react"
import { format, addHours, isBefore, isAfter } from "date-fns"
import { es } from "date-fns/locale"
import { DayPicker } from "react-day-picker"
import { crearReservaTemporal, verificarDisponibilidad } from "@/app/actions/reservas-temporales"
import { supabase } from "@/lib/supabase"

interface ReservaModalProps {
  isOpen: boolean
  onClose: () => void
  matricula: string
  marcaModelo: string
  onReservaCreada: (mensaje: string) => void
}

export function ReservaModal({ isOpen, onClose, matricula, marcaModelo, onReservaCreada }: ReservaModalProps) {
  const ahora = new Date()
  const cuatroHorasDespues = new Date(ahora.getTime() + 4 * 60 * 60 * 1000)

  const [fechaInicio, setFechaInicio] = useState<Date>(ahora)
  const [fechaFin, setFechaFin] = useState<Date>(cuatroHorasDespues)
  const [horaInicio, setHoraInicio] = useState(
    `${ahora.getHours().toString().padStart(2, "0")}:${ahora.getMinutes().toString().padStart(2, "0")}`
  )
  const [horaFin, setHoraFin] = useState(
    `${cuatroHorasDespues.getHours().toString().padStart(2, "0")}:${cuatroHorasDespues.getMinutes().toString().padStart(2, "0")}`
  )
  const [observaciones, setObservaciones] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showCalendarInicio, setShowCalendarInicio] = useState(false)
  const [showCalendarFin, setShowCalendarFin] = useState(false)
  const [bloqueos, setBloqueos] = useState<Array<{ desde: Date; hasta: Date }>>([])

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

  // Si la hora seleccionada queda por debajo tras cambiar fecha -> ajustar
  useEffect(() => {
    if (minHoraInicioHoy && horaInicio < minHoraInicioHoy) {
      setHoraInicio(minHoraInicioHoy)
    }
  }, [minHoraInicioHoy, horaInicio])

  // Ajustar hora/fecha fin a inicio + 4h cuando cambie la hora de inicio
  useEffect(() => {
    if (!fechaInicio) return
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

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Validaciones básicas
      if (!fechaInicio || !fechaFin) {
        setError("Debe seleccionar fecha de inicio y fin")
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
    const plus4 = new Date(now.getTime() + 4 * 60 * 60 * 1000)
    setFechaInicio(now)
    setFechaFin(plus4)
    setHoraInicio(`${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`)
    setHoraFin(`${plus4.getHours().toString().padStart(2, "0")}:${plus4.getMinutes().toString().padStart(2, "0")}`)
    setObservaciones("")
    setError("")
    setShowCalendarInicio(false)
    setShowCalendarFin(false)
    onClose()
  }

  const handleFechaInicioSelect = (date: Date | undefined) => {
    setFechaInicio(date)
    setShowCalendarInicio(false)
    
    // Si se selecciona fecha de inicio y no hay fecha de fin, sugerir el mismo día
    if (date && !fechaFin) {
      setFechaFin(date)
    }
  }

  const handleFechaFinSelect = (date: Date | undefined) => {
    setFechaFin(date)
    setShowCalendarFin(false)
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Reservar Vehículo
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {matricula} - {marcaModelo}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fecha de Inicio */}
          <div className="space-y-2">
            <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal"
                onClick={() => setShowCalendarInicio(!showCalendarInicio)}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {fechaInicio ? format(fechaInicio, "PPP", { locale: es }) : "Seleccionar fecha"}
              </Button>
              
              {showCalendarInicio && (
                <div className="absolute top-full mt-1 z-50 bg-white border rounded-md shadow-lg p-3">
                  <DayPicker
                    mode="single"
                    selected={fechaInicio}
                    onSelect={handleFechaInicioSelect}
                    disabled={{ before: today }}
                    locale={es}
                    classNames={{
                      day_selected: "bg-blue-600 text-white",
                      day_today: "bg-blue-100 text-blue-600 font-semibold"
                    }}
                  />
                </div>
              )}
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

          {/* Fecha de Fin */}
          <div className="space-y-2">
            <Label htmlFor="fechaFin">Fecha de Fin</Label>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal"
                onClick={() => setShowCalendarFin(!showCalendarFin)}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {fechaFin ? format(fechaFin, "PPP", { locale: es }) : "Seleccionar fecha"}
              </Button>
              
              {showCalendarFin && (
                <div className="absolute top-full mt-1 z-50 bg-white border rounded-md shadow-lg p-3">
                  <DayPicker
                    mode="single"
                    selected={fechaFin}
                    onSelect={handleFechaFinSelect}
                    disabled={{ before: fechaInicio || today }}
                    locale={es}
                    classNames={{
                      day_selected: "bg-blue-600 text-white",
                      day_today: "bg-blue-100 text-blue-600 font-semibold"
                    }}
                  />
                </div>
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
