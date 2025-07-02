"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SaveIcon, LoaderIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { FotosManager } from "@/components/fotos-manager"
import { SolredManager } from "@/components/solred-manager"
import { ITVManager } from "@/components/itv-manager"
import { SeguroManager } from "@/components/seguro-manager"
import { ViatManager } from "@/components/viat-manager"
import {
  obtenerCoche,
  editarCoche,
  guardarSeccionBasica,
  guardarSeccionAlquiler,
  guardarSeccionAsignacion,
} from "./actions"

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
  alquiler: boolean
  preciocompra?: number
  asignadoa?: string
  fechaasignacion?: string
  observacionesasignacion?: string
  fecha_inicio?: string
  fecha_fin?: string
  importe_anual?: number
  compania?: string
  kms_anuales?: number
}

interface EditarCochePageProps {
  params: {
    id: string
  }
}

export default function EditarCochePage({ params }: EditarCochePageProps) {
  const router = useRouter()
  const [coche, setCoche] = useState<Coche | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingBasica, setSavingBasica] = useState(false)
  const [savingAlquiler, setSavingAlquiler] = useState(false)
  const [savingAsignacion, setSavingAsignacion] = useState(false)
  const [isAlquiler, setIsAlquiler] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [params.id])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const data = await obtenerCoche(params.id)
      if (data) {
        setCoche(data)
        setIsAlquiler(data.alquiler || false)
      } else {
        toast({
          title: "Error",
          description: "No se pudo cargar la información del coche",
          variant: "destructive",
        })
        router.push("/coches")
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      const formData = new FormData(e.currentTarget)
      const result = await editarCoche(params.id, formData)

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Coche actualizado correctamente",
        })
        await cargarDatos()
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al actualizar el coche",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error inesperado al actualizar el coche",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleGuardarBasica = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSavingBasica(true)

    try {
      const formData = new FormData(e.currentTarget)
      const result = await guardarSeccionBasica(params.id, formData)

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Información básica guardada correctamente",
        })
        await cargarDatos()
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al guardar",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error inesperado",
        variant: "destructive",
      })
    } finally {
      setSavingBasica(false)
    }
  }

  const handleGuardarAlquiler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSavingAlquiler(true)

    try {
      const formData = new FormData(e.currentTarget)
      const result = await guardarSeccionAlquiler(params.id, formData)

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Datos del alquiler guardados correctamente",
        })
        await cargarDatos()
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al guardar",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error inesperado",
        variant: "destructive",
      })
    } finally {
      setSavingAlquiler(false)
    }
  }

  const handleGuardarAsignacion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSavingAsignacion(true)

    try {
      const formData = new FormData(e.currentTarget)
      const result = await guardarSeccionAsignacion(params.id, formData)

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Asignación guardada correctamente",
        })
        await cargarDatos()
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al guardar",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error inesperado",
        variant: "destructive",
      })
    } finally {
      setSavingAsignacion(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <LoaderIcon className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!coche) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Coche no encontrado</h1>
          <Button onClick={() => router.push("/coches")} className="mt-4">
            Volver a la lista
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Editar Coche</h1>
          <p className="text-muted-foreground">Matrícula: {coche.matricula}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/coches")}>
          Volver a la lista
        </Button>
      </div>

      {/* Información Básica */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Información Básica</CardTitle>
            <CardDescription>Datos principales del vehículo</CardDescription>
          </div>
          <Button
            type="submit"
            form="form-basica"
            disabled={savingBasica}
            size="sm"
            className="flex items-center gap-2"
          >
            {savingBasica ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
            Guardar
          </Button>
        </CardHeader>
        <CardContent>
          <form id="form-basica" onSubmit={handleGuardarBasica} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula *</Label>
                <Input
                  id="matricula"
                  name="matricula"
                  defaultValue={coche.matricula}
                  required
                  className="uppercase"
                  placeholder="1234ABC"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="marca">Marca *</Label>
                <Input id="marca" name="marca" defaultValue={coche.marca} required placeholder="Toyota" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo *</Label>
                <Input id="modelo" name="modelo" defaultValue={coche.modelo} required placeholder="Corolla" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input id="color" name="color" defaultValue={coche.color || ""} placeholder="Blanco" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechamatriculacion">Fecha de Matriculación</Label>
                <Input
                  id="fechamatriculacion"
                  name="fechamatriculacion"
                  type="date"
                  defaultValue={coche.fechamatriculacion || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kms">Kilómetros</Label>
                <Input id="kms" name="kms" type="number" defaultValue={coche.kms} min="0" placeholder="50000" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kw">Potencia (kW)</Label>
                <Input id="kw" name="kw" type="number" defaultValue={coche.kw || ""} min="0" placeholder="100" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cv">Potencia (CV)</Label>
                <Input id="cv" name="cv" type="number" defaultValue={coche.cv || ""} min="0" placeholder="136" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cc">Cilindrada (cc)</Label>
                <Input id="cc" name="cc" type="number" defaultValue={coche.cc || ""} min="0" placeholder="1600" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="combustible">Combustible</Label>
                <Select name="combustible" defaultValue={coche.combustible}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gasolina">Gasolina</SelectItem>
                    <SelectItem value="Diesel">Diesel</SelectItem>
                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                    <SelectItem value="Eléctrico">Eléctrico</SelectItem>
                    <SelectItem value="GLP">GLP</SelectItem>
                    <SelectItem value="GNC">GNC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preciocompra">Precio de Compra (€)</Label>
                <Input
                  id="preciocompra"
                  name="preciocompra"
                  type="number"
                  step="0.01"
                  defaultValue={coche.preciocompra || ""}
                  min="0"
                  placeholder="15000.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="extras">Extras</Label>
              <Textarea
                id="extras"
                name="extras"
                defaultValue={coche.extras || ""}
                placeholder="Aire acondicionado, GPS, etc."
                rows={3}
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="donante" name="donante" defaultChecked={coche.donante} />
                <Label htmlFor="donante">Vehículo donante</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="alquiler"
                  name="alquiler"
                  checked={isAlquiler}
                  onCheckedChange={(checked) => setIsAlquiler(checked as boolean)}
                />
                <Label htmlFor="alquiler">Vehículo de alquiler</Label>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Datos del Alquiler */}
      {isAlquiler && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Datos del Alquiler</CardTitle>
              <CardDescription>Información específica del contrato de alquiler</CardDescription>
            </div>
            <Button
              type="submit"
              form="form-alquiler"
              disabled={savingAlquiler}
              size="sm"
              className="flex items-center gap-2"
            >
              {savingAlquiler ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
              Guardar
            </Button>
          </CardHeader>
          <CardContent>
            <form id="form-alquiler" onSubmit={handleGuardarAlquiler} className="space-y-6">
              <input type="hidden" name="alquiler" value={isAlquiler ? "on" : ""} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
                  <Input id="fecha_inicio" name="fecha_inicio" type="date" defaultValue={coche.fecha_inicio || ""} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_fin">Fecha Fin</Label>
                  <Input id="fecha_fin" name="fecha_fin" type="date" defaultValue={coche.fecha_fin || ""} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="importe_anual">Importe Anual (€)</Label>
                  <Input
                    id="importe_anual"
                    name="importe_anual"
                    type="number"
                    step="0.01"
                    defaultValue={coche.importe_anual || ""}
                    min="0"
                    placeholder="12000.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compania">Compañía</Label>
                  <Input
                    id="compania"
                    name="compania"
                    defaultValue={coche.compania || ""}
                    placeholder="Nombre de la compañía de alquiler"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kms_anuales">Kilómetros Anuales</Label>
                  <Input
                    id="kms_anuales"
                    name="kms_anuales"
                    type="number"
                    defaultValue={coche.kms_anuales || ""}
                    min="0"
                    placeholder="20000"
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Asignación de Empleado */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Asignación de Empleado</CardTitle>
            <CardDescription>Asignar el vehículo a un empleado</CardDescription>
          </div>
          <Button
            type="submit"
            form="form-asignacion"
            disabled={savingAsignacion}
            size="sm"
            className="flex items-center gap-2"
          >
            {savingAsignacion ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
            Guardar
          </Button>
        </CardHeader>
        <CardContent>
          <form id="form-asignacion" onSubmit={handleGuardarAsignacion} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="empleado_id">Empleado</Label>
                <Select name="empleado_id" defaultValue={coche.asignadoa || "0"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin asignar</SelectItem>
                    {/* Aquí se cargarían los empleados desde la base de datos */}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_asignacion">Fecha de Asignación</Label>
                <Input
                  id="fecha_asignacion"
                  name="fecha_asignacion"
                  type="date"
                  defaultValue={coche.fechaasignacion || ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones_asignacion">Observaciones</Label>
              <Textarea
                id="observaciones_asignacion"
                name="observaciones_asignacion"
                defaultValue={coche.observacionesasignacion || ""}
                placeholder="Observaciones sobre la asignación"
                rows={3}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Gestión de Fotos */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Fotos</CardTitle>
          <CardDescription>Subir y gestionar fotos del vehículo</CardDescription>
        </CardHeader>
        <CardContent>
          <FotosManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      {/* Tarjetas SOLRED */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión SOLRED</CardTitle>
          <CardDescription>Asignar y gestionar tarjetas de combustible SOLRED</CardDescription>
        </CardHeader>
        <CardContent>
          <SolredManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      {/* Tarjetas ViaT */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión ViaT</CardTitle>
          <CardDescription>Asignar y gestionar tarjetas de peaje ViaT</CardDescription>
        </CardHeader>
        <CardContent>
          <ViatManager empleadoId={coche.asignadoa ? Number.parseInt(coche.asignadoa) : null} />
        </CardContent>
      </Card>

      {/* ITV */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión ITV</CardTitle>
          <CardDescription>Gestionar inspecciones técnicas del vehículo</CardDescription>
        </CardHeader>
        <CardContent>
          <ITVManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      {/* Seguros */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Seguros</CardTitle>
          <CardDescription>Gestionar pólizas de seguro del vehículo</CardDescription>
        </CardHeader>
        <CardContent>
          <SeguroManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      {/* Botón principal de guardado */}
      <div className="flex justify-end">
        <form onSubmit={handleSubmit} className="w-full">
          <input type="hidden" name="matricula" value={coche.matricula} />
          <input type="hidden" name="marca" value={coche.marca} />
          <input type="hidden" name="modelo" value={coche.modelo} />
          <input type="hidden" name="color" value={coche.color || ""} />
          <input type="hidden" name="fechamatriculacion" value={coche.fechamatriculacion || ""} />
          <input type="hidden" name="kms" value={coche.kms} />
          <input type="hidden" name="kw" value={coche.kw || ""} />
          <input type="hidden" name="cv" value={coche.cv || ""} />
          <input type="hidden" name="cc" value={coche.cc || ""} />
          <input type="hidden" name="combustible" value={coche.combustible} />
          <input type="hidden" name="extras" value={coche.extras || ""} />
          <input type="hidden" name="donante" value={coche.donante ? "on" : ""} />
          <input type="hidden" name="alquiler" value={isAlquiler ? "on" : ""} />
          <input type="hidden" name="preciocompra" value={coche.preciocompra || ""} />
          <input type="hidden" name="empleado_id" value={coche.asignadoa || ""} />
          <input type="hidden" name="fecha_asignacion" value={coche.fechaasignacion || ""} />
          <input type="hidden" name="observaciones_asignacion" value={coche.observacionesasignacion || ""} />
          {isAlquiler && (
            <>
              <input type="hidden" name="fecha_inicio" value={coche.fecha_inicio || ""} />
              <input type="hidden" name="fecha_fin" value={coche.fecha_fin || ""} />
              <input type="hidden" name="importe_anual" value={coche.importe_anual || ""} />
              <input type="hidden" name="compania" value={coche.compania || ""} />
              <input type="hidden" name="kms_anuales" value={coche.kms_anuales || ""} />
            </>
          )}

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? <LoaderIcon className="mr-2 h-4 w-4 animate-spin" /> : <SaveIcon className="mr-2 h-4 w-4" />}
            Guardar Todo
          </Button>
        </form>
      </div>
    </div>
  )
}
