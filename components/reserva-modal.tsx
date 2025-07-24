"use client"

import { useState } from "react"
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

interface ReservaModalProps {
  isOpen: boolean
  onClose: () => void
  matricula: string
  marcaModelo: string
  onReservaCreada: (mensaje: string) => void
}

export function ReservaModal({ isOpen, onClose, matricula, marcaModelo, onReservaCreada }: ReservaModalProps) {
  const [fechaInicio, setFechaInicio] = useState<Date>()
  const [fechaFin, setFechaFin] = useState<Date>()
  const [horaInicio, setHoraInicio] = useState("09:00")
  const [horaFin, setHoraFin] = useState("17:00")
  const [observaciones, setObservaciones] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showCalendarInicio, setShowCalendarInicio] = useState(false)
  const [showCalendarFin, setShowCalendarFin] = useState(false)

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
    setFechaInicio(undefined)
    setFechaFin(undefined)
    setHoraInicio("09:00")
    setHoraFin("17:00")
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
                {generarHoras().map((hora) => (
                  <option key={hora} value={hora}>
                    {hora}
                  </option>
                ))}
              </select>
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
                {generarHoras().map((hora) => (
                  <option key={hora} value={hora}>
                    {hora}
                  </option>
                ))}
              </select>
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
