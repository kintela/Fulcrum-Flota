"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { editarEmpleado, obtenerEmpleado } from "./actions"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface EditarEmpleadoPageProps {
  params: { id: string }
}

export default function EditarEmpleadoPage({ params }: EditarEmpleadoPageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [empleado, setEmpleado] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    async function cargarDatos() {
      if (!params.id || params.id === "undefined" || isNaN(Number(params.id))) {
        setError("ID de empleado no válido")
        setIsLoading(false)
        return
      }

      try {
        const empleadoData = await obtenerEmpleado(Number.parseInt(params.id))

        if (empleadoData) {
          setEmpleado(empleadoData)
        } else {
          setError(`No se encontró el empleado con ID ${params.id}`)
        }
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

    try {
      const result = await editarEmpleado(Number.parseInt(params.id), formData)

      if (result.success) {
        router.push("/empleados")
      } else {
        setError(result.error || "Error al actualizar el empleado")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Error inesperado al actualizar el empleado")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p>Cargando datos del empleado...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!empleado) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-red-600">{error || "No se encontró el empleado"}</p>
            <Link href="/empleados" className="text-blue-600 hover:underline mt-4 inline-block">
              Volver a la lista de empleados
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
          <Link href="/empleados" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver a Empleados
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Empleado</h1>
            <p className="text-gray-600">
              Modifica los datos de {empleado.nombre} {empleado.apellidos}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información del Empleado</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información personal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    defaultValue={empleado.nombre || ""}
                    required
                    maxLength={50}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="apellidos">Apellidos *</Label>
                  <Input
                    id="apellidos"
                    name="apellidos"
                    defaultValue={empleado.apellidos || ""}
                    required
                    maxLength={100}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={empleado.email || ""}
                    required
                    maxLength={100}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="movil">Móvil</Label>
                  <Input
                    id="movil"
                    name="movil"
                    type="tel"
                    defaultValue={empleado.movil || ""}
                    maxLength={20}
                    className="mt-1"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="contraseña">Nueva Contraseña</Label>
                  <Input
                    id="contraseña"
                    name="contraseña"
                    type="password"
                    placeholder="Dejar vacío para mantener la actual"
                    minLength={6}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Dejar vacío para mantener la contraseña actual. Si se introduce una nueva, debe tener mínimo 6
                    caracteres.
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-4 pt-6">
                <Link
                  href="/empleados"
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
