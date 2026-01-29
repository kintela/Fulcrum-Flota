"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar, Clock, Car, X, RefreshCw, AlertTriangle, MapPin, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { obtenerReservasUsuario, cancelarReserva, completarReserva } from "@/app/actions/reservas-temporales"
import { ubicarCocheEnSede } from "@/app/actions/ubicacion"
import { capturarYAsignarUbicacion } from "@/lib/ubicacion-utils"

interface Reserva {
  id: number
  matricula: string
  fecha_inicio: string
  fecha_fin: string
  observaciones?: string
  quejas?: string
  estado: 'activa' | 'pendiente' | 'completada' | 'cancelada'
  created_at: string
  coches: {
    matricula: string
    marca: string
    modelo: string
    latitud?: number | null
    longitud?: number | null
    direccion_actual?: string | null
  }
}

export function MisReservas({ 
  onCocheEnCancelacion,
  onReservasChange,
  refreshToken,
  onUbicacionInicial
}: { 
  onCocheEnCancelacion?: (matricula: string | null) => void
  onReservasChange?: (reservas: Array<{ matricula: string; id: number; estado: string }>) => void
  refreshToken?: number
  onUbicacionInicial?: (matricula: string, ubicacion: { latitud: number; longitud: number; direccion_actual?: string }) => void
}) {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [reservaToCancel, setReservaToCancel] = useState<Reserva | null>(null)
  const [capturandoUbicacion, setCapturandoUbicacion] = useState<number | null>(null)
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [ubicandoId, setUbicandoId] = useState<number | null>(null)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [reservaToComplete, setReservaToComplete] = useState<Reserva | null>(null)
  const [observacionCompletar, setObservacionCompletar] = useState("")
  const [quejaCompletar, setQuejaCompletar] = useState("")
  const hasMountedRef = useRef(false)

  const formatObservaciones = (texto?: string | null) => {
    if (!texto) return ""
    return texto
      .split("\n")
      .map((linea) => linea.replace(/^\[[^\]]+\]\s*/, ""))
      .join("\n")
  }

  const cargarReservas = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      const resultado = await obtenerReservasUsuario()
      
      if (resultado.success) {
        const reservasData = resultado.reservas || []
        setReservas(reservasData)
        
        // Notificar al dashboard sobre las reservas del usuario
        const reservasParaMapa = reservasData.map(reserva => ({
          matricula: reserva.coches.matricula,
          id: reserva.id,
          estado: reserva.estado
        }))
        onReservasChange?.(reservasParaMapa)
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

  useEffect(() => {
    if (refreshToken === undefined) return
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }
    cargarReservas()
  }, [refreshToken])

  const handleCancelarReserva = async (reservaId: number) => {
    setCancellingId(reservaId)
    
    try {
      const resultado = await cancelarReserva(reservaId)
      
      if (resultado.success) {
        // Actualizar la lista de reservas
        await cargarReservas()
        setShowCancelDialog(false)
        setReservaToCancel(null)
        // Limpiar el coche en cancelación
        onCocheEnCancelacion?.(null)
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

  const handleConfirmarCancelacion = (reserva: Reserva) => {
    setReservaToCancel(reserva)
    setShowCancelDialog(true)
    // Notificar al dashboard qué coche está en cancelación
    onCocheEnCancelacion?.(reserva.coches.matricula)
  }

  const handleCerrarDialog = () => {
    setShowCancelDialog(false)
    setReservaToCancel(null)
    // Limpiar el coche en cancelación
    onCocheEnCancelacion?.(null)
  }

  const handleConfirmarCompletar = (reserva: Reserva) => {
    setReservaToComplete(reserva)
    setObservacionCompletar("")
    setQuejaCompletar("")
    setShowCompleteDialog(true)
  }

  const handleCerrarCompletar = () => {
    setShowCompleteDialog(false)
    setReservaToComplete(null)
    setObservacionCompletar("")
    setQuejaCompletar("")
  }

  const handleCompletarReserva = async () => {
    if (!reservaToComplete) return
    setCompletingId(reservaToComplete.id)
    const resp = await completarReserva(reservaToComplete.id, observacionCompletar, quejaCompletar)
    if (!resp.success) {
      alert(resp.error)
    } else {
      await cargarReservas()
      setShowCompleteDialog(false)
      setReservaToComplete(null)
      setObservacionCompletar("")
      setQuejaCompletar("")
    }
    setCompletingId(null)
  }

  const handleCapturarUbicacion = async (matricula: string, reservaId: number) => {
    console.log('🔧 [MisReservas] Capturando ubicación para:', matricula, reservaId)
    setCapturandoUbicacion(reservaId)
    
    try {
      const resultado = await capturarYAsignarUbicacion(matricula)
      console.log('📍 [MisReservas] Resultado captura ubicación:', resultado)
      
      if (resultado.success) {
        alert(`📍 Ubicación capturada exitosamente para ${matricula}`)
      } else {
        alert(`❌ Error: ${resultado.mensaje}`)
      }
    } catch (error) {
      console.error('❌ [MisReservas] Error capturando ubicación:', error)
      alert('❌ Error inesperado al capturar la ubicación')
    } finally {
      setCapturandoUbicacion(null)
    }
  }

  const getEstadoBadge = (reserva: Reserva) => {
    const estadoReserva = getEstadoReserva(reserva)
    
    switch (estadoReserva) {
      case 'pendiente':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Pendiente</Badge>
      case 'en_curso':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">En Curso</Badge>
      case 'vencida':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Vencida</Badge>
      case 'completada':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Completada</Badge>
      case 'cancelada':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelada</Badge>
      default:
        return <Badge variant="secondary">{estadoReserva}</Badge>
    }
  }

  const isReservaActiva = (reserva: Reserva) => {
    // Una reserva se puede cancelar si:
    // 1. Está en estado 'pendiente' (programada futura)
    // 2. Está en estado 'activa' y no ha terminado aún (fecha_fin > ahora)
    return reserva.estado === 'pendiente' ||
      (reserva.estado === 'activa' && new Date(reserva.fecha_fin) > new Date())
  }

  const handleUbicarEnSede = async (reserva: Reserva) => {
    setUbicandoId(reserva.id)
    setError("")
    try {
      const resultado = await ubicarCocheEnSede(reserva.coches.matricula)
      if (resultado.success) {
        await cargarReservas()
        if (resultado.ubicacion) {
          onUbicacionInicial?.(reserva.coches.matricula, resultado.ubicacion)
        }
      } else {
        setError(resultado.error || "Error al ubicar el vehículo en sede")
      }
    } catch (error) {
      console.error("Error ubicando vehículo:", error)
      setError("Error inesperado al ubicar el vehículo")
    } finally {
      setUbicandoId(null)
    }
  }

  const getEstadoReserva = (reserva: Reserva) => {
    const ahora = new Date()
    const inicio = new Date(reserva.fecha_inicio)
    const fin = new Date(reserva.fecha_fin)

    if (reserva.estado !== 'activa') {
      return reserva.estado // cancelada, completada, etc.
    }

    if (ahora < inicio) {
      return 'pendiente' // Aún no ha comenzado
    } else if (ahora >= inicio && ahora <= fin) {
      return 'en_curso' // Está en curso ahora
    } else {
      return 'vencida' // Ya terminó pero sigue marcada como activa
    }
  }

  const reservasActivas = reservas.filter(r => r.estado === 'activa' || r.estado === 'pendiente')
  const reservasHistoricas = reservas.filter(r => r.estado !== 'activa' && r.estado !== 'pendiente')

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
                          {getEstadoBadge(reserva)}
                          
                          {isReservaActiva(reserva) && (
                            <Button
                              onClick={() => handleConfirmarCancelacion(reserva)}
                              disabled={cancellingId === reserva.id}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              title="Cancelar reserva"
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
                      {(() => {
                        const sinUbicacion = !reserva.coches.latitud || !reserva.coches.longitud
                        return (
                          <>
                            {getEstadoReserva(reserva) === 'vencida' && (
                              <div className="mt-3 flex flex-wrap gap-2 items-center">
                                <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                                  Vencida pero no marcada como completada {sinUbicacion ? 'y el coche no está ubicado' : 'y el coche está ubicado'}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={completingId === reserva.id || sinUbicacion}
                                  onClick={() => {
                                    if (sinUbicacion) return
                                    handleConfirmarCompletar(reserva)
                                  }}
                                  className={`text-xs h-6 px-2 border-orange-300 hover:bg-orange-100 ${sinUbicacion ? 'opacity-60 cursor-not-allowed' : ''}`}
                                  title={sinUbicacion ? 'Debes ubicar el coche antes de completar la reserva' : undefined}
                                >
                                  {completingId === reserva.id ? 'Guardando...' : 'Marcar completada'}
                                </Button>
                                {sinUbicacion && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={ubicandoId === reserva.id}
                                    onClick={() => handleUbicarEnSede(reserva)}
                                    className="text-xs h-6 px-2 border-orange-300 hover:bg-orange-100"
                                  >
                                    {ubicandoId === reserva.id ? 'Ubicando...' : 'Ubicar en sede'}
                                  </Button>
                                )}
                                {sinUbicacion && (
                                  <span className="text-xs text-orange-700">
                                    Hasta que no lo ubiques no puedes completar tu reserva.
                                  </span>
                                )}
                              </div>
                            )}
                            {getEstadoReserva(reserva) !== 'vencida' && sinUbicacion && (
                              <div className="mt-3 flex flex-wrap gap-2 items-center">
                                <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                                  Sin ubicación registrada
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={ubicandoId === reserva.id}
                                  onClick={() => handleUbicarEnSede(reserva)}
                                  className="text-xs h-6 px-2 border-orange-300 hover:bg-orange-100"
                                >
                                  {ubicandoId === reserva.id ? 'Ubicando...' : 'Ubicar en sede'}
                                </Button>
                              </div>
                            )}
                          </>
                        )
                      })()}
                      
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
                        {getEstadoBadge(reserva)}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        {(() => {
                          const inicio = new Date(reserva.fecha_inicio)
                          const fin = new Date(reserva.fecha_fin)
                          return `${format(inicio, 'dd/MM/yyyy HH:mm')} a ${format(fin, 'dd/MM/yyyy HH:mm')}`
                        })()}
                      </div>

                      {reserva.observaciones && (
                        <div className="mt-2 text-xs text-gray-600 whitespace-pre-line">
                          <span className="font-medium text-gray-700">Observaciones:</span>{" "}
                          {formatObservaciones(reserva.observaciones)}
                        </div>
                      )}
                      {reserva.quejas && (
                        <div className="mt-2 text-xs text-gray-600 whitespace-pre-line">
                          <span className="font-medium text-gray-700">Quejas:</span>{" "}
                          {formatObservaciones(reserva.quejas)}
                        </div>
                      )}
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

        {/* Diálogo de confirmación para cancelar reserva */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle asChild>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Confirmar cancelación
                </div>
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>¿Estás seguro de que quieres cancelar esta reserva?</p>
                  {reservaToCancel && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md border">
                      <p className="font-semibold text-gray-900">
                        {reservaToCancel.coches.matricula} - {reservaToCancel.coches.marca} {reservaToCancel.coches.modelo}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Desde:</strong> {format(new Date(reservaToCancel.fecha_inicio), "PPP 'a las' HH:mm", { locale: es })}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Hasta:</strong> {format(new Date(reservaToCancel.fecha_fin), "PPP 'a las' HH:mm", { locale: es })}
                      </p>
                      {reservaToCancel.observaciones && (
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Observaciones:</strong> {reservaToCancel.observaciones}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Sección de capturar ubicación */}
                  {reservaToCancel && (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                      <p className="text-sm text-blue-700 mb-3">
                        💡 <strong>¿Dónde está el vehículo?</strong> Antes de cancelar, puedes registrar automáticamente la ubicación actual del vehículo:
                      </p>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 w-full"
                        disabled={capturandoUbicacion === reservaToCancel.id}
                        onClick={() => {
                          console.log('� [MisReservas] Capturando ubicación - Matrícula:', reservaToCancel.coches.matricula, 'Reserva ID:', reservaToCancel.id)
                          handleCapturarUbicacion(reservaToCancel.coches.matricula, reservaToCancel.id)
                        }}
                      >
                        {capturandoUbicacion === reservaToCancel.id ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Obteniendo ubicación GPS...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            � Registrar ubicación actual del vehículo
                          </div>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  <p className="text-sm text-red-600 font-medium">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCerrarDialog}>
                No, mantener reserva
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => reservaToCancel && handleCancelarReserva(reservaToCancel.id)}
                className="bg-red-600 hover:bg-red-700"
                disabled={cancellingId !== null}
              >
                {cancellingId === reservaToCancel?.id ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  'Sí, cancelar reserva'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo de completar reserva con observaciones */}
        <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle asChild>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Marcar reserva como completada
                </div>
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>¿Quieres añadir una observación para esta reserva?</p>
                  {reservaToComplete && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                      <p className="font-semibold text-gray-900">
                        {reservaToComplete.coches.matricula} - {reservaToComplete.coches.marca} {reservaToComplete.coches.modelo}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Desde:</strong> {format(new Date(reservaToComplete.fecha_inicio), "PPP 'a las' HH:mm", { locale: es })}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Hasta:</strong> {format(new Date(reservaToComplete.fecha_fin), "PPP 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="observacion-completar">Observaciones (opcional)</Label>
                    <Textarea
                      id="observacion-completar"
                      value={observacionCompletar}
                      onChange={(e) => setObservacionCompletar(e.target.value)}
                      placeholder="Escribe una observación..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="queja-completar">Quejas (opcional)</Label>
                    <Textarea
                      id="queja-completar"
                      value={quejaCompletar}
                      onChange={(e) => setQuejaCompletar(e.target.value)}
                      placeholder="Escribe una queja..."
                      className="mt-2"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCerrarCompletar}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCompletarReserva}
                className="bg-orange-600 hover:bg-orange-700"
                disabled={completingId !== null}
              >
                {completingId ? 'Guardando...' : 'Marcar completada'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
