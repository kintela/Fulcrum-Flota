"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, CreditCard, Plus, Trash2, AlertTriangle } from "lucide-react"
import {
  obtenerTarjetasViat,
  obtenerTarjetaViatAsignada,
  asignarTarjetaViat,
  desasignarTarjetaViat,
  crearTarjetaViat,
  obtenerHistorialViatEmpleado,
} from "@/app/actions/viats"

interface ViatManagerProps {
  empleadoId: number | null
  isEditing?: boolean
  onViatChange?: (viatId: number | null, observaciones?: string) => void
  showEmployeeAssignment?: boolean
}

interface TarjetaViat {
  id: number
  fechacaducidad: string
  activo: boolean
  created_at: string
  updated_at: string
}

interface AsignacionViat {
  id: number
  viat_id: number
  empleado_id: number
  fecha_asignacion: string
  fecha_desasignacion: string | null
  activa: boolean
  observaciones: string | null
  viats: TarjetaViat
}

export function ViatManager({
  empleadoId,
  isEditing = false,
  onViatChange,
  showEmployeeAssignment = true,
}: ViatManagerProps) {
  const [tarjetasViat, setTarjetasViat] = useState<TarjetaViat[]>([])
  const [tarjetaAsignada, setTarjetaAsignada] = useState<AsignacionViat | null>(null)
  const [historial, setHistorial] = useState<AsignacionViat[]>([])
  const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [mostrarFormularioNueva, setMostrarFormularioNueva] = useState(false)
  const [nuevoNumeroTarjeta, setNuevoNumeroTarjeta] = useState("")
  const [nuevaFechaCaducidad, setNuevaFechaCaducidad] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cargarDatos()
  }, [empleadoId])

  const cargarDatos = async () => {
    try {
      setIsLoading(true)
      const tarjetas = await obtenerTarjetasViat()
      setTarjetasViat(tarjetas)

      if (empleadoId && showEmployeeAssignment) {
        const [asignada, historialData] = await Promise.all([
          obtenerTarjetaViatAsignada(empleadoId),
          obtenerHistorialViatEmpleado(empleadoId),
        ])

        setTarjetaAsignada(asignada)
        setHistorial(historialData)
      }
    } catch (error) {
      console.error("Error al cargar datos ViaT:", error)
      setError("Error al cargar los datos de ViaT")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAsignarTarjeta = async () => {
    if (!empleadoId || !tarjetaSeleccionada) return

    try {
      setIsLoading(true)
      setError(null)

      // Si hay callback, notificar el cambio
      if (onViatChange) {
        onViatChange(Number.parseInt(tarjetaSeleccionada), observaciones)
      }

      // Si se debe mostrar la asignación de empleado, crear la relación
      if (showEmployeeAssignment) {
        const resultado = await asignarTarjetaViat(empleadoId, Number.parseInt(tarjetaSeleccionada), observaciones)

        if (resultado.success) {
          await cargarDatos()
          setTarjetaSeleccionada("")
          setObservaciones("")
        } else {
          setError(resultado.error || "Error al asignar la tarjeta ViaT")
        }
      } else {
        // Solo limpiar el formulario si no hay asignación de empleado
        setTarjetaSeleccionada("")
        setObservaciones("")
      }
    } catch (error) {
      console.error("Error al asignar tarjeta ViaT:", error)
      setError("Error inesperado al asignar la tarjeta ViaT")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDesasignarTarjeta = async () => {
    if (!empleadoId) return

    try {
      setIsLoading(true)
      setError(null)

      // Si hay callback, notificar el cambio
      if (onViatChange) {
        onViatChange(null)
      }

      // Si se debe mostrar la asignación de empleado, desasignar
      if (showEmployeeAssignment) {
        const resultado = await desasignarTarjetaViat(empleadoId)

        if (resultado.success) {
          await cargarDatos()
        } else {
          setError(resultado.error || "Error al desasignar la tarjeta ViaT")
        }
      }
    } catch (error) {
      console.error("Error al desasignar tarjeta ViaT:", error)
      setError("Error inesperado al desasignar la tarjeta ViaT")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCrearTarjeta = async () => {
    if (!nuevoNumeroTarjeta || !nuevaFechaCaducidad) {
      setError("El número de tarjeta y la fecha de caducidad son obligatorios")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const resultado = await crearTarjetaViat(nuevoNumeroTarjeta, nuevaFechaCaducidad)

      if (resultado.success) {
        await cargarDatos()
        setMostrarFormularioNueva(false)
        setNuevoNumeroTarjeta("")
        setNuevaFechaCaducidad("")

        // Si hay callback y empleado, asignar automáticamente la nueva tarjeta
        if (onViatChange && empleadoId && !showEmployeeAssignment) {
          setTarjetaSeleccionada(nuevoNumeroTarjeta)
          onViatChange(Number.parseInt(nuevoNumeroTarjeta), "")
        }
      } else {
        setError(resultado.error || "Error al crear la tarjeta ViaT")
      }
    } catch (error) {
      console.error("Error al crear tarjeta ViaT:", error)
      setError("Error inesperado al crear la tarjeta ViaT")
    } finally {
      setIsLoading(false)
    }
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-ES")
  }

  const estaVencida = (fecha: string) => {
    return new Date(fecha) < new Date()
  }

  const formatearNumeroTarjeta = (numero: string) => {
    // Formatear el número de tarjeta para mostrar solo los últimos 4 dígitos
    if (numero.length === 16) {
      return `**** **** **** ${numero.slice(-4)}`
    }
    return numero
  }

  const handleNumeroTarjetaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "") // Solo números
    if (value.length <= 16) {
      setNuevoNumeroTarjeta(value)
    }
  }

  const handleTarjetaSeleccionadaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setTarjetaSeleccionada(value)

    // Si hay callback, notificar el cambio inmediatamente
    if (onViatChange && !showEmployeeAssignment) {
      onViatChange(value ? Number.parseInt(value) : null, observaciones)
    }
  }

  const handleObservacionesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setObservaciones(value)

    // Si hay callback y tarjeta seleccionada, notificar el cambio
    if (onViatChange && !showEmployeeAssignment && tarjetaSeleccionada) {
      onViatChange(Number.parseInt(tarjetaSeleccionada), value)
    }
  }

  if (isLoading && tarjetasViat.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Tarjeta ViaT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Cargando datos de ViaT...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Tarjeta ViaT
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Campos ocultos para el formulario */}
        {!showEmployeeAssignment && (
          <>
            <input type="hidden" name="viat_id" value={tarjetaSeleccionada} />
            <input type="hidden" name="observaciones_viat" value={observaciones} />
          </>
        )}

        {/* Tarjeta actualmente asignada */}
        {tarjetaAsignada && showEmployeeAssignment && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-green-800">Tarjeta ViaT Asignada</h4>
                <div className="mt-2 space-y-1 text-sm text-green-700">
                  <p className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Número: {formatearNumeroTarjeta(tarjetaAsignada.viat_id.toString())}
                  </p>
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Caducidad: {formatearFecha(tarjetaAsignada.viats.fechacaducidad)}
                    {estaVencida(tarjetaAsignada.viats.fechacaducidad) && (
                      <Badge variant="destructive" className="ml-2">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Vencida
                      </Badge>
                    )}
                  </p>
                  <p>Asignada: {formatearFecha(tarjetaAsignada.fecha_asignacion)}</p>
                  {tarjetaAsignada.observaciones && <p>Observaciones: {tarjetaAsignada.observaciones}</p>}
                </div>
              </div>
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDesasignarTarjeta}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700 bg-transparent"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Desasignar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Formulario para asignar nueva tarjeta */}
        {isEditing && (!tarjetaAsignada || !showEmployeeAssignment) && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="tarjeta-viat">Seleccionar Tarjeta ViaT</Label>
              <select
                id="tarjeta-viat"
                value={tarjetaSeleccionada}
                onChange={handleTarjetaSeleccionadaChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar tarjeta...</option>
                {tarjetasViat.map((tarjeta) => (
                  <option key={tarjeta.id} value={tarjeta.id}>
                    {formatearNumeroTarjeta(tarjeta.id.toString())} - Caduca: {formatearFecha(tarjeta.fechacaducidad)}
                    {estaVencida(tarjeta.fechacaducidad) ? " (VENCIDA)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="observaciones-viat">Observaciones</Label>
              <Textarea
                id="observaciones-viat"
                value={observaciones}
                onChange={handleObservacionesChange}
                placeholder="Observaciones sobre la asignación..."
                className="mt-1"
                rows={2}
              />
            </div>

            {showEmployeeAssignment && (
              <Button onClick={handleAsignarTarjeta} disabled={!tarjetaSeleccionada || isLoading} className="w-full">
                {isLoading ? "Asignando..." : "Asignar Tarjeta ViaT"}
              </Button>
            )}
          </div>
        )}

        {/* Botón para crear nueva tarjeta */}
        {isEditing && (
          <div className="border-t pt-4">
            {!mostrarFormularioNueva ? (
              <Button variant="outline" onClick={() => setMostrarFormularioNueva(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Crear Nueva Tarjeta ViaT
              </Button>
            ) : (
              <div className="space-y-4 p-4 bg-gray-50 rounded-md">
                <h4 className="font-medium">Nueva Tarjeta ViaT</h4>

                <div>
                  <Label htmlFor="nuevo-numero-tarjeta">Número de Tarjeta (16 dígitos) *</Label>
                  <Input
                    id="nuevo-numero-tarjeta"
                    type="text"
                    value={nuevoNumeroTarjeta}
                    onChange={handleNumeroTarjetaChange}
                    placeholder="1234567890123456"
                    className="mt-1"
                    maxLength={16}
                  />
                  <p className="text-xs text-gray-500 mt-1">{nuevoNumeroTarjeta.length}/16 dígitos</p>
                </div>

                <div>
                  <Label htmlFor="nueva-fecha-caducidad">Fecha de Caducidad *</Label>
                  <Input
                    id="nueva-fecha-caducidad"
                    type="date"
                    value={nuevaFechaCaducidad}
                    onChange={(e) => setNuevaFechaCaducidad(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCrearTarjeta}
                    disabled={
                      !nuevoNumeroTarjeta || !nuevaFechaCaducidad || nuevoNumeroTarjeta.length !== 16 || isLoading
                    }
                    className="flex-1"
                  >
                    {isLoading ? "Creando..." : "Crear Tarjeta"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMostrarFormularioNueva(false)
                      setNuevoNumeroTarjeta("")
                      setNuevaFechaCaducidad("")
                      setError(null)
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Historial de asignaciones */}
        {historial.length > 0 && showEmployeeAssignment && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Historial de Tarjetas ViaT</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {historial.map((asignacion) => (
                <div
                  key={asignacion.id}
                  className={`p-3 rounded-md text-sm ${
                    asignacion.activa ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      Tarjeta: {formatearNumeroTarjeta(asignacion.viat_id.toString())}
                    </span>
                    <Badge variant={asignacion.activa ? "default" : "secondary"}>
                      {asignacion.activa ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <div className="mt-1 text-gray-600">
                    <p>Caducidad: {formatearFecha(asignacion.viats.fechacaducidad)}</p>
                    <p>Asignada: {formatearFecha(asignacion.fecha_asignacion)}</p>
                    {asignacion.fecha_desasignacion && (
                      <p>Desasignada: {formatearFecha(asignacion.fecha_desasignacion)}</p>
                    )}
                    {asignacion.observaciones && <p>Observaciones: {asignacion.observaciones}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mensaje cuando no hay empleado seleccionado */}
        {!empleadoId && isEditing && showEmployeeAssignment && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm">Selecciona un empleado para gestionar las tarjetas ViaT</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
