"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building2, CalendarDays, Edit2, Plus, Trash2 } from "lucide-react"
import {
  actualizarAlquiler,
  crearAlquiler,
  eliminarAlquiler,
  obtenerAlquileresPorMatricula,
} from "@/app/actions/alquileres"

interface Alquiler {
  id: number
  matricula: string
  fecha_inicio: string
  fecha_fin: string
  importe_anual: number
  compania: string
  kms_anuales?: number | null
  activo?: boolean | null
  numero_contrato?: string | null
  observaciones?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface AlquilerManagerProps {
  matricula: string
  isEditing?: boolean
}

type AlquilerFormData = {
  fecha_inicio: string
  fecha_fin: string
  importe_anual: number | undefined
  compania: string
  kms_anuales: number | undefined
  numero_contrato: string
  observaciones: string
  activo: boolean
}

const EMPTY_FORM: AlquilerFormData = {
  fecha_inicio: "",
  fecha_fin: "",
  importe_anual: undefined,
  compania: "",
  kms_anuales: undefined,
  numero_contrato: "",
  observaciones: "",
  activo: true,
}

export function AlquilerManager({ matricula, isEditing = false }: AlquilerManagerProps) {
  const [alquileres, setAlquileres] = useState<Alquiler[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAlquiler, setEditingAlquiler] = useState<Alquiler | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<AlquilerFormData>(EMPTY_FORM)

  useEffect(() => {
    if (matricula && matricula !== "undefined") {
      cargarAlquileres()
    } else {
      setIsLoading(false)
    }
  }, [matricula])

  useEffect(() => {
    if (editingAlquiler) {
      setFormData({
        fecha_inicio: editingAlquiler.fecha_inicio || "",
        fecha_fin: editingAlquiler.fecha_fin || "",
        importe_anual:
          editingAlquiler.importe_anual !== null && editingAlquiler.importe_anual !== undefined
            ? Number(editingAlquiler.importe_anual)
            : undefined,
        compania: editingAlquiler.compania || "",
        kms_anuales:
          editingAlquiler.kms_anuales !== null && editingAlquiler.kms_anuales !== undefined
            ? Number(editingAlquiler.kms_anuales)
            : undefined,
        numero_contrato: editingAlquiler.numero_contrato || "",
        observaciones: editingAlquiler.observaciones || "",
        activo: editingAlquiler.activo !== false,
      })
      return
    }

    setFormData(EMPTY_FORM)
  }, [editingAlquiler])

  async function cargarAlquileres() {
    try {
      setIsLoading(true)
      const response = await obtenerAlquileresPorMatricula(matricula)

      if (response.success) {
        setAlquileres(response.data)
        setError(null)
      } else {
        setAlquileres([])
        setError(response.error || "Error al cargar los alquileres")
      }
    } catch (error) {
      console.error("Error al cargar alquileres:", error)
      setAlquileres([])
      setError("Error al cargar los alquileres")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement

    if (type === "number") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.trim() === "" ? undefined : Number(value),
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!formData.fecha_inicio || !formData.fecha_fin || !formData.compania || formData.importe_anual === undefined) {
      setError("Fecha inicio, fecha fin, compañía e importe anual son obligatorios")
      setIsSubmitting(false)
      return
    }

    const payload = new FormData()
    payload.append("matricula", matricula)
    payload.append("fecha_inicio", formData.fecha_inicio)
    payload.append("fecha_fin", formData.fecha_fin)
    payload.append("compania", formData.compania)
    payload.append("importe_anual", String(formData.importe_anual))

    if (formData.kms_anuales !== undefined) {
      payload.append("kms_anuales", String(formData.kms_anuales))
    }

    if (formData.numero_contrato) {
      payload.append("numero_contrato", formData.numero_contrato)
    }

    if (formData.observaciones) {
      payload.append("observaciones", formData.observaciones)
    }

    if (formData.activo) {
      payload.append("activo", "on")
    }

    try {
      const result =
        editingAlquiler?.id != null ? await actualizarAlquiler(editingAlquiler.id, payload) : await crearAlquiler(payload)

      if (!result.success) {
        setError(result.error || "Error al guardar el alquiler")
        return
      }

      await cargarAlquileres()
      setShowForm(false)
      setEditingAlquiler(null)
    } catch (error) {
      console.error("Error al guardar alquiler:", error)
      setError("Error inesperado al guardar el alquiler")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEliminar(alquiler: Alquiler) {
    if (!confirm("¿Estás seguro de que quieres eliminar este alquiler?")) {
      return
    }

    try {
      const result = await eliminarAlquiler(alquiler.id, matricula)
      if (!result.success) {
        setError(result.error || "Error al eliminar el alquiler")
        return
      }

      await cargarAlquileres()
    } catch (error) {
      console.error("Error al eliminar alquiler:", error)
      setError("Error inesperado al eliminar el alquiler")
    }
  }

  function formatDate(dateString?: string | null) {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  function formatCurrency(value?: number | null) {
    if (value === null || value === undefined) return "-"
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(value))
  }

  function getEstadoBadge(alquiler: Alquiler) {
    const hoy = new Date()
    const fechaFin = alquiler.fecha_fin ? new Date(alquiler.fecha_fin) : null
    const vencido = fechaFin ? fechaFin < hoy : false

    if (alquiler.activo === false) {
      return <Badge variant="secondary">Inactivo</Badge>
    }

    if (vencido) {
      return <Badge variant="destructive">Vencido</Badge>
    }

    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Activo</Badge>
  }

  if (!matricula || matricula === "undefined") {
    return (
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="alquileres">
          <AccordionTrigger>
            <div className="flex items-center">
              <Building2 className="w-4 h-4 mr-2" />
              Alquileres
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-gray-500 text-center py-4">Guarda el coche primero para poder gestionar los alquileres</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="alquileres">
        <AccordionTrigger>
          <div className="flex items-center">
            <Building2 className="w-4 h-4 mr-2" />
            Alquileres
            {alquileres.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {alquileres.length}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {isEditing && (
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setEditingAlquiler(null)
                    setShowForm(true)
                    setError(null)
                  }}
                  className="flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo alquiler
                </Button>
              </div>
            )}

            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingAlquiler ? "Editar alquiler" : "Nuevo alquiler"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fecha_inicio">Fecha inicio *</Label>
                        <Input
                          id="fecha_inicio"
                          name="fecha_inicio"
                          type="date"
                          required
                          value={formData.fecha_inicio}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="fecha_fin">Fecha fin *</Label>
                        <Input
                          id="fecha_fin"
                          name="fecha_fin"
                          type="date"
                          required
                          value={formData.fecha_fin}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="compania">Compañía *</Label>
                        <Input
                          id="compania"
                          name="compania"
                          required
                          value={formData.compania}
                          onChange={handleInputChange}
                          className="mt-1"
                          placeholder="LeasePlan, ALD, Arval..."
                        />
                      </div>

                      <div>
                        <Label htmlFor="importe_anual">Importe anual (€) *</Label>
                        <Input
                          id="importe_anual"
                          name="importe_anual"
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={formData.importe_anual ?? ""}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="kms_anuales">Kms anuales</Label>
                        <Input
                          id="kms_anuales"
                          name="kms_anuales"
                          type="number"
                          min="0"
                          value={formData.kms_anuales ?? ""}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="numero_contrato">Número de contrato</Label>
                        <Input
                          id="numero_contrato"
                          name="numero_contrato"
                          value={formData.numero_contrato}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="observaciones">Observaciones</Label>
                      <Textarea
                        id="observaciones"
                        name="observaciones"
                        rows={3}
                        value={formData.observaciones}
                        onChange={handleInputChange}
                        className="mt-1"
                        placeholder="Condiciones, limitaciones, notas de renovación..."
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="alquiler_activo"
                        checked={formData.activo}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            activo: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor="alquiler_activo">Contrato activo</Label>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false)
                          setEditingAlquiler(null)
                          setError(null)
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Guardando..." : editingAlquiler ? "Actualizar" : "Crear"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <p className="text-center py-4">Cargando alquileres...</p>
            ) : alquileres.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay alquileres registrados para este vehículo</p>
            ) : (
              <div className="space-y-3">
                {alquileres.map((alquiler) => (
                  <Card key={alquiler.id} className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{alquiler.compania}</span>
                          {getEstadoBadge(alquiler)}
                          {alquiler.numero_contrato && (
                            <Badge variant="outline">Contrato {alquiler.numero_contrato}</Badge>
                          )}
                        </div>

                        <div className="text-sm flex items-center text-gray-700">
                          <CalendarDays className="w-3 h-3 mr-1" />
                          <span>
                            {formatDate(alquiler.fecha_inicio)} - {formatDate(alquiler.fecha_fin)}
                          </span>
                        </div>

                        <div className="text-sm">
                          <span className="font-medium">Importe anual:</span> {formatCurrency(alquiler.importe_anual)}
                        </div>

                        {alquiler.kms_anuales !== null && alquiler.kms_anuales !== undefined && (
                          <div className="text-sm">
                            <span className="font-medium">Kms anuales:</span> {alquiler.kms_anuales.toLocaleString()} km
                          </div>
                        )}

                        {alquiler.observaciones && <div className="text-sm text-gray-600">{alquiler.observaciones}</div>}
                      </div>

                      {isEditing && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingAlquiler(alquiler)
                              setShowForm(true)
                              setError(null)
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEliminar(alquiler)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
