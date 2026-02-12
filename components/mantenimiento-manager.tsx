"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Plus, Edit2, Trash2, Wrench } from "lucide-react"
import {
  obtenerMantenimientosPorMatricula,
  crearMantenimiento,
  actualizarMantenimiento,
  eliminarMantenimiento,
} from "@/app/actions/mantenimientos"

interface Mantenimiento {
  id?: number
  matricula: string
  fecha_mantenimiento: string
  importe?: number | null
  fecha_proximo: string
  kms_mantenimiento?: number | null
  kms_proximo: number
  taller?: string | null
  observaciones?: string | null
}

interface MantenimientoManagerProps {
  matricula: string
  isEditing?: boolean
}

export function MantenimientoManager({ matricula, isEditing = false }: MantenimientoManagerProps) {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMantenimiento, setEditingMantenimiento] = useState<Mantenimiento | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<Mantenimiento>>({
    fecha_mantenimiento: "",
    importe: undefined,
    fecha_proximo: "",
    kms_mantenimiento: undefined,
    kms_proximo: undefined,
    taller: "",
    observaciones: "",
  })

  useEffect(() => {
    if (matricula && matricula !== "undefined") {
      cargarMantenimientos()
    } else {
      setIsLoading(false)
    }
  }, [matricula])

  useEffect(() => {
    if (editingMantenimiento) {
      setFormData({
        fecha_mantenimiento: editingMantenimiento.fecha_mantenimiento || "",
        importe: editingMantenimiento.importe ?? undefined,
        fecha_proximo: editingMantenimiento.fecha_proximo || "",
        kms_mantenimiento: editingMantenimiento.kms_mantenimiento ?? undefined,
        kms_proximo: editingMantenimiento.kms_proximo ?? undefined,
        taller: editingMantenimiento.taller || "",
        observaciones: editingMantenimiento.observaciones || "",
      })
    } else {
      setFormData({
        fecha_mantenimiento: "",
        importe: undefined,
        fecha_proximo: "",
        kms_mantenimiento: undefined,
        kms_proximo: undefined,
        taller: "",
        observaciones: "",
      })
    }
  }, [editingMantenimiento])

  async function cargarMantenimientos() {
    try {
      setIsLoading(true)
      const response = await obtenerMantenimientosPorMatricula(matricula)

      if (response.success) {
        setMantenimientos(response.data)
      } else {
        setError(response.error || "Error al cargar los mantenimientos")
        setMantenimientos([])
      }
    } catch (error) {
      console.error("Error al cargar mantenimientos:", error)
      setError("Error al cargar los mantenimientos")
      setMantenimientos([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement

    if (type === "number") {
      setFormData({
        ...formData,
        [name]: value && value.trim() !== "" ? Number(value) : undefined,
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  async function handleSubmitMantenimiento(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!formData.fecha_mantenimiento || !formData.fecha_proximo || !formData.kms_proximo) {
      setError("Fecha de mantenimiento, fecha próxima y kms próximos son obligatorios")
      setIsSubmitting(false)
      return
    }

    const formDataObj = new FormData()
    formDataObj.append("matricula", matricula)
    formDataObj.append("fecha_mantenimiento", formData.fecha_mantenimiento || "")
    formDataObj.append("fecha_proximo", formData.fecha_proximo || "")
    formDataObj.append("kms_proximo", String(formData.kms_proximo))

    if (formData.importe !== undefined) {
      formDataObj.append("importe", String(formData.importe))
    }

    if (formData.kms_mantenimiento !== undefined) {
      formDataObj.append("kms_mantenimiento", String(formData.kms_mantenimiento))
    }

    if (formData.taller) {
      formDataObj.append("taller", formData.taller)
    }

    if (formData.observaciones) {
      formDataObj.append("observaciones", formData.observaciones)
    }

    try {
      let result
      if (editingMantenimiento && editingMantenimiento.id) {
        result = await actualizarMantenimiento(editingMantenimiento.id, formDataObj)
      } else {
        result = await crearMantenimiento(formDataObj)
      }

      if (result.success) {
        await cargarMantenimientos()
        setShowForm(false)
        setEditingMantenimiento(null)
      } else {
        setError(result.error || "Error al guardar el mantenimiento")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Error inesperado al guardar el mantenimiento")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEliminar(id: number) {
    if (!confirm("¿Estás seguro de que quieres eliminar este mantenimiento?")) {
      return
    }

    try {
      const result = await eliminarMantenimiento(id)
      if (result.success) {
        await cargarMantenimientos()
      } else {
        setError(result.error || "Error al eliminar el mantenimiento")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Error inesperado al eliminar el mantenimiento")
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  if (!matricula || matricula === "undefined") {
    return (
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="mantenimientos">
          <AccordionTrigger>
            <div className="flex items-center">
              <Wrench className="w-4 h-4 mr-2" />
              Mantenimientos
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-gray-500 text-center py-4">
              Guarda el coche primero para poder gestionar los mantenimientos
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="mantenimientos">
        <AccordionTrigger>
          <div className="flex items-center">
            <Wrench className="w-4 h-4 mr-2" />
            Mantenimientos
            {mantenimientos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {mantenimientos.length}
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
                    setShowForm(true)
                    setEditingMantenimiento(null)
                  }}
                  className="flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo mantenimiento
                </Button>
              </div>
            )}

            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingMantenimiento ? "Editar mantenimiento" : "Nuevo mantenimiento"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fecha_mantenimiento">Fecha del mantenimiento *</Label>
                        <Input
                          id="fecha_mantenimiento"
                          name="fecha_mantenimiento"
                          type="date"
                          required
                          value={formData.fecha_mantenimiento || ""}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="importe">Importe (€)</Label>
                        <Input
                          id="importe"
                          name="importe"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.importe ?? ""}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="fecha_proximo">Fecha del próximo *</Label>
                        <Input
                          id="fecha_proximo"
                          name="fecha_proximo"
                          type="date"
                          required
                          value={formData.fecha_proximo || ""}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="kms_mantenimiento">Kms en mantenimiento</Label>
                        <Input
                          id="kms_mantenimiento"
                          name="kms_mantenimiento"
                          type="number"
                          min="0"
                          value={formData.kms_mantenimiento ?? ""}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="kms_proximo">Kms recomendados próximo *</Label>
                        <Input
                          id="kms_proximo"
                          name="kms_proximo"
                          type="number"
                          min="0"
                          required
                          value={formData.kms_proximo ?? ""}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="taller">Taller</Label>
                        <Input
                          id="taller"
                          name="taller"
                          value={formData.taller || ""}
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
                        value={formData.observaciones || ""}
                        onChange={handleInputChange}
                        placeholder="Detalles del mantenimiento, piezas sustituidas..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false)
                          setEditingMantenimiento(null)
                          setError(null)
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="button" onClick={handleSubmitMantenimiento} disabled={isSubmitting}>
                        {isSubmitting ? "Guardando..." : editingMantenimiento ? "Actualizar" : "Crear"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <p className="text-center py-4">Cargando mantenimientos...</p>
            ) : mantenimientos.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay mantenimientos registrados para este vehículo</p>
            ) : (
              <div className="space-y-3">
                {mantenimientos.map((mantenimiento) => (
                  <Card key={mantenimiento.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Fecha mantenimiento:</span>{" "}
                          {formatDate(mantenimiento.fecha_mantenimiento)}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Próximo:</span> {formatDate(mantenimiento.fecha_proximo)}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Kms próximos:</span>{" "}
                          {mantenimiento.kms_proximo?.toLocaleString()} km
                        </div>

                        {mantenimiento.kms_mantenimiento !== null && mantenimiento.kms_mantenimiento !== undefined && (
                          <div className="text-sm">
                            <span className="font-medium">Kms en mantenimiento:</span>{" "}
                            {mantenimiento.kms_mantenimiento.toLocaleString()} km
                          </div>
                        )}

                        {mantenimiento.importe !== null && mantenimiento.importe !== undefined && (
                          <div className="text-sm">
                            <span className="font-medium">Importe:</span> {mantenimiento.importe}€
                          </div>
                        )}

                        {mantenimiento.taller && (
                          <div className="text-sm">
                            <span className="font-medium">Taller:</span> {mantenimiento.taller}
                          </div>
                        )}

                        {mantenimiento.observaciones && (
                          <div className="text-sm text-gray-600">{mantenimiento.observaciones}</div>
                        )}
                      </div>

                      {isEditing && (
                        <div className="flex space-x-1 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMantenimiento(mantenimiento)
                              setShowForm(true)
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEliminar(mantenimiento.id!)}>
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
