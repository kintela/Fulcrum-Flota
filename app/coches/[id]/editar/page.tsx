"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { editarCoche, obtenerCoche } from "./actions"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { obtenerEmpleados } from "@/app/actions/empleados"

interface EditarCochePageProps {
  params: { id: string }
}

export default function EditarCochePage({ params }: EditarCochePageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coche, setCoche] = useState<any>(null)
  const router = useRouter()
  const [empleados, setEmpleados] = useState<any[]>([])
  const [esAlquiler, setEsAlquiler] = useState(false)
  const [esDonante, setEsDonante] = useState(false)

  useEffect(() => {
    async function cargarDatos() {
      if (!params.id || params.id === "undefined") {
        setError("ID de coche no válido")
        setIsLoading(false)
        return
      }

      try {
        const [cocheData, empleadosData] = await Promise.all([obtenerCoche(params.id), obtenerEmpleados()])

        if (cocheData) {
          setCoche(cocheData)
          setEsAlquiler(cocheData.alquiler || false)
          setEsDonante(cocheData.donante || false)
        } else {
          setError(`No se encontró el coche con matrícula ${params.id}`)
        }

        setEmpleados(empleadosData)
      } catch (error) {
        console.error("Error al cargar datos:", error)
        setError("Error al cargar los datos")
      } finally {
        setIsLoading(false)
      }
    }

    cargarDatos()
  }, [params.id])

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
      const result = await editarCoche(params.id, formData)

      if (result.success) {
        router.push("/coches")
      } else {
        setError(result.error || "Error al actualizar el coche")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Error inesperado al actualizar el coche")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p>Cargando datos del coche...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!coche) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-red-600">{error || "No se encontró el coche"}</p>
            <Link href="/coches" className="text-blue-600 hover:underline mt-4 inline-block">
              Volver a la lista de coches
            </Link>
          </div>
        </div>
      </div>
    )
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
            <h1 className="text-3xl font-bold text-gray-900">Editar Coche</h1>
            <p className="text-gray-600">Modifica los datos del vehículo {coche.matricula}</p>
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
                    defaultValue={coche.matricula || ""}
                    required
                    maxLength={20}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="marca">Marca *</Label>
                  <Input
                    id="marca"
                    name="marca"
                    defaultValue={coche.marca || ""}
                    required
                    maxLength={50}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="modelo">Modelo *</Label>
                  <Input
                    id="modelo"
                    name="modelo"
                    defaultValue={coche.modelo || ""}
                    required
                    maxLength={50}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" defaultValue={coche.color || ""} maxLength={30} className="mt-1" />
                </div>

                <div>
                  <Label htmlFor="fechamatriculacion">Fecha de Matriculación</Label>
                  <Input
                    id="fechamatriculacion"
                    name="fechamatriculacion"
                    type="date"
                    defaultValue={coche.fechamatriculacion || ""}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="combustible">Combustible</Label>
                  <select
                    id="combustible"
                    name="combustible"
                    defaultValue={coche.combustible || "Gasolina"}
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
                    <Input id="kms" name="kms" type="number" defaultValue={coche.kms || 0} min="0" className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="kw">Potencia (kW)</Label>
                    <Input id="kw" name="kw" type="number" defaultValue={coche.kw || ""} min="0" className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="cv">Potencia (CV)</Label>
                    <Input id="cv" name="cv" type="number" defaultValue={coche.cv || ""} min="0" className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="cc">Cilindrada (cc)</Label>
                    <Input id="cc" name="cc" type="number" defaultValue={coche.cc || ""} min="0" className="mt-1" />
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
                      defaultValue={coche.preciocompra || ""}
                      min="0"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="asignadoa">Asignado a</Label>
                    <select
                      id="asignadoa"
                      name="asignadoa"
                      defaultValue={coche.asignadoa || ""}
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
                    <Checkbox id="donante" checked={esDonante} onChange={(e) => setEsDonante(e.target.checked)} />
                    <Label htmlFor="donante">Vehículo donante</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="alquiler" checked={esAlquiler} onChange={(e) => setEsAlquiler(e.target.checked)} />
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
                        defaultValue={coche.empleado_id || ""}
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
                      <Input
                        id="fecha_asignacion"
                        name="fecha_asignacion"
                        type="date"
                        defaultValue={coche.fecha_asignacion || ""}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="observaciones_asignacion">Observaciones de Asignación</Label>
                    <Textarea
                      id="observaciones_asignacion"
                      name="observaciones_asignacion"
                      defaultValue={coche.observaciones_asignacion || ""}
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
                  defaultValue={coche.extras || ""}
                  placeholder="Aire acondicionado, navegador, sensores de aparcamiento..."
                  className="mt-1"
                  rows={3}
                />
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
                  {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
