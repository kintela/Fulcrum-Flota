"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Calendar, Clock, Car, RefreshCw, AlertTriangle, MapPin, Loader2, CreditCard, Truck } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { obtenerReservasUsuario, cancelarReserva, completarReserva, ampliarReservaTemporal } from "@/app/actions/reservas-temporales"
import { ubicarCocheEnSede } from "@/app/actions/ubicacion"
import { capturarYAsignarUbicacion } from "@/lib/ubicacion-utils"
import { obtenerFotosCoche } from "@/lib/storage"
import { CarThumbnail } from "@/components/car-thumbnail"
import { obtenerFichaCoche, type CocheFicha } from "@/app/actions/coches"
import { DayPicker } from "react-day-picker"

interface Reserva {
  id: number
  matricula: string
  fecha_inicio: string
  fecha_fin: string
  observaciones?: string
  quejas?: string
  limpieza?: "bien" | "regular" | "mal" | null
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

function getITVStatus(date: string): { isUrgent: boolean; isOverdue: boolean; daysRemaining: number } {
  const targetDate = new Date(date)
  const today = new Date()
  const diffTime = targetDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return {
    isUrgent: diffDays <= 30 && diffDays >= 0,
    isOverdue: diffDays < 0,
    daysRemaining: diffDays,
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
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
  const [observacionCancelar, setObservacionCancelar] = useState("")
  const [quejaCancelar, setQuejaCancelar] = useState("")
  const [estadoLimpiezaCancelar, setEstadoLimpiezaCancelar] = useState<"" | "bien" | "regular" | "mal">("")
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [ubicandoId, setUbicandoId] = useState<number | null>(null)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [reservaToComplete, setReservaToComplete] = useState<Reserva | null>(null)
  const [observacionCompletar, setObservacionCompletar] = useState("")
  const [quejaCompletar, setQuejaCompletar] = useState("")
  const [estadoLimpiezaCompletar, setEstadoLimpiezaCompletar] = useState<"" | "bien" | "regular" | "mal">("")
  const [extendingId, setExtendingId] = useState<number | null>(null)
  const [showExtendDialog, setShowExtendDialog] = useState(false)
  const [reservaToExtend, setReservaToExtend] = useState<Reserva | null>(null)
  const [extendFechaInicio, setExtendFechaInicio] = useState<Date | null>(null)
  const [extendHoraInicio, setExtendHoraInicio] = useState("")
  const [extendFechaFin, setExtendFechaFin] = useState<Date | null>(null)
  const [extendHoraFin, setExtendHoraFin] = useState("")
  const [showExtendInicioCalendar, setShowExtendInicioCalendar] = useState(false)
  const [showExtendFinCalendar, setShowExtendFinCalendar] = useState(false)
  const [extendError, setExtendError] = useState("")
  const [fotosCache, setFotosCache] = useState<{ [matricula: string]: string | null }>({})
  const [historialSeleccionado, setHistorialSeleccionado] = useState<Reserva | null>(null)
  const [fichaCocheCache, setFichaCocheCache] = useState<Record<string, CocheFicha | null>>({})
  const [fichaCocheLoading, setFichaCocheLoading] = useState<string | null>(null)
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

  useEffect(() => {
    async function cargarFotos() {
      const nuevasFotos: { [matricula: string]: string | null } = {}
      for (const reserva of reservas) {
        const matricula = reserva.coches?.matricula
        if (!matricula) continue
        if (fotosCache[matricula] !== undefined) continue
        try {
          const fotosResult = await obtenerFotosCoche(matricula)
          nuevasFotos[matricula] =
            fotosResult.success && fotosResult.fotos && fotosResult.fotos.length > 0
              ? fotosResult.fotos[0]
              : null
        } catch {
          nuevasFotos[matricula] = null
        }
      }

      if (Object.keys(nuevasFotos).length > 0) {
        setFotosCache((prev) => ({ ...prev, ...nuevasFotos }))
      }
    }

    if (reservas.length > 0) {
      cargarFotos()
    }
  }, [reservas])

  useEffect(() => {
    if (!historialSeleccionado) return
    const matricula = historialSeleccionado.coches.matricula
    if (fichaCocheCache[matricula] !== undefined) return

    let isActive = true
    setFichaCocheLoading(matricula)

    obtenerFichaCoche(matricula)
      .then((resultado) => {
        if (!isActive) return
        setFichaCocheCache((prev) => ({
          ...prev,
          [matricula]: resultado.success ? resultado.ficha : null,
        }))
      })
      .finally(() => {
        if (!isActive) return
        setFichaCocheLoading((current) => (current === matricula ? null : current))
      })

    return () => {
      isActive = false
    }
  }, [historialSeleccionado, fichaCocheCache])

  const handleCancelarReserva = async (
    reservaId: number,
    observacion?: string,
    queja?: string,
    estadoLimpieza?: "bien" | "regular" | "mal"
  ) => {
    setCancellingId(reservaId)
    
    try {
      const resultado = await cancelarReserva(reservaId, observacion, queja, estadoLimpieza)
      
      if (resultado.success) {
        // Actualizar la lista de reservas
        await cargarReservas()
        setShowCancelDialog(false)
        setReservaToCancel(null)
        setObservacionCancelar("")
        setQuejaCancelar("")
        setEstadoLimpiezaCancelar("")
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
    setObservacionCancelar("")
    setQuejaCancelar("")
    setEstadoLimpiezaCancelar("")
    setShowCancelDialog(true)
    // Notificar al dashboard qué coche está en cancelación
    onCocheEnCancelacion?.(reserva.coches.matricula)
  }

  const handleCerrarDialog = () => {
    setShowCancelDialog(false)
    setReservaToCancel(null)
    setObservacionCancelar("")
    setQuejaCancelar("")
    setEstadoLimpiezaCancelar("")
    // Limpiar el coche en cancelación
    onCocheEnCancelacion?.(null)
  }

  const handleConfirmarCompletar = (reserva: Reserva) => {
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
    setCompletingId(reservaToComplete.id)
    const resp = await completarReserva(
      reservaToComplete.id,
      observacionCompletar,
      quejaCompletar,
      estadoLimpiezaCompletar || undefined
    )
    if (!resp.success) {
      alert(resp.error)
    } else {
      await cargarReservas()
      setShowCompleteDialog(false)
      setReservaToComplete(null)
      setObservacionCompletar("")
      setQuejaCompletar("")
      setEstadoLimpiezaCompletar("")
    }
    setCompletingId(null)
  }

  const generarHoras = () => {
    const horas = []
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 60; j += 30) {
        const hora = `${i.toString().padStart(2, "0")}:${j.toString().padStart(2, "0")}`
        horas.push(hora)
      }
    }
    return horas
  }

  const formatHora = (date: Date) =>
    `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`

  const construirFechaHora = (fecha: Date, hora: string) => {
    const [h, m] = hora.split(":").map(Number)
    const valor = new Date(fecha)
    valor.setHours(h, m, 0, 0)
    return valor
  }

  const minHoraFinExtend = useMemo(() => {
    if (!extendFechaInicio || !extendHoraInicio || !extendFechaFin) return null
    const inicioSeleccionado = construirFechaHora(extendFechaInicio, extendHoraInicio)
    if (extendFechaFin.toDateString() !== inicioSeleccionado.toDateString()) return null
    const minimo = new Date(inicioSeleccionado.getTime() + 30 * 60 * 1000)
    if (minimo.toDateString() !== inicioSeleccionado.toDateString()) return "24:00"
    return formatHora(minimo)
  }, [extendFechaInicio, extendHoraInicio, extendFechaFin])

  useEffect(() => {
    if (!extendFechaFin) return
    if (minHoraFinExtend === "24:00") {
      const next = new Date(extendFechaFin)
      next.setDate(next.getDate() + 1)
      setExtendFechaFin(next)
      setExtendHoraFin("00:00")
      return
    }
    if (minHoraFinExtend && extendHoraFin < minHoraFinExtend) {
      setExtendHoraFin(minHoraFinExtend)
    }
  }, [minHoraFinExtend, extendHoraFin, extendFechaFin])

  useEffect(() => {
    if (!extendFechaInicio || !extendFechaFin) return
    if (extendFechaFin < extendFechaInicio) {
      setExtendFechaFin(new Date(extendFechaInicio))
    }
  }, [extendFechaInicio, extendFechaFin])

  const handleConfirmarAmpliar = (reserva: Reserva) => {
    const inicioActual = new Date(reserva.fecha_inicio)
    const finActual = new Date(reserva.fecha_fin)
    setReservaToExtend(reserva)
    setExtendFechaInicio(inicioActual)
    setExtendHoraInicio(formatHora(inicioActual))
    setExtendFechaFin(finActual)
    setExtendHoraFin(formatHora(finActual))
    setExtendError("")
    setShowExtendInicioCalendar(false)
    setShowExtendFinCalendar(false)
    setShowExtendDialog(true)
  }

  const handleCerrarAmpliar = () => {
    setShowExtendDialog(false)
    setReservaToExtend(null)
    setExtendFechaInicio(null)
    setExtendHoraInicio("")
    setExtendFechaFin(null)
    setExtendHoraFin("")
    setExtendError("")
    setShowExtendInicioCalendar(false)
    setShowExtendFinCalendar(false)
  }

  const handleGuardarAmpliacion = async () => {
    if (!reservaToExtend || !extendFechaInicio || !extendHoraInicio || !extendFechaFin || !extendHoraFin) return

    const nuevaFechaInicio = construirFechaHora(extendFechaInicio, extendHoraInicio)
    const nuevaFechaFin = construirFechaHora(extendFechaFin, extendHoraFin)

    if (nuevaFechaFin <= nuevaFechaInicio) {
      setExtendError("La fecha/hora de fin debe ser posterior a la fecha/hora de inicio.")
      return
    }

    setExtendingId(reservaToExtend.id)
    setExtendError("")
    try {
      const resultado = await ampliarReservaTemporal(
        reservaToExtend.id,
        nuevaFechaFin.toISOString(),
        nuevaFechaInicio.toISOString(),
      )
      if (resultado.success) {
        await cargarReservas()
        handleCerrarAmpliar()
      } else {
        setExtendError(resultado.error || "Error al modificar la reserva")
      }
    } catch (error) {
      console.error("Error modificando reserva:", error)
      setExtendError("Error inesperado al modificar la reserva")
    } finally {
      setExtendingId(null)
    }
  }

  const handleCapturarUbicacion = async (reserva: Reserva) => {
    setCapturandoUbicacion(reserva.id)

    try {
      const resultado = await capturarYAsignarUbicacion(reserva.coches.matricula)

      if (resultado.success) {
        if (resultado.ubicacion) {
          onUbicacionInicial?.(reserva.coches.matricula, {
            latitud: resultado.ubicacion.latitud,
            longitud: resultado.ubicacion.longitud,
            direccion_actual: reserva.coches.direccion_actual || undefined,
          })
        }
        alert(`📍 Ubicación capturada y guardada para ${reserva.coches.matricula}`)
      } else {
        const msg = resultado.mensaje || "Error al capturar la ubicación"
        if (msg.toLowerCase().includes("permiso denegado")) {
          alert(
            "No hay permiso de ubicación. Al volver a pulsar, tu navegador puede pedir permiso si está pendiente. Si ya fue bloqueado, actívalo desde el icono de ubicación del navegador para este sitio."
          )
        } else {
          alert(`❌ ${msg}`)
        }
      }
    } catch {
      alert("❌ Error inesperado al capturar la ubicación")
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

  const reservasActivas = reservas.filter(r => r.estado === 'activa' || r.estado === 'pendiente' || r.estado === 'vencida')
  const reservasHistoricas = reservas.filter(r => r.estado !== 'activa' && r.estado !== 'pendiente' && r.estado !== 'vencida')
  const matriculaSeleccionada = historialSeleccionado?.coches.matricula ?? null
  const fichaSeleccionada = matriculaSeleccionada ? fichaCocheCache[matriculaSeleccionada] : null
  const itvStatusSeleccionado = fichaSeleccionada?.proximaRevisionITV
    ? getITVStatus(fichaSeleccionada.proximaRevisionITV)
    : null

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
                          <button
                            type="button"
                            onClick={() => setHistorialSeleccionado(reserva)}
                            className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                            title="Ver resumen de la reserva"
                          >
                            <CarThumbnail
                              src={fotosCache[reserva.coches.matricula] ?? null}
                              alt={`${reserva.coches.marca} ${reserva.coches.modelo}`}
                              matricula={reserva.coches.matricula}
                            />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <Car className="h-5 w-5 text-green-600" />
                              <p className="font-semibold text-gray-900">
                                {reserva.coches.matricula}
                              </p>
                            </div>
                            <p className="text-sm text-gray-600">
                              {reserva.coches.marca} {reserva.coches.modelo}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getEstadoBadge(reserva)}

                          {isReservaActiva(reserva) && (
                            <Button
                              onClick={() => handleConfirmarAmpliar(reserva)}
                              disabled={extendingId === reserva.id}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              title="Modificar plazo de reserva"
                            >
                              {extendingId === reserva.id ? (
                                <div className="flex items-center gap-2">
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  Modificando...
                                </div>
                              ) : (
                                "Modificar"
                              )}
                            </Button>
                          )}

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
                                <div className="flex items-center gap-2">
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  Cancelando...
                                </div>
                              ) : (
                                "Cancelar"
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
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setHistorialSeleccionado(reserva)}
                            className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                            title="Ver resumen de la reserva"
                          >
                            <CarThumbnail
                              src={fotosCache[reserva.coches.matricula] ?? null}
                              alt={`${reserva.coches.marca} ${reserva.coches.modelo}`}
                              matricula={reserva.coches.matricula}
                            />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-gray-900">
                                {reserva.coches.matricula}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {reserva.coches.marca} {reserva.coches.modelo}
                            </span>
                          </div>
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
                      {reserva.limpieza && (
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="font-medium text-gray-700">Limpieza:</span>{" "}
                          {reserva.limpieza}
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

        <Dialog
          open={!!historialSeleccionado}
          onOpenChange={(open) => {
            if (!open) setHistorialSeleccionado(null)
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Resumen de la reserva</DialogTitle>
              <DialogDescription>
                Detalles principales de la reserva seleccionada.
              </DialogDescription>
            </DialogHeader>
            {historialSeleccionado && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-gray-50 p-3">
                  {fichaCocheLoading === matriculaSeleccionada && !fichaSeleccionada ? (
                    <div className="flex items-center text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cargando ficha del coche...
                    </div>
                  ) : fichaSeleccionada ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-lg font-semibold text-gray-900">
                            {fichaSeleccionada.matricula}
                          </div>
                          <div className="text-sm text-gray-600">
                            {fichaSeleccionada.marca} {fichaSeleccionada.modelo}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getEstadoReserva(historialSeleccionado)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <CarThumbnail
                            src={matriculaSeleccionada ? fotosCache[matriculaSeleccionada] ?? null : null}
                            alt={`${fichaSeleccionada.marca} ${fichaSeleccionada.modelo}`}
                            matricula={fichaSeleccionada.matricula}
                          />
                          {fichaSeleccionada.empleadoNombre ? (
                            <p className="text-sm text-blue-600 font-medium text-right mt-1">
                              {fichaSeleccionada.empleadoNombre}
                            </p>
                          ) : fichaSeleccionada.alquiler ? (
                            <p className="text-sm text-purple-600 font-medium mt-1">Alquiler</p>
                          ) : (
                            <p className="text-sm text-gray-400 mt-1">Sin asignar</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {fichaSeleccionada.color && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Color:</span>
                            <span>{fichaSeleccionada.color}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Kilómetros:</span>
                          <span>{fichaSeleccionada.kms?.toLocaleString() || 0} km</span>
                        </div>
                        {fichaSeleccionada.combustible && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Combustible:</span>
                            <span>{fichaSeleccionada.combustible}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Próxima ITV:</span>
                          <div className="flex items-center">
                            {fichaSeleccionada.proximaRevisionITV ? (
                              <>
                                {itvStatusSeleccionado?.isOverdue && (
                                  <AlertTriangle className="h-4 w-4 text-red-600 mr-1" />
                                )}
                                {itvStatusSeleccionado?.isUrgent && !itvStatusSeleccionado?.isOverdue && (
                                  <Clock className="h-4 w-4 text-red-500 mr-1" />
                                )}
                                <span
                                  className={
                                    itvStatusSeleccionado?.isOverdue || itvStatusSeleccionado?.isUrgent
                                      ? "text-red-600 font-semibold"
                                      : ""
                                  }
                                >
                                  {formatDate(fichaSeleccionada.proximaRevisionITV)}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400 italic">Sin datos</span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Tarjeta SOLRED:</span>
                          <div className="flex items-center">
                            {fichaSeleccionada.tarjetaSolred ? (
                              <>
                                <CreditCard className="h-4 w-4 text-blue-600 mr-1" />
                                <span className="text-blue-600 font-semibold">
                                  PIN: {fichaSeleccionada.tarjetaSolred.pin}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400 italic">Sin tarjeta</span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Tarjeta ViaT:</span>
                          <div className="flex items-center">
                            {fichaSeleccionada.tarjetaViat ? (
                              <>
                                <Truck className="h-4 w-4 text-green-600 mr-1" />
                                <span className="text-green-600 font-semibold">
                                  {fichaSeleccionada.tarjetaViat.id}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400 italic">Sin tarjeta</span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Seguro:</span>
                          <div className="flex items-center">
                            {fichaSeleccionada.seguroActivo ? (
                              <div className="text-right">
                                <div className="flex items-center">
                                  <span
                                    className={
                                      fichaSeleccionada.seguroActivo.fecha_vencimiento &&
                                      new Date(fichaSeleccionada.seguroActivo.fecha_vencimiento) < new Date()
                                        ? "text-red-600 font-semibold"
                                        : "text-blue-600 font-semibold"
                                    }
                                  >
                                    {fichaSeleccionada.seguroActivo.fecha_vencimiento
                                      ? formatDate(fichaSeleccionada.seguroActivo.fecha_vencimiento)
                                      : "Sin datos"}
                                  </span>
                                </div>
                                {fichaSeleccionada.seguroActivo.telefono_asistencia1 && (
                                  <span className="text-xs text-gray-600">
                                    Tel: {fichaSeleccionada.seguroActivo.telefono_asistencia1}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Sin seguro</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      No se pudo cargar la ficha del coche.
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>
                    <span className="font-medium">Inicio:</span>{" "}
                    {format(new Date(historialSeleccionado.fecha_inicio), "PPP 'a las' HH:mm", { locale: es })}
                  </div>
                  <div>
                    <span className="font-medium">Fin:</span>{" "}
                    {format(new Date(historialSeleccionado.fecha_fin), "PPP 'a las' HH:mm", { locale: es })}
                  </div>
                </div>
                {historialSeleccionado.observaciones && (
                  <div className="text-sm text-gray-600 whitespace-pre-line">
                    <span className="font-medium text-gray-700">Observaciones:</span>{" "}
                    {formatObservaciones(historialSeleccionado.observaciones)}
                  </div>
                )}
                {historialSeleccionado.quejas && (
                  <div className="text-sm text-gray-600 whitespace-pre-line">
                    <span className="font-medium text-gray-700">Quejas:</span>{" "}
                    {formatObservaciones(historialSeleccionado.quejas)}
                  </div>
                )}
                {historialSeleccionado.limpieza && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-700">Limpieza:</span>{" "}
                    {historialSeleccionado.limpieza}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmación para cancelar reserva */}
        <AlertDialog
          open={showCancelDialog}
          onOpenChange={(open) => {
            if (!open) {
              handleCerrarDialog()
            } else {
              setShowCancelDialog(true)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle asChild>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Cancelar reserva
                </div>
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>¿Quieres añadir una observación para esta cancelación?</p>
                  {reservaToCancel && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md border">
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
                  <div>
                    <Label htmlFor="observacion-cancelar">Observaciones (opcional)</Label>
                    <Textarea
                      id="observacion-cancelar"
                      value={observacionCancelar}
                      onChange={(e) => setObservacionCancelar(e.target.value)}
                      placeholder="Escribe una observación..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="queja-cancelar">Quejas (opcional)</Label>
                    <Textarea
                      id="queja-cancelar"
                      value={quejaCancelar}
                      onChange={(e) => setQuejaCancelar(e.target.value)}
                      placeholder="Escribe una queja..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="estado-limpieza-cancelar">Estado de limpieza (opcional)</Label>
                    <select
                      id="estado-limpieza-cancelar"
                      value={estadoLimpiezaCancelar}
                      onChange={(e) => setEstadoLimpiezaCancelar(e.target.value as any)}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Sin seleccionar</option>
                      <option value="bien">bien</option>
                      <option value="regular">regular</option>
                      <option value="mal">mal</option>
                    </select>
                  </div>
                  {reservaToCancel && (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                      <p className="text-sm text-blue-700 mb-3">
                        <strong>Ubicación automática:</strong> usa la localización del navegador para guardar dónde dejas el coche.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 w-full"
                        disabled={capturandoUbicacion === reservaToCancel.id}
                        onClick={() => handleCapturarUbicacion(reservaToCancel)}
                      >
                        {capturandoUbicacion === reservaToCancel.id ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Obteniendo ubicación...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Registrar ubicación actual del vehículo
                          </div>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCerrarDialog}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  reservaToCancel &&
                  handleCancelarReserva(
                    reservaToCancel.id,
                    observacionCancelar,
                    quejaCancelar,
                    estadoLimpiezaCancelar || undefined
                  )
                }
                className="bg-red-600 hover:bg-red-700"
                disabled={cancellingId !== null}
              >
                {cancellingId === reservaToCancel?.id ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Cancelar reserva'
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
                  <div>
                    <Label htmlFor="estado-limpieza">Estado de limpieza (opcional)</Label>
                    <select
                      id="estado-limpieza"
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
                  {reservaToComplete && (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                      <p className="text-sm text-blue-700 mb-3">
                        <strong>Ubicación automática:</strong> usa la localización del navegador para guardar dónde dejas el coche.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 w-full"
                        disabled={capturandoUbicacion === reservaToComplete.id}
                        onClick={() => handleCapturarUbicacion(reservaToComplete)}
                      >
                        {capturandoUbicacion === reservaToComplete.id ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Obteniendo ubicación...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Registrar ubicación actual del vehículo
                          </div>
                        )}
                      </Button>
                    </div>
                  )}
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

        {/* Diálogo para modificar plazo */}
        <AlertDialog
          open={showExtendDialog}
          onOpenChange={(open) => {
            if (!open) {
              handleCerrarAmpliar()
            } else {
              setShowExtendDialog(true)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle asChild>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-blue-600" />
                  Modificar plazo de reserva
                </div>
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  {reservaToExtend && (
                    <div className="p-3 bg-gray-50 rounded-md border">
                      <p className="font-semibold text-gray-900">
                        {reservaToExtend.coches.matricula} - {reservaToExtend.coches.marca} {reservaToExtend.coches.modelo}
                      </p>
                      <p className="text-xs text-gray-600">
                        Inicio actual: {format(new Date(reservaToExtend.fecha_inicio), "PPP 'a las' HH:mm", { locale: es })}
                      </p>
                      <p className="text-xs text-gray-600">
                        Fin actual: {format(new Date(reservaToExtend.fecha_fin), "PPP 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha de Inicio</Label>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          onClick={() => {
                            setShowExtendInicioCalendar(!showExtendInicioCalendar)
                            setShowExtendFinCalendar(false)
                          }}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {extendFechaInicio ? format(extendFechaInicio, "PPP", { locale: es }) : "Seleccionar fecha"}
                        </Button>

                        {showExtendInicioCalendar && (
                          <div className="absolute top-full mt-1 z-50 bg-white border rounded-md shadow-lg p-3">
                            <DayPicker
                              mode="single"
                              selected={extendFechaInicio || undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setExtendFechaInicio(date)
                                  setShowExtendInicioCalendar(false)
                                  setExtendError("")
                                }
                              }}
                              locale={es}
                              classNames={{
                                day_selected: "bg-blue-600 text-white",
                                day_today: "bg-blue-100 text-blue-600 font-semibold",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Hora de Inicio</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                          value={extendHoraInicio}
                          onChange={(e) => {
                            setExtendHoraInicio(e.target.value)
                            setExtendError("")
                          }}
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha de Fin (nueva)</Label>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          onClick={() => {
                            setShowExtendFinCalendar(!showExtendFinCalendar)
                            setShowExtendInicioCalendar(false)
                          }}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {extendFechaFin ? format(extendFechaFin, "PPP", { locale: es }) : "Seleccionar fecha"}
                        </Button>

                        {showExtendFinCalendar && (
                          <div className="absolute top-full mt-1 z-50 bg-white border rounded-md shadow-lg p-3">
                            <DayPicker
                              mode="single"
                              selected={extendFechaFin || undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setExtendFechaFin(date)
                                  setShowExtendFinCalendar(false)
                                  setExtendError("")
                                }
                              }}
                              disabled={
                                extendFechaInicio
                                  ? { before: extendFechaInicio }
                                  : undefined
                              }
                              locale={es}
                              classNames={{
                                day_selected: "bg-blue-600 text-white",
                                day_today: "bg-blue-100 text-blue-600 font-semibold",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Hora de Fin (nueva)</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                          value={extendHoraFin}
                          onChange={(e) => {
                            setExtendHoraFin(e.target.value)
                            setExtendError("")
                          }}
                          className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {generarHoras().map((hora) => {
                            let disabledOpt = false
                            if (extendFechaInicio && extendHoraInicio && extendFechaFin) {
                              if (extendFechaFin.toDateString() === extendFechaInicio.toDateString()) {
                                const [hIni, mIni] = extendHoraInicio.split(":").map(Number)
                                const baseMin = hIni * 60 + mIni
                                const [h, m] = hora.split(":").map(Number)
                                disabledOpt = h * 60 + m <= baseMin
                              }
                            }
                            return (
                              <option key={hora} value={hora} disabled={disabledOpt}>
                                {hora}{disabledOpt ? " (no disponible)" : ""}
                              </option>
                            )
                          })}
                        </select>
                        {extendFechaInicio && extendFechaFin && extendFechaFin.toDateString() === extendFechaInicio.toDateString() && (
                          <p className="mt-1 text-xs text-gray-500">
                            {minHoraFinExtend === "24:00"
                              ? "La hora de fin debe pasar al día siguiente"
                              : `Mínimo fin: ${minHoraFinExtend}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {extendError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{extendError}</p>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCerrarAmpliar}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleGuardarAmpliacion}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={extendingId !== null}
              >
                {extendingId ? "Guardando..." : "Guardar modificación"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
