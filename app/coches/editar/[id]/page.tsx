"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import {
  obtenerCoche,
  editarCoche,
  guardarSeccionBasica,
  guardarSeccionAlquiler,
  guardarSeccionAsignacion,
} from "./actions"
import { supabase } from "@/lib/supabase"
import { SolredManager } from "@/components/solred-manager"
import { ViatManager } from "@/components/viat-manager"
import { ItvManager } from "@/components/itv-manager"
import { SeguroManager } from "@/components/seguro-manager"
import { FotosManager } from "@/components/fotos-manager"

interface Coche {
  id: number
  matricula: string
  marca: string
  modelo: string
  color: string
  combustible: string
  fecha_matriculacion: string
  kms: number
  precio_compra: number
  fecha_compra: string
  observaciones?: string
  vehiculo_alquiler: boolean
  empleado_id?: number
  fecha_inicio?: string
  fecha_fin?: string
  importe_anual?: number
  compania?: string
  kms_anuales?: number
}

interface Empleado {
  id: number
  nombre: string
  apellidos: string
}

export default function EditarCochePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [coche, setCoche] = useState<Coche | null>(null)
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [isAlquiler, setIsAlquiler] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingBasica, setSavingBasica] = useState(false)
  const [savingAlquiler, setSavingAlquiler] = useState(false)
  const [savingAsignacion, setSavingAsignacion] = useState(false)

  useEffect(() => {
    async function cargarDatos() {
      try {
        // Cargar datos del coche
        const cocheData = await obtenerCoche(params.id)
        if (cocheData) {
          setCoche(cocheData)
          setIsAlquiler(cocheData.vehiculo_alquiler)
        }

        // Cargar empleados
        const { data: empleadosData, error } = await supabase
          .from("empleados")
          .select("id, nombre, apellidos")
          .order("nombre")

        if (error) {
          console.error("Error al cargar empleados:", error)
        } else {
          setEmpleados(empleadosData || [])
        }
      } catch (error) {
        console.error("Error al cargar datos:", error)
        toast({
          title: "Error",
          description: "Error al cargar los datos del coche",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    cargarDatos()
  }, [params.id])

  const recargarCoche = async () => {
    const cocheData = await obtenerCoche(params.id)
    if (cocheData) {
      setCoche(cocheData)
      setIsAlquiler(cocheData.vehiculo_alquiler)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await editarCoche(formData)

      if (result.success) {
        toast({
          title: "Éxito",
          description: result.message,
        })
        router.push("/coches")
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error al actualizar el coche",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleGuardarBasica = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingBasica(true)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await guardarSeccionBasica(formData)

      if (result.success) {
        toast({
          title: "Éxito",
          description: result.message,
        })
        await recargarCoche()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error al guardar la información básica",
        variant: "destructive",
      })
    } finally {
      setSavingBasica(false)
    }
  }

  const handleGuardarAlquiler = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingAlquiler(true)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await guardarSeccionAlquiler(formData)

      if (result.success) {
        toast({
          title: "Éxito",
          description: result.message,
        })
        await recargarCoche()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error al guardar los datos del alquiler",
        variant: "destructive",
      })
    } finally {
      setSavingAlquiler(false)
    }
  }

  const handleGuardarAsignacion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingAsignacion(true)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await guardarSeccionAsignacion(formData)

      if (result.success) {
        toast({
          title: "Éxito",
          description: result.message,
        })
        await recargarCoche()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error al guardar la asignación",
        variant: "destructive",
      })
    } finally {
      setSavingAsignacion(false)
    }
  }

  if (loading) {
    return <div className="p-6">Cargando...</div>
  }

  if (!coche) {
    return <div className="p-6">Coche no encontrado</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Editar Coche</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Volver
        </Button>
      </div>

      {/* Información Básica */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Información Básica</CardTitle>
          <form onSubmit={handleGuardarBasica}>
            <input type="hidden" name="id" value={coche.id} />
            <input type="hidden" name="matricula" value={coche.matricula} />
            <input type="hidden" name="marca" value={coche.marca} />
            <input type="hidden" name="modelo" value={coche.modelo} />
            <input type="hidden" name="color" value={coche.color} />
            <input type="hidden" name="combustible" value={coche.combustible} />
            <input type="hidden" name="fecha_matriculacion" value={coche.fecha_matriculacion} />
            <input type="hidden" name="kms" value={coche.kms} />
            <input type="hidden" name="precio_compra" value={coche.precio_compra} />
            <input type="hidden" name="fecha_compra" value={coche.fecha_compra} />
            <input type="hidden" name="observaciones" value={coche.observaciones || ""} />
            <Button type="submit" size="sm" disabled={savingBasica}>
              {savingBasica ? "Guardando..." : "Guardar"}
            </Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="matricula">Matrícula</Label>
              <Input id="matricula" name="matricula" defaultValue={coche.matricula} required />
            </div>
            <div>
              <Label htmlFor="marca">Marca</Label>
              <Input id="marca" name="marca" defaultValue={coche.marca} required />
            </div>
            <div>
              <Label htmlFor="modelo">Modelo</Label>
              <Input id="modelo" name="modelo" defaultValue={coche.modelo} required />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input id="color" name="color" defaultValue={coche.color} required />
            </div>
            <div>
              <Label htmlFor="combustible">Combustible</Label>
              <Select name="combustible" defaultValue={coche.combustible}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona combustible" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasolina">Gasolina</SelectItem>
                  <SelectItem value="diesel">Diésel</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                  <SelectItem value="electrico">Eléctrico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fecha_matriculacion">Fecha de Matriculación</Label>
              <Input
                id="fecha_matriculacion"
                name="fecha_matriculacion"
                type="date"
                defaultValue={coche.fecha_matriculacion}
                required
              />
            </div>
            <div>
              <Label htmlFor="kms">Kilómetros</Label>
              <Input id="kms" name="kms" type="number" defaultValue={coche.kms} required />
            </div>
            <div>
              <Label htmlFor="precio_compra">Precio de Compra (€)</Label>
              <Input
                id="precio_compra"
                name="precio_compra"
                type="number"
                step="0.01"
                defaultValue={coche.precio_compra}
                required
              />
            </div>
            <div>
              <Label htmlFor="fecha_compra">Fecha de Compra</Label>
              <Input id="fecha_compra" name="fecha_compra" type="date" defaultValue={coche.fecha_compra} required />
            </div>
          </div>
          <div>
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" name="observaciones" defaultValue={coche.observaciones || ""} rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Datos del Alquiler */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Datos del Alquiler</CardTitle>
          <form onSubmit={handleGuardarAlquiler}>
            <input type="hidden" name="id" value={coche.id} />
            <input type="hidden" name="matricula" value={coche.matricula} />
            <input type="hidden" name="vehiculo_alquiler" value={isAlquiler ? "on" : "off"} />
            <input type="hidden" name="fecha_inicio" value={coche.fecha_inicio || ""} />
            <input type="hidden" name="fecha_fin" value={coche.fecha_fin || ""} />
            <input type="hidden" name="importe_anual" value={coche.importe_anual || ""} />
            <input type="hidden" name="compania" value={coche.compania || ""} />
            <input type="hidden" name="kms_anuales" value={coche.kms_anuales || ""} />
            <Button type="submit" size="sm" disabled={savingAlquiler}>
              {savingAlquiler ? "Guardando..." : "Guardar"}
            </Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="vehiculo_alquiler"
              name="vehiculo_alquiler"
              checked={isAlquiler}
              onCheckedChange={(checked) => setIsAlquiler(checked as boolean)}
            />
            <Label htmlFor="vehiculo_alquiler">Vehículo de Alquiler</Label>
          </div>

          {isAlquiler && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                  step="0.01"
                  defaultValue={coche.importe_anual || ""}
                />
              </div>
              <div>
                <Label htmlFor="compania">Compañía</Label>
                <Input
                  id="compania"
                  name="compania"
                  placeholder="Nombre de la compañía de alquiler"
                  defaultValue={coche.compania || "N/A"}
                />
              </div>
              <div>
                <Label htmlFor="kms_anuales">Kilómetros Anuales</Label>
                <Input id="kms_anuales" name="kms_anuales" type="number" defaultValue={coche.kms_anuales || "0"} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asignación de Empleado */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Asignación de Empleado</CardTitle>
          <form onSubmit={handleGuardarAsignacion}>
            <input type="hidden" name="id" value={coche.id} />
            <input type="hidden" name="empleado_id" value={coche.empleado_id || ""} />
            <Button type="submit" size="sm" disabled={savingAsignacion}>
              {savingAsignacion ? "Guardando..." : "Guardar"}
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="empleado_id">Empleado Asignado</Label>
            <Select name="empleado_id" defaultValue={coche.empleado_id?.toString() || "0"}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un empleado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sin asignar</SelectItem>
                {empleados.map((empleado) => (
                  <SelectItem key={empleado.id} value={empleado.id.toString()}>
                    {empleado.nombre} {empleado.apellidos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Gestión de Fotos */}
      <Card>
        <CardHeader>
          <CardTitle>Fotos del Vehículo</CardTitle>
        </CardHeader>
        <CardContent>
          <FotosManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      {/* Gestión SOLRED */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión SOLRED</CardTitle>
        </CardHeader>
        <CardContent>
          <SolredManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      {/* Gestión ViaT */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión ViaT</CardTitle>
        </CardHeader>
        <CardContent>
          <ViatManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      {/* Gestión ITV */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión ITV</CardTitle>
        </CardHeader>
        <CardContent>
          <ItvManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      {/* Gestión Seguros */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Seguros</CardTitle>
        </CardHeader>
        <CardContent>
          <SeguroManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      {/* Formulario principal para guardar todo */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="id" value={coche.id} />
        <input type="hidden" name="matricula" value={coche.matricula} />
        <input type="hidden" name="marca" value={coche.marca} />
        <input type="hidden" name="modelo" value={coche.modelo} />
        <input type="hidden" name="color" value={coche.color} />
        <input type="hidden" name="combustible" value={coche.combustible} />
        <input type="hidden" name="fecha_matriculacion" value={coche.fecha_matriculacion} />
        <input type="hidden" name="kms" value={coche.kms} />
        <input type="hidden" name="precio_compra" value={coche.precio_compra} />
        <input type="hidden" name="fecha_compra" value={coche.fecha_compra} />
        <input type="hidden" name="observaciones" value={coche.observaciones || ""} />
        <input type="hidden" name="vehiculo_alquiler" value={isAlquiler ? "on" : "off"} />
        <input type="hidden" name="empleado_id" value={coche.empleado_id || ""} />
        {isAlquiler && (
          <>
            <input type="hidden" name="fecha_inicio" value={coche.fecha_inicio || ""} />
            <input type="hidden" name="fecha_fin" value={coche.fecha_fin || ""} />
            <input type="hidden" name="importe_anual" value={coche.importe_anual || ""} />
            <input type="hidden" name="compania" value={coche.compania || "N/A"} />
            <input type="hidden" name="kms_anuales" value={coche.kms_anuales || "0"} />
          </>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar Todo"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
