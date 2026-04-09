import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Calendar, User, Car, Clock, X, AlertTriangle, MapPin, Loader2 } from "lucide-react"
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
import { capturarYAsignarUbicacion } from "@/lib/ubicacion-utils"
import type { ReservaTemporal } from "@/app/actions/reservas-admin"

interface ReservasTemporalesListProps {
  reservas: ReservaTemporal[]
  onCancelarReserva: (reservaId: number) => Promise<void>
  cancelandoReserva: number | null
  onCompletarReserva: (reservaId: number, observacion?: string, queja?: string, estadoLimpieza?: "bien" | "regular" | "mal") => Promise<void>
  completandoReserva: number | null
  isAdmin: boolean
  searchText: string
}

type TipoReservaFiltro = "todas" | "activa" | "pendiente" | "vencida" | "completada" | "cancelada"

const matriculaCollator = new Intl.Collator("es", { numeric: true, sensitivity: "base" })

function normalizarMatricula(matricula: string): string {
  return (matricula || "").trim().toUpperCase()
}

function getEstadoReserva(reserva: ReservaTemporal): { estado: string; color: string; descripcion: string } {
  if (reserva.estado === 'cancelada') {
    return { estado: 'Cancelada', color: 'destructive', descripcion: 'Reserva cancelada' }
  }

  if (reserva.estado === 'completada') {
    return { estado: 'Completada', color: 'secondary', descripcion: 'Reserva completada' }
  }

  if (reserva.estado === "vencida") {
    return { estado: "Vencida", color: "secondary", descripcion: "Reserva terminada" }
  }

  const ahora = new Date()
  const fechaInicio = parseISO(reserva.fecha_inicio)
  const fechaFin = parseISO(reserva.fecha_fin)

  if (isAfter(ahora, fechaFin)) {
    return { estado: 'Vencida', color: 'secondary', descripcion: 'Reserva terminada' }
  }

  if (reserva.estado === "pendiente") {
    return { estado: 'Pendiente', color: 'outline', descripcion: 'Reserva programada' }
  }

  if (isBefore(ahora, fechaInicio)) {
    return { estado: "Activa", color: "default", descripcion: "Acceso habilitado; inicio programado" }
  }

  return { estado: 'Activa', color: 'default', descripcion: 'Reserva en curso' }
}

function getTipoReserva(reserva: ReservaTemporal): Exclude<TipoReservaFiltro, "todas"> {
  if (reserva.estado === 'cancelada') return 'cancelada'
  if (reserva.estado === 'completada') return 'completada'
  if (reserva.estado === "vencida") return "vencida"
  if (reserva.estado === "pendiente") return "pendiente"

  const ahora = new Date()
  const fechaFin = parseISO(reserva.fecha_fin)

  if (isAfter(ahora, fechaFin)) return 'vencida'
  return 'activa'
}

function puedeSerCancelada(reserva: ReservaTemporal, isAdmin: boolean): boolean {
  if (isAdmin) {
    return reserva.estado !== 'cancelada' && reserva.estado !== 'completada'
  }

  if (reserva.estado !== 'activa' && reserva.estado !== 'pendiente') return false

  const ahora = new Date()
  const fechaFin = parseISO(reserva.fecha_fin)

  return isBefore(ahora, fechaFin)
}

function puedeSerCompletada(reserva: ReservaTemporal): boolean {
  if (reserva.estado !== 'activa') return false

  const ahora = new Date()
  const fechaFin = parseISO(reserva.fecha_fin)

  return isAfter(ahora, fechaFin)
}

