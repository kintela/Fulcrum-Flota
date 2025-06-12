"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { crearCoche } from "./actions"
import { obtenerEmpleados } from "@/app/actions/empleados"
import Link from "next/link"
import { ArrowLeft } from 'lucide-react'
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FotosManager } from "@/components/fotos-manager"

export default function NuevoCochePage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [empleados, setEmpleados] = useState<any[]>([])
  const [esAlquiler, setEsAlquiler] = useState(false)
  const [esDonante, setEsDonante] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function cargarEmpleados() {
      try {
        const data = await obtenerEmpleados()
        setEmpleados(data)
      } catch (error) {
        console.error("Error al cargar empleados:", error)
      }
    }
    cargarEmpleados()
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(event.currentTarget)

    // Agregar los valores de los checkboxes controlados
    if (esDonante) {
      formData.set("donante", "on")
    }
    if (esAlquiler) {
      formData.set("alquiler", "on")
    }

    try {
      const result = await crearCoche(formData)

      if (result.success) {
        router.push("/coches")
      } else {
        setError(result.error || "Error al crear el coche")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Error inesperado al crear el coche")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Link href="/coches" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver a Coches
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nuevo Coche</h1>
            <p className="text-gray-600">Registra un nuevo vehículo en la flota</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información del Vehículo</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="matricula">Matrícula *</Label>
                  <Input
                    id="matricula"
                    name="matricula"
                    placeholder="1234ABC"
                    required
                    maxLength={20}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="marca">Marca *</Label>
                  <Input id="marca" name="marca" placeholder="Toyota" required maxLength={50} className="mt-1" />
                </div>

                <div>
                  <Label htmlFor="modelo">Modelo *</Label>
                  <Input id="modelo" name="modelo" placeholder="Corolla" required maxLength={50} className="mt-1" />
                </div>

                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" placeholder="Blanco" maxLength={30} className="mt-1" />
                </div>

                <div>
                  <Label htmlFor="fechamatriculacion">Fecha de Matriculación</Label>
                  <Input id="fechamatriculacion" name="fechamatriculacion" type="date" className="mt-1" />
                </div>

                <div>
                  <Label htmlFor="combustible">Combustible</Label>
                  <select
                    id="combustible"
                    name="combustible"
                    defaultValue="Gasolina"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Gasolina">Gasolina</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Híbrido">Híbrido</option>
                    <option value="Eléctrico">Eléctrico</option>
                    <option value="GLP">GLP</option>
                  </select>
                </div>
              </div>

              {/* Información técnica */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Información Técnica</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="kms">Kilómetros</Label>
                    <Input
                      id="kms"
                      name="kms"
                      type="number"
                      placeholder="0"
                      min="0"
                      defaultValue="0"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="kw">Potencia (kW)</Label>
                    <Input id="kw" name="kw" type="number" placeholder="75" min="0" className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="cv">Potencia (CV)</Label>
                    <Input id="cv" name="cv" type="number" placeholder="102" min="0" className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="cc">Cilindrada (cc)</Label>
                    <Input id="cc" name="cc" type="number" placeholder="1600" min="0" className="mt-1" />
                  </div>
                </div>
              </div>

              {/* Información económica */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Información Económica</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preciocompra">Precio de Compra (€)</Label>
                    <Input
                      id="preciocompra"
                      name="preciocompra"
                      type="number"
                      step="0.01"
                      placeholder="15000.00"
                      min="0"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="asignadoa">Asignado a</Label>
                    <select
                      id="asignadoa"
                      name="asignadoa"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Sin asignar</option>
                      {empleados.map((empleado) => (
                        <option key={empleado.id} value={`${empleado.nombre} ${empleado.apellidos}`}>
                          {empleado.nombre} {empleado.apellidos}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Opciones especiales */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Opciones Especiales</h3>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="donante"
                      checked={esDonante}
                      onCheckedChange={(checked) => setEsDonante(!!checked)}
                    />
                    <Label htmlFor="donante">Vehículo donante</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="alquiler"
                      checked={esAlquiler}
                      onCheckedChange={(checked) => setEsAlquiler(!!checked)}
                    />
                    <Label htmlFor="alquiler">Vehículo de alquiler</Label>
                  </div>
                </div>
              </div>

              {/* Asignación de empleado (solo si no es alquiler) */}
              {!esAlquiler && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Asignación de Empleado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="empleado_id">Empleado Asignado</Label>
                      <select
                        id="empleado_id"
                        name="empleado_id"
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

                    <div>
                      <Label htmlFor="fecha_asignacion">Fecha de Asignación</Label>
                      <Input id="fecha_asignacion" name="fecha_asignacion" type="date" className="mt-1" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="observaciones_asignacion">Observaciones de Asignación</Label>
                    <Textarea
                      id="observaciones_asignacion"
                      name="observaciones_asignacion"
                      placeholder="Motivo de la asignación, condiciones especiales..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Extras */}
              <div className="border-t pt-6">
                <Label htmlFor="extras">Extras y Equipamiento</Label>
                <Textarea
                  id="extras"
                  name="extras"
                  placeholder="Aire acondicionado, navegador, sensores de aparcamiento..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Fotos del vehículo */}
              <div className="border-t pt-6">
                <FotosManager matricula="" isEditing={false} />
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-4 pt-6">
                <Link
                  href="/coches"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Link>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? "Creando..." : "Crear Coche"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
