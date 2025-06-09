"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { crearEmpleado } from "./actions"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NuevoEmpleadoPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(event.currentTarget)

    try {
      const result = await crearEmpleado(formData)

      if (result.success) {
        router.push("/empleados")
      } else {
        setError(result.error || "Error al crear el empleado")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Error inesperado al crear el empleado")
    } finally {
      setIsSubmitting(false)
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Nuevo Empleado</h1>
            <p className="text-gray-600">Registra un nuevo empleado en la empresa</p>
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
                  <Input id="nombre" name="nombre" placeholder="Juan" required maxLength={50} className="mt-1" />
                </div>

                <div>
                  <Label htmlFor="apellidos">Apellidos *</Label>
                  <Input
                    id="apellidos"
                    name="apellidos"
                    placeholder="Pérez García"
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
                    placeholder="juan.perez@empresa.com"
                    required
                    maxLength={100}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="movil">Móvil</Label>
                  <Input id="movil" name="movil" type="tel" placeholder="600123456" maxLength={20} className="mt-1" />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="contraseña">Contraseña *</Label>
                  <Input
                    id="contraseña"
                    name="contraseña"
                    type="password"
                    placeholder="Contraseña temporal"
                    required
                    minLength={6}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Mínimo 6 caracteres. El empleado podrá cambiarla cuando se implemente el sistema de login.
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
                  {isSubmitting ? "Creando..." : "Crear Empleado"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
