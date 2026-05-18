"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarRange, MessageSquareWarning, NotebookText, Sparkles, User } from "lucide-react"

import { obtenerHistorialReservasPorMatricula, type HistorialReservaVehiculo } from "@/app/actions/reservas-temporales"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface HistorialReservasModalProps {
  isOpen: boolean
  matricula: string | null
  marcaModelo?: string | null
  onClose: () => void
}

function formatFechaRango(inicio: string, fin: string) {
  return `${format(new Date(inicio), "dd/MM/yyyy HH:mm", { locale: es })} - ${format(new Date(fin), "dd/MM/yyyy HH:mm", { locale: es })}`
}

function nombreCompleto(reserva: HistorialReservaVehiculo) {
  return [reserva.empleados?.nombre, reserva.empleados?.apellidos].filter(Boolean).join(" ").trim() || "Sin nombre"
}

function estadoLabel(estado: string) {
  switch (estado) {
    case "completada":
      return "Completada"
    case "cancelada":
      return "Cancelada"
    case "activa":
      return "Activa"
    case "pendiente":
      return "Pendiente"
    case "vencida":
      return "Vencida"
    default:
      return estado
  }
}

function estadoClass(estado: string) {
  switch (estado) {
    case "completada":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "cancelada":
      return "bg-slate-100 text-slate-700 border-slate-200"
    case "activa":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "pendiente":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "vencida":
      return "bg-red-50 text-red-700 border-red-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

export function HistorialReservasModal({
  isOpen,
  matricula,
  marcaModelo,
  onClose,
}: HistorialReservasModalProps) {
  const [reservas, setReservas] = useState<HistorialReservaVehiculo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isOpen || !matricula) {
      return
    }

    let cancelled = false

    const cargarHistorial = async () => {
      setIsLoading(true)
      setError("")

      try {
        const resultado = await obtenerHistorialReservasPorMatricula(matricula)

        if (cancelled) return

        if (!resultado.success) {
          setReservas([])
          setError(resultado.error || "No se pudo cargar el historial")
          return
        }

        setReservas(resultado.reservas || [])
      } catch (err) {
        if (cancelled) return
        console.error("Error cargando historial de reservas:", err)
        setReservas([])
        setError("Error inesperado al cargar el historial")
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void cargarHistorial()

    return () => {
      cancelled = true
    }
  }, [isOpen, matricula])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-0">
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Historial de reservas</DialogTitle>
            <DialogDescription>
              {matricula}
              {marcaModelo ? ` · ${marcaModelo}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-4">
            {isLoading && (
              <div className="py-8 text-center text-sm text-gray-500">Cargando historial...</div>
            )}

            {!isLoading && error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}

            {!isLoading && !error && reservas.length === 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                No hay reservas registradas para este vehículo.
              </div>
            )}

            {!isLoading && !error && reservas.length > 0 && (
              <div className="space-y-4">
                {reservas.map((reserva) => (
                  <article key={reserva.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <User className="h-4 w-4 text-gray-500" />
                          <span>{nombreCompleto(reserva)}</span>
                          {reserva.empleados?.email ? (
                            <span className="text-xs font-normal text-gray-500">({reserva.empleados.email})</span>
                          ) : null}
                        </div>

                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <CalendarRange className="mt-0.5 h-4 w-4 text-gray-500" />
                          <span>{formatFechaRango(reserva.fecha_inicio, reserva.fecha_fin)}</span>
                        </div>

                        {reserva.observaciones ? (
                          <div className="flex items-start gap-2 text-sm text-gray-700">
                            <NotebookText className="mt-0.5 h-4 w-4 text-blue-500" />
                            <span>{reserva.observaciones}</span>
                          </div>
                        ) : null}

                        {reserva.quejas ? (
                          <div className="flex items-start gap-2 text-sm text-red-700">
                            <MessageSquareWarning className="mt-0.5 h-4 w-4 text-red-500" />
                            <span>{reserva.quejas}</span>
                          </div>
                        ) : null}

                        {reserva.limpieza ? (
                          <div className="flex items-start gap-2 text-sm text-amber-700">
                            <Sparkles className="mt-0.5 h-4 w-4 text-amber-500" />
                            <span>Estado de limpieza: {reserva.limpieza}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${estadoClass(reserva.estado)}`}>
                        {estadoLabel(reserva.estado)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
