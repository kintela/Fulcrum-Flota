"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Car, X, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { obtenerReservasUsuario, cancelarReserva } from "@/app/actions/reservas-temporales"

interface Reserva {
  id: number
  matricula: string
  fecha_inicio: string
  fecha_fin: string
  observaciones?: string
  estado: 'activa' | 'completada' | 'cancelada'
  created_at: string
  coches: {
    matricula: string
    marca: string
    modelo: string
  }
}

export function MisReservas() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [cancellingId, setCancellingId] = useState<number | null>(null)

  const cargarReservas = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      const resultado = await obtenerReservasUsuario()
      
      if (resultado.success) {
        setReservas(resultado.reservas || [])
      } else {
        setError(resultado.error || "Error al cargar las reservas")
      }
    } catch (error) {
      console.error("Error loading reservations:", error)
      setError("Error inesperado al cargar las reservas")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    cargarReservas()
  }, [])

  const handleCancelarReserva = async (reservaId: number) => {
    setCancellingId(reservaId)
    
    try {
      const resultado = await cancelarReserva(reservaId)
      
      if (resultado.success) {
        // Actualizar la lista de reservas
        await cargarReservas()
      } else {
        setError(resultado.error || "Error al cancelar la reserva")
      }
    } catch (error) {
      console.error("Error cancelling reservation:", error)
      setError("Error inesperado al cancelar la reserva")
    } finally {
      setCancellingId(null)
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'activa':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Activa</Badge>
      case 'completada':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Completada</Badge>
      case 'cancelada':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelada</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  const isReservaActiva = (reserva: Reserva) => {
    return reserva.estado === 'activa' && new Date(reserva.fecha_inicio) > new Date()
  }

  const reservasActivas = reservas.filter(r => r.estado === 'activa')
  const reservasHistoricas = reservas.filter(r => r.estado !== 'activa')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Mis Reservas
          </CardTitle>
          <Button
            onClick={cargarReservas}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Reservas Activas */}
            {reservasActivas.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Reservas Activas ({reservasActivas.length})
                </h3>
                
                <div className="space-y-3">
                  {reservasActivas.map((reserva) => (
                    <div
                      key={reserva.id}
                      className="border rounded-lg p-4 bg-green-50 border-green-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Car className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {reserva.coches.matricula}
                            </p>
                            <p className="text-sm text-gray-600">
                              {reserva.coches.marca} {reserva.coches.modelo}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getEstadoBadge(reserva.estado)}
                          
                          {isReservaActiva(reserva) && (
                            <Button
                              onClick={() => handleCancelarReserva(reserva.id)}
                              disabled={cancellingId === reserva.id}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              {cancellingId === reserva.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>
                            <strong>Inicio:</strong>{" "}
                            {format(new Date(reserva.fecha_inicio), "PPP 'a las' HH:mm", { locale: es })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>
                            <strong>Fin:</strong>{" "}
                            {format(new Date(reserva.fecha_fin), "PPP 'a las' HH:mm", { locale: es })}
                          </span>
                        </div>
                      </div>
                      
                      {reserva.observaciones && (
                        <div className="mt-3 p-2 bg-white rounded border">
                          <p className="text-sm text-gray-700">
                            <strong>Observaciones:</strong> {reserva.observaciones}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historial de Reservas */}
            {reservasHistoricas.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  Historial ({reservasHistoricas.length})
                </h3>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {reservasHistoricas.map((reserva) => (
                    <div
                      key={reserva.id}
                      className="border rounded-lg p-3 bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {reserva.coches.matricula}
                          </span>
                          <span className="text-sm text-gray-600">
                            {reserva.coches.marca} {reserva.coches.modelo}
                          </span>
                        </div>
                        {getEstadoBadge(reserva.estado)}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        {format(new Date(reserva.fecha_inicio), "PPP", { locale: es })} -{" "}
                        {format(new Date(reserva.fecha_fin), "PPP", { locale: es })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estado vacío */}
            {reservas.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No tienes reservas</p>
                <p className="text-sm text-gray-400">
                  Selecciona un vehículo en el mapa y haz clic en "Reserva Temporal" para crear una nueva reserva.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
