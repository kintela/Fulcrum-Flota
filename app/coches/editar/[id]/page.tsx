"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Car, Save } from "lucide-react"
import { editarCoche, obtenerCoche } from "./actions"
import { obtenerEmpleados } from "@/app/actions/empleados"
import { SolredManager } from "@/components/solred-manager"
import { ViatManager } from "@/components/viat-manager"
import { ITVManager } from "@/components/itv-manager"
import { SeguroManager } from "@/components/seguro-manager"
import { FotosManager } from "@/components/fotos-manager"

interface Empleado {
  id: number
  nombre: string
  apellidos: string
  activo: boolean
}

interface Coche {
  matricula: string
  marca: string
  modelo: string
  color?: string
  fechamatriculacion?: string
  kms: number
  kw?: number
  cv?: number
  cc?: number
  combustible: string
  extras?: string
  donante: boolean
  asignadoa?: string
  alquiler: boolean
  preciocompra?: number
  empleado_id?: number
  fecha_asignacion?: string
  observaciones_asignacion?: string
  fecha_inicio?: string
  fecha_fin?: string
  importe_anual?: number
  compania?: string
  kms_anuales?: number
}

export default function EditarCochePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [coche, setCoche] = useState<Coche | null>(null)
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAlquiler, setIsAlquiler] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [params.id])

  useEffect(() => {
    if (coche) {
      setIsAlquiler(coche.alquiler)
    }
  }, [coche])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)

      // Cargar datos del coche
      const cocheData = await obtenerCoche(params.id)
      if (!cocheData) {
        setError("Coche no encontrado")
        return
      }

      setCoche(cocheData)

      // Cargar empleados
      const empleadosData = await obtenerEmpleados()
      setEmpleados(empleadosData)
    } catch (error) {
      console.error("Error al cargar datos:", error)
      setError("Error al cargar los datos del coche")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
      const resultado = await editarCoche(params.id, formData)

      if (resultado.success) {
        router.push("/coches")
      } else {
        setError(resultado.error || "Error al actualizar el coche")
      }
    } catch (error) {
      console.error("Error al guardar:", error)
      setError("Error inesperado al guardar el coche")
    } finally {
      setSaving(false)
    }
  }

  const handleAlquilerChange = (checked: boolean) => {
    setIsAlquiler(checked)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando datos del coche...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !coche) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push("/coches")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Coches
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!coche) return null

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={() => router.push("/coches")} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div className="flex items-center space-x-2">
            <Car className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">Editar Coche - {coche.matricula}</h1>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="matricula">Matrícula *</Label>
                <Input id="matricula" name="matricula" defaultValue={coche.matricula} required className="uppercase" />
              </div>
              <div>
                <Label htmlFor="marca">Marca *</Label>
                <Input id="marca" name="marca" defaultValue={coche.marca} required />
              </div>
              <div>
                <Label htmlFor="modelo">Modelo *</Label>
                <Input id="modelo" name="modelo" defaultValue={coche.modelo} required />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input id="color" name="color" defaultValue={coche.color || ""} />
              </div>
              <div>
                <Label htmlFor="fechamatriculacion">Fecha Matriculación</Label>
                <Input
                  id="fechamatriculacion"
                  name="fechamatriculacion"
                  type="date"
                  defaultValue={coche.fechamatriculacion || ""}
                />
              </div>
              <div>
                <Label htmlFor="kms">Kilómetros</Label>
                <Input id="kms" name="kms" type="number" min="0" defaultValue={coche.kms || 0} />
              </div>
              <div>
                <Label htmlFor="kw">Potencia (kW)</Label>
                <Input id="kw" name="kw" type="number" min="0" defaultValue={coche.kw || ""} />
              </div>
              <div>
                <Label htmlFor="cv">Potencia (CV)</Label>
                <Input id="cv" name="cv" type="number" min="0" defaultValue={coche.cv || ""} />
              </div>
              <div>
                <Label htmlFor="cc">Cilindrada (cc)</Label>
                <Input id="cc" name="cc" type="number" min="0" defaultValue={coche.cc || ""} />
              </div>
              <div>
                <Label htmlFor="combustible">Combustible</Label>
                <select
                  id="combustible"
                  name="combustible"
                  defaultValue={coche.combustible || "Gasolina"}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Gasolina">Gasolina</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Hibrido">Híbrido</option>
                  <option value="Electrico">Eléctrico</option>
                  <option value="GLP">GLP</option>
                  <option value="GNC">GNC</option>
                </select>
              </div>
              <div>
                <Label htmlFor="preciocompra">Precio Compra (€)</Label>
                <Input
                  id="preciocompra"
                  name="preciocompra"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={coche.preciocompra || ""}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="extras">Extras</Label>
              <Textarea
                id="extras"
                name="extras"
                defaultValue={coche.extras || ""}
                placeholder="Describe los extras del vehículo..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Checkbox id="donante" name="donante" defaultChecked={coche.donante} />
                <Label htmlFor="donante">Vehículo donante</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="alquiler"
                  name="alquiler"
                  defaultChecked={coche.alquiler}
                  onCheckedChange={handleAlquilerChange}
                />
                <Label htmlFor="alquiler">Vehículo de alquiler</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAlquiler && (
          <Card>
            <CardHeader>
              <CardTitle>Datos del Alquiler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
                  <Input id="fecha_inicio" name="fecha_inicio" type="date" defaultValue={coche.fecha_inicio || ""} />
                </div>
                <div>
                  <Label htmlFor="fecha_fin">Fecha Fin</Label>
                  <Input id="fecha_fin" name="fecha_fin" type="date" defaultValue={coche.fecha_fin || ""} />
                </div>
                <div>
                  <Label htmlFor="importe_anual">Importe Anual (€)</Label>
                  <Input
                    id="importe_anual"
                    name="importe_anual"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={coche.importe_anual || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="compania">Compañía</Label>
                  <Input
                    id="compania"
                    name="compania"
                    defaultValue={coche.compania || ""}
                    placeholder="Nombre de la compañía de alquiler"
                  />
                </div>
                <div>
                  <Label htmlFor="kms_anuales">Kilómetros Anuales</Label>
                  <Input
                    id="kms_anuales"
                    name="kms_anuales"
                    type="number"
                    min="0"
                    defaultValue={coche.kms_anuales || ""}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Asignación de Empleado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="empleado_id">Empleado Asignado</Label>
                <select
                  id="empleado_id"
                  name="empleado_id"
                  defaultValue={coche.empleado_id?.toString() || "0"}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="0">Sin asignar</option>
                  {empleados
                    .filter((emp) => emp.activo)
                    .map((empleado) => (
                      <option key={empleado.id} value={empleado.id.toString()}>
                        {empleado.nombre} {empleado.apellidos}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label htmlFor="fecha_asignacion">Fecha Asignación</Label>
                <Input
                  id="fecha_asignacion"
                  name="fecha_asignacion"
                  type="date"
                  defaultValue={coche.fecha_asignacion || ""}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="observaciones_asignacion">Observaciones de Asignación</Label>
              <Textarea
                id="observaciones_asignacion"
                name="observaciones_asignacion"
                defaultValue={coche.observaciones_asignacion || ""}
                placeholder="Observaciones sobre la asignación..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <SolredManager matricula={coche.matricula} isEditing={true} />

        <ViatManager empleadoId={coche.empleado_id} showEmployeeAssignment={false} isEditing={true} />

        <ITVManager matricula={coche.matricula} isEditing={true} />

        <SeguroManager matricula={coche.matricula} isEditing={true} />

        <FotosManager matricula={coche.matricula} isEditing={true} />

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.push("/coches")} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  )
}
