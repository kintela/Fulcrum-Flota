"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { crearTarjetaSolred, obtenerTarjetasSolred, obtenerTarjetaAsignada } from "@/app/actions/solred"
import { AlertCircle, CheckCircle2, CreditCard } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface SolredManagerProps {
  matricula?: string
  empleadoId?: number | null
  tarjetasSolred?: any[]
  setTarjetasSolred?: (tarjetas: any[]) => void
  tarjetaSeleccionada?: string
  setTarjetaSeleccionada?: (tarjeta: string) => void
  isEditing?: boolean
}

export function SolredManager({
  matricula,
  empleadoId,
  tarjetasSolred: propTarjetasSolred,
  setTarjetasSolred: propSetTarjetasSolred,
  tarjetaSeleccionada: propTarjetaSeleccionada,
  setTarjetaSeleccionada: propSetTarjetaSeleccionada,
  isEditing = false,
}: SolredManagerProps) {
  const [localTarjetasSolred, setLocalTarjetasSolred] = useState<any[]>([])
  const [localTarjetaSeleccionada, setLocalTarjetaSeleccionada] = useState("")
  const [nuevaTarjeta, setNuevaTarjeta] = useState({
    numero: "",
    pin: "",
    fechaVencimiento: "",
  })
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null)

  // Usar props si están disponibles, sino usar estado local
  const tarjetasSolred = propTarjetasSolred || localTarjetasSolred
  const setTarjetasSolred = propSetTarjetasSolred || setLocalTarjetasSolred
  const tarjetaSeleccionada = propTarjetaSeleccionada || localTarjetaSeleccionada
  const setTarjetaSeleccionada = propSetTarjetaSeleccionada || setLocalTarjetaSeleccionada

  useEffect(() => {
    cargarDatos()
  }, [matricula, empleadoId])

  const cargarDatos = async () => {
    try {
      setIsLoading(true)

      // Cargar todas las tarjetas SOLRED
      const tarjetas = await obtenerTarjetasSolred()
      if (!propTarjetasSolred) {
        setLocalTarjetasSolred(tarjetas || [])
      }

      // Si hay matrícula o empleadoId, cargar la tarjeta asignada
      if (matricula && !propTarjetaSeleccionada) {
        const tarjetaAsignada = await obtenerTarjetaAsignada(matricula)
        if (tarjetaAsignada) {
          setLocalTarjetaSeleccionada(tarjetaAsignada.numero_tarjeta)
        }
      }
    } catch (error) {
      console.error("Error al cargar datos SOLRED:", error)
      setMensaje({
        tipo: "error",
        texto: "Error al cargar las tarjetas SOLRED",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name === "numero") {
      const numeroLimpio = value.replace(/\D/g, "").slice(0, 17)
      setNuevaTarjeta({ ...nuevaTarjeta, numero: numeroLimpio })
    } else if (name === "pin") {
      const pinLimpio = value.replace(/\D/g, "").slice(0, 4)
      setNuevaTarjeta({ ...nuevaTarjeta, pin: pinLimpio })
    } else {
      setNuevaTarjeta({ ...nuevaTarjeta, [name]: value })
    }
  }

  const crearNuevaTarjeta = async () => {
    setIsCreating(true)
    setMensaje(null)

    try {
      const result = await crearTarjetaSolred(nuevaTarjeta.numero, nuevaTarjeta.pin, nuevaTarjeta.fechaVencimiento)

      if (result.success) {
        // Añadir la nueva tarjeta al listado
        const nuevaTarjetaCompleta = {
          numero_tarjeta: nuevaTarjeta.numero,
          pin: nuevaTarjeta.pin,
          fechavencimiento: nuevaTarjeta.fechaVencimiento,
          activa: true,
        }

        const tarjetasActualizadas = [...tarjetasSolred, nuevaTarjetaCompleta]
        setTarjetasSolred(tarjetasActualizadas)
        setTarjetaSeleccionada(nuevaTarjeta.numero)

        setMensaje({
          tipo: "success",
          texto: "Tarjeta SOLRED creada y seleccionada correctamente",
        })

        // Limpiar el formulario
        setNuevaTarjeta({ numero: "", pin: "", fechaVencimiento: "" })
      } else {
        setMensaje({
          tipo: "error",
          texto: result.error || "Error al crear la tarjeta",
        })
      }
    } catch (error) {
      console.error("Error al crear tarjeta:", error)
      setMensaje({
        tipo: "error",
        texto: "Error inesperado al crear la tarjeta",
      })
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Tarjeta SOLRED
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Cargando tarjetas SOLRED...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Tarjeta SOLRED
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mensaje de éxito o error */}
        {mensaje && (
          <Alert variant={mensaje.tipo === "success" ? "default" : "destructive"}>
            {mensaje.tipo === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{mensaje.tipo === "success" ? "Operación exitosa" : "Error"}</AlertTitle>
            <AlertDescription>{mensaje.texto}</AlertDescription>
          </Alert>
        )}

        {/* Selector de tarjeta existente */}
        <div>
          <Label htmlFor="numero_tarjeta_solred">Seleccionar Tarjeta Existente</Label>
          <select
            id="numero_tarjeta_solred"
            name="numero_tarjeta_solred"
            value={tarjetaSeleccionada}
            onChange={(e) => setTarjetaSeleccionada(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Sin tarjeta asignada</option>
            {Array.isArray(tarjetasSolred) &&
              tarjetasSolred.map((tarjeta) => (
                <option key={tarjeta.numero_tarjeta} value={tarjeta.numero_tarjeta}>
                  {tarjeta.numero_tarjeta} - PIN: {tarjeta.pin} - Vence: {tarjeta.fechavencimiento}
                </option>
              ))}
          </select>
        </div>

        {isEditing && (
          <>
            {/* Separador */}
            <div className="flex items-center my-4">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="px-3 text-gray-500 text-sm">O crear nueva tarjeta</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* Campos para nueva tarjeta */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="numero">Número de Tarjeta (17 dígitos) *</Label>
                <Input
                  id="numero"
                  name="numero"
                  type="text"
                  value={nuevaTarjeta.numero}
                  onChange={handleInputChange}
                  placeholder="12345678901234567"
                  maxLength={17}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="pin">PIN (4 dígitos) *</Label>
                <Input
                  id="pin"
                  name="pin"
                  type="text"
                  value={nuevaTarjeta.pin}
                  onChange={handleInputChange}
                  placeholder="1234"
                  maxLength={4}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="fechaVencimiento">Fecha de Vencimiento *</Label>
                <Input
                  id="fechaVencimiento"
                  name="fechaVencimiento"
                  type="date"
                  value={nuevaTarjeta.fechaVencimiento}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={crearNuevaTarjeta}
                disabled={
                  isCreating ||
                  !nuevaTarjeta.numero ||
                  nuevaTarjeta.numero.length !== 17 ||
                  !nuevaTarjeta.pin ||
                  nuevaTarjeta.pin.length !== 4 ||
                  !nuevaTarjeta.fechaVencimiento
                }
                className="bg-green-600 hover:bg-green-700"
              >
                {isCreating ? "Creando..." : "Añadir Tarjeta"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
