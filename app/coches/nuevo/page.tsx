"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Car, User } from "lucide-react"
import { crearCoche } from "./actions"
import { obtenerEmpleados } from "@/app/actions/empleados"
import { SolredManager } from "@/components/solred-manager"
import { SeguroManager } from "@/components/seguro-manager"
import { ViatManager } from "@/components/viat-manager"

interface Empleado {
  id: number
  nombre: string
  apellidos: string
  dni: string
  telefono: string
  email: string
  activo: boolean
}

export default function NuevoCochePage() {
  const router = useRouter()
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [formData, setFormData] = useState({
    matricula: "",
    marca: "",
    modelo: "",
    color: "",
    fecha_matriculacion: "",
    kilometros: "",
    combustible: "Gasolina",
    empleado_id: "",
    fecha_compra: "",
    precio_compra: "",
    observaciones: "",
    extras: "",
    donante: false,
    alquiler: false,
    fecha_inicio_alquiler: "",
    fecha_fin_alquiler: "",
    importe_anual: "",
    compania: "",
    kms_anuales: "",
  })
  const [viatSeleccionada, setViatSeleccionada] = useState<number | null>(null)
  const [observacionesViat, setObservacionesViat] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mostrarAlquiler, setMostrarAlquiler] = useState(false)

  useEffect(() => {
    cargarEmpleados()
  }, [])

  const cargarEmpleados = async () => {
    try {
      const empleadosData = await obtenerEmpleados()
      setEmpleados(empleadosData.filter((emp) => emp.activo))
    } catch (error) {
      console.error("Error al cargar empleados:", error)
      setError("Error al cargar la lista de empleados")
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    if (name === "alquiler") {
      setMostrarAlquiler(checked || false)
    }
  }

  const handleViatChange = (viatId: number | null, observaciones?: string) => {
    setViatSeleccionada(viatId)
    setObservacionesViat(observaciones || "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Crear FormData para enviar a la acción del servidor
      const formDataToSend = new FormData()
      
      // Añadir todos los campos del formulario
      formDataToSend.append("matricula", formData.matricula)
      formDataToSend.append("marca", formData.marca)
      formDataToSend.append("modelo", formData.modelo)
      formDataToSend.append("color", formData.color)
      // Usar fecha de matriculación si está disponible
      formDataToSend.append("fechamatriculacion", formData.fecha_matriculacion)
      formDataToSend.append("kms", formData.kilometros)
      formDataToSend.append("combustible", formData.combustible)
      formDataToSend.append("extras", formData.extras)
      formDataToSend.append("donante", formData.donante ? "on" : "")
      formDataToSend.append("alquiler", formData.alquiler ? "on" : "")
      formDataToSend.append("preciocompra", formData.precio_compra)
      formDataToSend.append("empleado_id", formData.empleado_id)
      formDataToSend.append("fecha_asignacion", formData.fecha_compra)
      formDataToSend.append("observaciones_asignacion", formData.observaciones)
      
      // Datos de alquiler si aplica
      if (formData.alquiler) {
        formDataToSend.append("fecha_inicio", formData.fecha_inicio_alquiler)
        formDataToSend.append("fecha_fin", formData.fecha_fin_alquiler)
        formDataToSend.append("importe_anual", formData.importe_anual)
        formDataToSend.append("compania", formData.compania)
        formDataToSend.append("kms_anuales", formData.kms_anuales)
      }

      const resultado = await crearCoche(formDataToSend)

      if (resultado.success) {
        router.push("/coches")
      } else {
        setError(resultado.error || "Error al crear el coche")
      }
    } catch (error) {
      console.error("Error al crear coche:", error)
      setError("Error inesperado al crear el coche")
    } finally {
      setIsLoading(false)
    }
  }

  const empleadoSeleccionado = formData.empleado_id ? Number.parseInt(formData.empleado_id) : null

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Nuevo Coche</h1>
        <p className="text-gray-600">Añadir un nuevo vehículo a la flota</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información básica del coche */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Información del Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="matricula">Matrícula *</Label>
                  <Input
                    id="matricula"
                    name="matricula"
                    value={formData.matricula}
                    onChange={handleInputChange}
                    placeholder="1234ABC"
                    required
                    className="uppercase"
                  />
                </div>
                <div>
                  <Label htmlFor="marca">Marca *</Label>
                  <Input
                    id="marca"
                    name="marca"
                    value={formData.marca}
                    onChange={handleInputChange}
                    placeholder="Toyota"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="modelo">Modelo *</Label>
                  <Input
                    id="modelo"
                    name="modelo"
                    value={formData.modelo}
                    onChange={handleInputChange}
                    placeholder="Corolla"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    placeholder="Blanco"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_matriculacion">Fecha de Matriculación</Label>
                  <Input
                    id="fecha_matriculacion"
                    name="fecha_matriculacion"
                    type="date"
                    value={formData.fecha_matriculacion}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="kilometros">Kilómetros</Label>
                  <Input
                    id="kilometros"
                    name="kilometros"
                    type="number"
                    value={formData.kilometros}
                    onChange={handleInputChange}
                    placeholder="50000"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="combustible">Combustible</Label>
                <select
                  id="combustible"
                  name="combustible"
                  value={formData.combustible}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Gasolina">Gasolina</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Eléctrico">Eléctrico</option>
                  <option value="GLP">GLP</option>
                  <option value="GNC">GNC</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Asignación y detalles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Asignación y Detalles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="empleado_id">Empleado Asignado</Label>
                <select
                  id="empleado_id"
                  name="empleado_id"
                  value={formData.empleado_id}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sin asignar</option>
                  {empleados.map((empleado) => (
                    <option key={empleado.id} value={empleado.id}>
                      {empleado.nombre} {empleado.apellidos}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_compra">Fecha de Compra</Label>
                  <Input
                    id="fecha_compra"
                    name="fecha_compra"
                    type="date"
                    value={formData.fecha_compra}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="precio_compra">Precio de Compra (€)</Label>
                  <Input
                    id="precio_compra"
                    name="precio_compra"
                    type="number"
                    step="0.01"
                    value={formData.precio_compra}
                    onChange={handleInputChange}
                    placeholder="15000.00"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="extras">Extras</Label>
                <Textarea
                  id="extras"
                  name="extras"
                  value={formData.extras}
                  onChange={handleInputChange}
                  placeholder="Aire acondicionado, GPS, etc."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="donante"
              name="donante"
              checked={formData.donante}
              onChange={handleInputChange}
              className="rounded border-gray-300"
            />
            <Label htmlFor="donante">Vehículo donante</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="alquiler"
              name="alquiler"
              checked={formData.alquiler}
              onChange={handleInputChange}
              className="rounded border-gray-300"
            />
            <Label htmlFor="alquiler">Vehículo de alquiler</Label>
          </div>

          {mostrarAlquiler && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Datos del Alquiler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fecha_inicio_alquiler">Fecha Inicio</Label>
                    <Input
                      id="fecha_inicio_alquiler"
                      name="fecha_inicio_alquiler"
                      type="date"
                      value={formData.fecha_inicio_alquiler}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fecha_fin_alquiler">Fecha Fin</Label>
                    <Input
                      id="fecha_fin_alquiler"
                      name="fecha_fin_alquiler"
                      type="date"
                      value={formData.fecha_fin_alquiler}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="importe_anual">Importe Anual (€)</Label>
                    <Input
                      id="importe_anual"
                      name="importe_anual"
                      type="number"
                      step="0.01"
                      value={formData.importe_anual}
                      onChange={handleInputChange}
                      placeholder="12000.00"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="kms_anuales">Kilómetros Anuales</Label>
                    <Input
                      id="kms_anuales"
                      name="kms_anuales"
                      type="number"
                      value={formData.kms_anuales}
                      onChange={handleInputChange}
                      placeholder="20000"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="compania">Compañía</Label>
                  <Input
                    id="compania"
                    name="compania"
                    value={formData.compania}
                    onChange={handleInputChange}
                    placeholder="Nombre de la compañía de alquiler"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Gestión de tarjetas y seguros - Solo disponible después de crear el vehículo */}
        {/*
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SolredManager empleadoId={empleadoSeleccionado} isEditing={true} />
          <SeguroManager empleadoId={empleadoSeleccionado} isEditing={true} />
          <ViatManager
            empleadoId={empleadoSeleccionado}
            isEditing={true}
            onViatChange={handleViatChange}
            showEmployeeAssignment={false}
          />
        </div>
        */}

        {/* Botones de acción */}
        <div className="flex gap-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => router.push("/coches")} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !formData.matricula || !formData.marca || !formData.modelo}
            className="flex-1"
          >
            {isLoading ? "Creando..." : "Crear Coche"}
          </Button>
        </div>
      </form>
    </div>
  )
}
