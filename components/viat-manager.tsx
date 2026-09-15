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
  obtenerHistorialViatCoche,
} from "@/app/actions/viats"

interface ViatManagerProps {
  matricula?: string | null
  isEditing?: boolean
}

interface TarjetaViat {
  id: string
  fechacaducidad: string
  activo: boolean
  matricula_asignada?: string | null
  disponible?: boolean
  created_at?: string
  updated_at?: string
}

interface AsignacionViat {
  id: number
  viat_id: string
  matricula: string
  fecha_asignacion: string
  fecha_desasignacion: string | null
  observaciones: string | null
  viats: TarjetaViat | null
}

function normalizarMatricula(matricula?: string | null) {
  return (matricula || "").trim().toUpperCase()
}

export function ViatManager({ matricula, isEditing = false }: ViatManagerProps) {
  const matriculaNormalizada = normalizarMatricula(matricula)
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
  }, [matriculaNormalizada])

  const cargarDatos = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const tarjetas = await obtenerTarjetasViat(matriculaNormalizada || null)
      setTarjetasViat(tarjetas)

      if (matriculaNormalizada) {
        const [asignada, historialData] = await Promise.all([
          obtenerTarjetaViatAsignada(matriculaNormalizada),
          obtenerHistorialViatCoche(matriculaNormalizada),
        ])

        setTarjetaAsignada(asignada as AsignacionViat | null)
        setHistorial((historialData as AsignacionViat[]) || [])

        if (asignada?.viat_id) {
          setTarjetaSeleccionada(asignada.viat_id)
          setObservaciones(asignada.observaciones || "")
        } else {
          setTarjetaSeleccionada("")
          setObservaciones("")
        }
      } else {
        setTarjetaAsignada(null)
        setHistorial([])
        setTarjetaSeleccionada("")
        setObservaciones("")
      }
    } catch (error) {
      console.error("Error al cargar datos ViaT:", error)
      setError("Error al cargar los datos de ViaT")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAsignarTarjeta = async () => {
    if (!matriculaNormalizada || !tarjetaSeleccionada) return

    try {
      setIsLoading(true)
      setError(null)

      const resultado = await asignarTarjetaViat(matriculaNormalizada, tarjetaSeleccionada, observaciones)

      if (resultado.success) {
        await cargarDatos()
      } else {
        setError(resultado.error || "Error al asignar la tarjeta ViaT")
      }
    } catch (error) {
      console.error("Error al asignar tarjeta ViaT:", error)
      setError("Error inesperado al asignar la tarjeta ViaT")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDesasignarTarjeta = async () => {
    if (!matriculaNormalizada) return

    try {
      setIsLoading(true)
      setError(null)
      const resultado = await desasignarTarjetaViat(matriculaNormalizada)

      if (resultado.success) {
        await cargarDatos()
      } else {
        setError(resultado.error || "Error al desasignar la tarjeta ViaT")
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
        setTarjetaSeleccionada(nuevoNumeroTarjeta)
        setNuevoNumeroTarjeta("")
        setNuevaFechaCaducidad("")
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
    return numero
  }

  const handleNumeroTarjetaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "") // Solo números
    if (value.length <= 16) {
      setNuevoNumeroTarjeta(value)
    }
  }

  const handleTarjetaSeleccionadaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTarjetaSeleccionada(e.target.value)
  }

  const handleObservacionesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setObservaciones(e.target.value)
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

        {/* Tarjeta actualmente asignada */}
        {tarjetaAsignada ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-green-800">Tarjeta ViaT Asignada</h4>
                <div className="mt-2 space-y-1 text-sm text-green-700">
                  <p className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Número: {formatearNumeroTarjeta(tarjetaAsignada.viat_id)}
                  </p>
                  {tarjetaAsignada.viats && (
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
                  )}
                  <p>Asignada: {formatearFecha(tarjetaAsignada.fecha_asignacion)}</p>
                  {tarjetaAsignada.observaciones && <p>Observaciones: {tarjetaAsignada.observaciones}</p>}
                </div>
              </div>
              {isEditing && (
                <Button
                  type="button"
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
        ) : (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">Sin tarjeta ViaT asignada</div>
        )}

        {/* Formulario para asignar nueva tarjeta */}
        {isEditing && matriculaNormalizada && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="tarjeta-viat">Seleccionar Tarjeta Existente</Label>
              <select
                id="tarjeta-viat"
                value={tarjetaSeleccionada}
                onChange={handleTarjetaSeleccionadaChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar tarjeta...</option>
                {tarjetasViat.map((tarjeta) => (
                  <option key={tarjeta.id} value={tarjeta.id} disabled={tarjeta.disponible === false}>
                    {formatearNumeroTarjeta(tarjeta.id)} - Caduca: {formatearFecha(tarjeta.fechacaducidad)}
                    {estaVencida(tarjeta.fechacaducidad) ? " (VENCIDA)" : ""}
                    {tarjeta.matricula_asignada ? ` - Asignada a ${tarjeta.matricula_asignada}` : " - Disponible"}
                  </option>
                ))}
              </select>
              {!error && tarjetasViat.length === 0 && (
                <p className="mt-2 text-sm text-gray-600">No hay tarjetas ViaT activas.</p>
              )}
              {tarjetasViat.length > 0 && tarjetasViat.every((tarjeta) => tarjeta.disponible === false) && (
                <p className="mt-2 text-sm text-gray-600">
                  Todas las tarjetas ViaT están asignadas a otros coches. Desasigna una de su coche actual para poder asignarla aquí.
                </p>
              )}
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

            <Button type="button" onClick={handleAsignarTarjeta} disabled={!tarjetaSeleccionada || isLoading} className="w-full">
              {isLoading ? "Guardando..." : "Guardar Tarjeta ViaT"}
            </Button>
          </div>
        )}

        {/* Botón para crear nueva tarjeta */}
        {isEditing && (
          <div className="border-t pt-4">
            {!mostrarFormularioNueva ? (
              <Button type="button" variant="outline" onClick={() => setMostrarFormularioNueva(true)} className="w-full">
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
                    type="button"
                    onClick={handleCrearTarjeta}
                    disabled={
                      !nuevoNumeroTarjeta || !nuevaFechaCaducidad || nuevoNumeroTarjeta.length !== 16 || isLoading
                    }
                    className="flex-1"
                  >
                    {isLoading ? "Creando..." : "Crear Tarjeta"}
                  </Button>
                  <Button
                    type="button"
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
        {historial.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Historial de Tarjetas ViaT</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {historial.map((asignacion) => (
                <div
                  key={asignacion.id}
                  className={`p-3 rounded-md text-sm ${
                    !asignacion.fecha_desasignacion
                      ? "bg-green-50 border border-green-200"
                      : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Tarjeta: {formatearNumeroTarjeta(asignacion.viat_id)}</span>
                    <Badge variant={!asignacion.fecha_desasignacion ? "default" : "secondary"}>
                      {!asignacion.fecha_desasignacion ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <div className="mt-1 text-gray-600">
                    {asignacion.viats && <p>Caducidad: {formatearFecha(asignacion.viats.fechacaducidad)}</p>}
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

        {!matriculaNormalizada && isEditing && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm">Guarda el coche con matrícula para poder gestionar la tarjeta ViaT</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
