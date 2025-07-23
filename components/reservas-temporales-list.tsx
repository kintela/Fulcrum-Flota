import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, Car, Clock, X, AlertTriangle } from "lucide-react"
import { format, isAfter, isBefore, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { ReservaTemporal } from "@/app/actions/reservas-admin"

interface ReservasTemporalesListProps {
  reservas: ReservaTemporal[]
  onCancelarReserva: (reservaId: number) => Promise<void>
  cancelandoReserva: number | null
  searchText: string
}

function getEstadoReserva(reserva: ReservaTemporal): { estado: string; color: string; descripcion: string } {
  if (reserva.estado === 'cancelada') {
    return { estado: 'Cancelada', color: 'destructive', descripcion: 'Reserva cancelada' }
  }

  const ahora = new Date()
  const fechaInicio = parseISO(reserva.fecha_inicio)
  const fechaFin = parseISO(reserva.fecha_fin)

  if (isAfter(ahora, fechaFin)) {
    return { estado: 'Vencida', color: 'secondary', descripcion: 'Reserva terminada' }
  }

  if (isBefore(ahora, fechaInicio)) {
    return { estado: 'Pendiente', color: 'outline', descripcion: 'Reserva programada' }
  }

  return { estado: 'Activa', color: 'default', descripcion: 'Reserva en curso' }
}

function puedeSerCancelada(reserva: ReservaTemporal): boolean {
  if (reserva.estado !== 'activa') return false
  
  const ahora = new Date()
  const fechaFin = parseISO(reserva.fecha_fin)
  
  return isBefore(ahora, fechaFin)
}

export default function ReservasTemporalesList({ 
  reservas, 
  onCancelarReserva, 
  cancelandoReserva, 
  searchText 
}: ReservasTemporalesListProps) {
  // Filtrar reservas por texto de búsqueda
  const reservasFiltradas = reservas.filter((reserva) => {
    if (!searchText.trim()) return true

    const searchLower = searchText.toLowerCase().trim()
    
    // Buscar en matrícula
    if (reserva.matricula.toLowerCase().includes(searchLower)) return true
    
    // Buscar en marca y modelo
    if (reserva.coches.marca.toLowerCase().includes(searchLower) || 
        reserva.coches.modelo.toLowerCase().includes(searchLower)) return true
    
    // Buscar en nombre del empleado
    const nombreCompleto = `${reserva.empleados.nombre} ${reserva.empleados.apellidos}`.toLowerCase()
    if (nombreCompleto.includes(searchLower)) return true
    
    // Buscar en email del empleado
    if (reserva.empleados.email.toLowerCase().includes(searchLower)) return true
    
    // Buscar en observaciones
    if (reserva.observaciones && reserva.observaciones.toLowerCase().includes(searchLower)) return true
    
    return false
  })

  // Agrupar reservas por matrícula
  const reservasAgrupadas = reservasFiltradas.reduce((acc, reserva) => {
    const matricula = reserva.matricula
    if (!acc[matricula]) {
      acc[matricula] = {
        coche: reserva.coches,
        reservas: []
      }
    }
    acc[matricula].reservas.push(reserva)
    return acc
  }, {} as Record<string, { coche: any, reservas: ReservaTemporal[] }>)

  // Ordenar por matrícula y ordenar reservas dentro de cada grupo por fecha
  const cochesOrdenados = Object.entries(reservasAgrupadas)
    .sort(([matriculaA], [matriculaB]) => matriculaA.localeCompare(matriculaB))
    .map(([matricula, data]) => ({
      matricula,
      coche: data.coche,
      reservas: data.reservas.sort((a, b) => 
        new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
      )
    }))

  if (cochesOrdenados.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reservas Temporales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {searchText.trim() ? 'No se encontraron reservas temporales que coincidan con la búsqueda' : 'No hay reservas temporales registradas'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Reservas Temporales ({cochesOrdenados.length} vehículos, {reservasFiltradas.length} reservas)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {cochesOrdenados.map(({ matricula, coche, reservas: reservasCoche }) => (
            <Card key={matricula} className="p-4 border-2">
              {/* Encabezado del vehículo */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                <Car className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-xl">{matricula}</h3>
                  <p className="text-muted-foreground">
                    {coche.marca} {coche.modelo}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-600">
                    {reservasCoche.length} reserva{reservasCoche.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Lista de reservas para este vehículo */}
              <div className="space-y-4">
                {reservasCoche.map((reserva, index) => {
                  const estadoInfo = getEstadoReserva(reserva)
                  const puedeCancelarse = puedeSerCancelada(reserva)
                  
                  return (
                    <div key={reserva.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          {/* Número de reserva y estado */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-600">
                              Reserva #{index + 1}
                            </span>
                            <Badge variant={estadoInfo.color as any}>
                              {estadoInfo.estado}
                            </Badge>
                          </div>

                          {/* Información del empleado */}
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-green-600" />
                            <div>
                              <span className="font-medium">
                                {reserva.empleados.nombre} {reserva.empleados.apellidos}
                              </span>
                              <span className="text-muted-foreground ml-2 text-sm">
                                ({reserva.empleados.email})
                              </span>
                            </div>
                          </div>

                          {/* Fechas de la reserva */}
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-purple-600" />
                            <div className="text-sm">
                              <div>
                                <span className="font-medium">Desde:</span>{' '}
                                {format(parseISO(reserva.fecha_inicio), 'dd/MM/yyyy HH:mm', { locale: es })}
                              </div>
                              <div>
                                <span className="font-medium">Hasta:</span>{' '}
                                {format(parseISO(reserva.fecha_fin), 'dd/MM/yyyy HH:mm', { locale: es })}
                              </div>
                            </div>
                          </div>

                          {/* Observaciones */}
                          {reserva.observaciones && (
                            <div className="bg-white p-3 rounded-md border">
                              <p className="text-sm font-medium text-gray-700">Observaciones:</p>
                              <p className="text-sm text-gray-600 mt-1">{reserva.observaciones}</p>
                            </div>
                          )}
                        </div>

                        {/* Botón de cancelar */}
                        {puedeCancelarse && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-4"
                                disabled={cancelandoReserva === reserva.id}
                              >
                                {cancelandoReserva === reserva.id ? (
                                  <div className="flex items-center gap-2">
                                    <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                                    Cancelando...
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <X className="h-4 w-4" />
                                    Cancelar
                                  </div>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                                  Confirmar cancelación
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas cancelar la reserva #{index + 1} del vehículo{' '}
                                  <strong>{matricula}</strong> ({coche.marca} {coche.modelo})?
                                  <br />
                                  <br />
                                  Esta acción no se puede deshacer y el empleado{' '}
                                  <strong>{reserva.empleados.nombre} {reserva.empleados.apellidos}</strong>{' '}
                                  será notificado de la cancelación.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>No, mantener reserva</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onCancelarReserva(reserva.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Sí, cancelar reserva
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