export default function ReservasTemporalesList({ 
  reservas, 
  onCancelarReserva, 
  cancelandoReserva, 
  onCompletarReserva,
  completandoReserva,
  isAdmin,
  searchText 
}: ReservasTemporalesListProps) {
  const [capturandoUbicacion, setCapturandoUbicacion] = useState<number | null>(null)
  const [anioFiltro, setAnioFiltro] = useState<string>("todos")
  const [tipoFiltro, setTipoFiltro] = useState<TipoReservaFiltro>("todas")
  const [ordenarPorFecha, setOrdenarPorFecha] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [reservaToComplete, setReservaToComplete] = useState<ReservaTemporal | null>(null)
  const [observacionCompletar, setObservacionCompletar] = useState("")
  const [quejaCompletar, setQuejaCompletar] = useState("")
  const [estadoLimpiezaCompletar, setEstadoLimpiezaCompletar] = useState<"" | "bien" | "regular" | "mal">("")

  const handleCapturarUbicacion = async (matricula: string, reservaId: number) => {
    setCapturandoUbicacion(reservaId)
    
    try {
      const resultado = await capturarYAsignarUbicacion(matricula)
      
      if (resultado.success) {
        alert(`📍 Ubicación capturada exitosamente para ${matricula}`)
      } else {
        alert(`❌ Error: ${resultado.mensaje}`)
      }
    } catch (error) {
      console.error('❌ Error capturando ubicación:', error)
      alert('❌ Error inesperado al capturar la ubicación')
    } finally {
      setCapturandoUbicacion(null)
    }
  }

  const handleConfirmarCompletar = (reserva: ReservaTemporal) => {
    setReservaToComplete(reserva)
    setObservacionCompletar("")
    setQuejaCompletar("")
    setEstadoLimpiezaCompletar("")
    setShowCompleteDialog(true)
  }

  const handleCerrarCompletar = () => {
    setShowCompleteDialog(false)
    setReservaToComplete(null)
    setObservacionCompletar("")
    setQuejaCompletar("")
    setEstadoLimpiezaCompletar("")
  }

  const handleCompletarReserva = async () => {
    if (!reservaToComplete) return
    await onCompletarReserva(
      reservaToComplete.id,
      observacionCompletar,
      quejaCompletar,
      estadoLimpiezaCompletar || undefined
    )
    setShowCompleteDialog(false)
    setReservaToComplete(null)
    setObservacionCompletar("")
    setQuejaCompletar("")
    setEstadoLimpiezaCompletar("")
  }
  const aniosDisponibles = Array.from(
    new Set(
      reservas
        .map((reserva) => new Date(reserva.fecha_inicio).getFullYear())
        .filter((anio) => Number.isFinite(anio)),
    ),
  ).sort((a, b) => b - a)

  // Filtrar reservas por texto de búsqueda
  const reservasFiltradasTexto = reservas.filter((reserva) => {
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

  // Filtrar por año
  const reservasFiltradasAnio = reservasFiltradasTexto.filter((reserva) => {
    if (anioFiltro === "todos") return true
    const anioInicio = new Date(reserva.fecha_inicio).getFullYear().toString()
    const anioFin = new Date(reserva.fecha_fin).getFullYear().toString()
    return anioInicio === anioFiltro || anioFin === anioFiltro
  })

  // Filtrar por tipo de reserva
  const reservasFiltradas = reservasFiltradasAnio.filter((reserva) => {
    if (tipoFiltro === "todas") return true
    return getTipoReserva(reserva) === tipoFiltro
  })

  // Agrupar reservas por matrícula
  const reservasAgrupadas = reservasFiltradas.reduce((acc, reserva) => {
    const matricula = normalizarMatricula(reserva.matricula)
    if (!acc[matricula]) {
      acc[matricula] = {
        coche: reserva.coches,
        reservas: []
      }
    }
    acc[matricula].reservas.push(reserva)
    return acc
  }, {} as Record<string, { coche: any, reservas: ReservaTemporal[] }>)

  // Ordenar reservas dentro de cada grupo por fecha, y luego ordenar grupos
  const cochesOrdenados = Object.entries(reservasAgrupadas)
    .map(([matricula, data]) => ({
      matricula,
      coche: data.coche,
      reservas: [...data.reservas].sort((a, b) => 
        new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
      )
    }))
    .sort((a, b) => {
      if (ordenarPorFecha) {
        const fechaA = a.reservas[0] ? new Date(a.reservas[0].fecha_inicio).getTime() : Number.MAX_SAFE_INTEGER
        const fechaB = b.reservas[0] ? new Date(b.reservas[0].fecha_inicio).getTime() : Number.MAX_SAFE_INTEGER
        if (fechaA !== fechaB) return fechaA - fechaB
      }
      return matriculaCollator.compare(a.matricula, b.matricula)
    })

  const reservasOrdenadasPorFecha = [...reservasFiltradas].sort((a, b) => {
    const fechaA = new Date(a.fecha_inicio).getTime()
    const fechaB = new Date(b.fecha_inicio).getTime()
    if (fechaA !== fechaB) return fechaA - fechaB
    return matriculaCollator.compare(normalizarMatricula(a.matricula), normalizarMatricula(b.matricula))
  })

  const renderReservaDetalle = (
    reserva: ReservaTemporal,
    numeroReserva: string,
    matricula: string,
    coche: { marca: string; modelo: string },
  ) => {
    const estadoInfo = getEstadoReserva(reserva)
    const puedeCancelarse = puedeSerCancelada(reserva, isAdmin)
    const puedeCompletar = isAdmin && puedeSerCompletada(reserva)
    const badgeClassName = (estadoInfo.estado === 'Vencida' || estadoInfo.estado === 'Completada')
      ? 'bg-orange-100 text-orange-800 hover:bg-orange-100'
      : undefined

    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            {/* Número de reserva y estado */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">
                Reserva {numeroReserva}
              </span>
              <Badge variant={estadoInfo.color as any} className={badgeClassName}>
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

          {/* Solo botón de cancelar - la ubicación estará dentro del dialog */}
          <div className="flex items-center gap-2 ml-4">
            {/* Botón de completar (solo admin y vencidas) */}
            {puedeCompletar && (
              <Button
                variant="outline"
                size="sm"
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                disabled={completandoReserva === reserva.id || cancelandoReserva === reserva.id}
                onClick={() => handleConfirmarCompletar(reserva)}
              >
                {completandoReserva === reserva.id ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Completando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Marcar completada
                  </div>
                )}
              </Button>
            )}
            {/* Botón de cancelar */}
            {puedeCancelarse && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={cancelandoReserva === reserva.id || capturandoUbicacion === reserva.id}
                  >
                    {cancelandoReserva === reserva.id ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
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
                    <AlertDialogTitle asChild>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Confirmar cancelación
                      </div>
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div>
                        <p>
                          ¿Estás seguro de que deseas cancelar la reserva {numeroReserva} del vehículo{' '}
                          <strong>{matricula}</strong> ({coche.marca} {coche.modelo})?
                        </p>
                        <br />
                        <p>
                          Esta acción no se puede deshacer y el empleado{' '}
                          <strong>{reserva.empleados.nombre} {reserva.empleados.apellidos}</strong>{' '}
                          será notificado de la cancelación.
                        </p>
                        <br />
                        {reserva.tiene_casillero_asociado ? (
                          getTipoReserva(reserva) === "pendiente" ? (
                            <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-4">
                              <p className="text-sm text-blue-900">
                                <strong>Importante:</strong> si esta reserva tenía un código de casillero, al cancelarla ese PIN se anulará.
                                En una futura reserva se generará otro nuevo.
                              </p>
                            </div>
                          ) : (
                            <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-4">
                              <p className="text-sm font-medium text-red-900">
                                Importante: si el conductor ya sacó las llaves del casillero, cancelar ahora le dejará sin acceso.
                              </p>
                              <p className="mt-2 text-sm text-red-800">
                                Al cancelar, el PIN del casillero se elimina en ese mismo momento. Si las llaves no están ya dentro, el
                                conductor no podrá volver a abrir el casillero con ese código.
                              </p>
                            </div>
                          )
                        ) : null}
                        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                          <p className="text-sm text-blue-700 mb-3">
                            💡 <strong>¿Dónde está el vehículo?</strong> Antes de cancelar, puedes registrar automáticamente la ubicación actual del vehículo:
                          </p>

                          {/* Botón de capturar ubicación dentro del dialog */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 w-full"
                            disabled={capturandoUbicacion === reserva.id}
                            onClick={() => {
                              handleCapturarUbicacion(matricula, reserva.id)
                            }}
                          >
                            {capturandoUbicacion === reserva.id ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Obteniendo ubicación GPS...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Registrar ubicación actual del vehículo
                              </div>
                            )}
                          </Button>
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No, mantener reserva</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onCancelarReserva(reserva.id)}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={capturandoUbicacion === reserva.id}
                    >
                      {capturandoUbicacion === reserva.id ? 'Ubicando...' : 'Sí, cancelar reserva'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (reservasFiltradas.length === 0) {
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reservas Temporales ({cochesOrdenados.length} vehículos, {reservasFiltradas.length} reservas)
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Año:</span>
              <select
                value={anioFiltro}
                onChange={(e) => setAnioFiltro(e.target.value)}
                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                aria-label="Filtrar historial por año"
              >
                <option value="todos">Todos</option>
                {aniosDisponibles.map((anio) => (
                  <option key={anio} value={String(anio)}>
                    {anio}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Tipo:</span>
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value as TipoReservaFiltro)}
                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                aria-label="Filtrar historial por tipo de reserva"
              >
                <option value="todas">Todas</option>
                <option value="activa">Activas</option>
                <option value="pendiente">Pendientes</option>
                <option value="vencida">Vencidas</option>
                <option value="completada">Completadas</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ordenarPorFecha}
                onChange={(e) => setOrdenarPorFecha(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Ordenar por fecha
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {ordenarPorFecha ? (
          <div className="grid gap-4">
            {reservasOrdenadasPorFecha.map((reserva, index) => {
              const matricula = normalizarMatricula(reserva.matricula)
              const coche = reserva.coches
              return (
                <Card key={reserva.id} className="p-4 border-2">
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
                        {format(parseISO(reserva.fecha_inicio), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </div>
                    </div>
                  </div>
                  {renderReservaDetalle(reserva, `#${index + 1}`, matricula, coche)}
                </Card>
              )
            })}
          </div>
        ) : (
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
                  {reservasCoche.map((reserva, index) => (
                    <div key={reserva.id}>
                      {renderReservaDetalle(reserva, `#${index + 1}`, matricula, coche)}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
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
                      {reservaToComplete.matricula} - {reservaToComplete.coches.marca} {reservaToComplete.coches.modelo}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Desde:</strong>{' '}
                      {format(parseISO(reservaToComplete.fecha_inicio), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Hasta:</strong>{' '}
                      {format(parseISO(reservaToComplete.fecha_fin), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                  </div>
                )}
                <div>
                  <Label htmlFor="observacion-completar-admin">Observaciones (opcional)</Label>
                  <Textarea
                    id="observacion-completar-admin"
                    value={observacionCompletar}
                    onChange={(e) => setObservacionCompletar(e.target.value)}
                    placeholder="Escribe una observación..."
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="queja-completar-admin">Quejas (opcional)</Label>
                  <Textarea
                    id="queja-completar-admin"
                    value={quejaCompletar}
                    onChange={(e) => setQuejaCompletar(e.target.value)}
                    placeholder="Escribe una queja..."
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="estado-limpieza-admin">Estado de limpieza (opcional)</Label>
                  <select
                    id="estado-limpieza-admin"
                    value={estadoLimpiezaCompletar}
                    onChange={(e) => setEstadoLimpiezaCompletar(e.target.value as any)}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Sin seleccionar</option>
                    <option value="bien">bien</option>
                    <option value="regular">regular</option>
                    <option value="mal">mal</option>
                  </select>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCerrarCompletar}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCompletarReserva}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={completandoReserva !== null}
            >
              {completandoReserva ? 'Guardando...' : 'Marcar completada'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
