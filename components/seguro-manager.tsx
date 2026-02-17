"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit2, Trash2, Shield, Phone } from "lucide-react"
import { obtenerHistorialSeguros, crearSeguro, actualizarSeguro, eliminarSeguro } from "@/app/actions/seguros"

// Actualizar la interfaz Seguro para usar los nombres correctos de las columnas
interface Seguro {
  id: number
  matricula: string
  numero_poliza: string
  fecha_contratacion: string
  fecha_vencimiento: string
  compania: string
  tipo: string
  importe_anual?: number
  telefono_asistencia1?: string
  telefono_asistencia2?: string
  observaciones?: string
  activo: boolean
}

interface SeguroManagerProps {
  matricula: string
  isEditing?: boolean
}

export function SeguroManager({ matricula, isEditing = false }: SeguroManagerProps) {
  const [seguros, setSeguros] = useState<Seguro[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSeguro, setEditingSeguro] = useState<Seguro | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [esActivo, setEsActivo] = useState(true)

  // Campos del formulario
  const [formData, setFormData] = useState<Partial<Seguro>>({
    numero_poliza: "",
    fecha_contratacion: "",
    fecha_vencimiento: "",
    compania: "",
    tipo: "Terceros",
    importe_anual: undefined,
    telefono_asistencia: "",
    telefono_asistencia2: "",
    observaciones: "",
    activo: true,
  })

  useEffect(() => {
    if (matricula && matricula !== "undefined") {
      cargarSeguros()
    } else {
      setIsLoading(false)
    }
  }, [matricula])

  // Actualizar el useEffect que maneja el editingSeguro para usar los nombres correctos
  useEffect(() => {
    if (editingSeguro) {
      setFormData({
        numero_poliza: editingSeguro.numero_poliza || "",
        fecha_contratacion: editingSeguro.fecha_contratacion || "",
        fecha_vencimiento: editingSeguro.fecha_vencimiento || "",
        compania: editingSeguro.compania || "",
        tipo: editingSeguro.tipo || "Terceros",
        importe_anual: editingSeguro.importe_anual,
        telefono_asistencia: editingSeguro.telefono_asistencia1 || "",
        telefono_asistencia2: editingSeguro.telefono_asistencia2 || "",
        observaciones: editingSeguro.observaciones || "",
        activo: editingSeguro.activo,
      })
      setEsActivo(editingSeguro.activo)
    } else {
      // Valores por defecto para nuevo seguro
      setFormData({
        numero_poliza: "",
        fecha_contratacion: "",
        fecha_vencimiento: "",
        compania: "",
        tipo: "Terceros",
        importe_anual: undefined,
        telefono_asistencia: "",
        telefono_asistencia2: "",
        observaciones: "",
        activo: true,
      })
      setEsActivo(true)
    }
  }, [editingSeguro])

  async function cargarSeguros() {
    try {
      setIsLoading(true)
      const response = await obtenerHistorialSeguros(matricula)

      if (response.success) {
        setSeguros(response.data)
      } else {
        setError(response.error || "Error al cargar los seguros")
        setSeguros([])
      }
    } catch (error) {
      console.error("Error al cargar seguros:", error)
      setError("Error al cargar los seguros")
      setSeguros([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  async function handleSubmitSeguro(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validaciones básicas
    if (!formData.numero_poliza || !formData.fecha_contratacion || !formData.fecha_vencimiento || !formData.compania) {
      setError("Los campos número de póliza, fecha de contratación, fecha de vencimiento y compañía son obligatorios")
      setIsSubmitting(false)
      return
    }

    const formDataObj = new FormData()
    formDataObj.append("matricula", matricula)
    formDataObj.append("numero_poliza", formData.numero_poliza || "")
    formDataObj.append("fecha_contratacion", formData.fecha_contratacion || "")
    formDataObj.append("fecha_vencimiento", formData.fecha_vencimiento || "")
    formDataObj.append("compania", formData.compania || "")
    formDataObj.append("tipo", formData.tipo || "Terceros")

    if (formData.importe_anual !== undefined) {
      formDataObj.append("importe_anual", formData.importe_anual.toString())
    }

    if (formData.telefono_asistencia) {
      formDataObj.append("telefono_asistencia", formData.telefono_asistencia)
    }

    if (formData.telefono_asistencia2) {
      formDataObj.append("telefono_asistencia2", formData.telefono_asistencia2)
    }

    if (formData.observaciones) {
      formDataObj.append("observaciones", formData.observaciones)
    }

    if (esActivo) {
      formDataObj.append("activo", "on")
    }

    try {
      let result
      if (editingSeguro && editingSeguro.id) {
        result = await actualizarSeguro(editingSeguro.id, formDataObj)
      } else {
        result = await crearSeguro(formDataObj)
      }

      if (result.success) {
        await cargarSeguros()
        setShowForm(false)
        setEditingSeguro(null)
      } else {
        setError(result.error || "Error al guardar el seguro")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Error inesperado al guardar el seguro")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEliminar(id: number) {
    if (!confirm("¿Estás seguro de que quieres eliminar este seguro?")) {
      return
    }

    try {
      const result = await eliminarSeguro(id, matricula)
      if (result.success) {
        await cargarSeguros()
      } else {
        setError(result.error || "Error al eliminar el seguro")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Error inesperado al eliminar el seguro")
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  function isSeguroVencido(fecha: string) {
    return new Date(fecha) < new Date()
  }

  if (!matricula || matricula === "undefined") {
    return (
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="seguros">
          <AccordionTrigger>
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Seguros
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-gray-500 text-center py-4">Guarda el coche primero para poder gestionar los seguros</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="seguros">
        <AccordionTrigger>
          <div className="flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Seguros
            {seguros.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {seguros.length}
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
                    setEditingSeguro(null)
                  }}
                  className="flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Seguro
                </Button>
              </div>
            )}

            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingSeguro ? "Editar Seguro" : "Nuevo Seguro"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="numero_poliza">Número de Póliza *</Label>
                        <Input
                          id="numero_poliza"
                          name="numero_poliza"
                          value={formData.numero_poliza || ""}
                          onChange={handleInputChange}
                          required
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="compania">Compañía Aseguradora *</Label>
                        <Input
                          id="compania"
                          name="compania"
                          value={formData.compania || ""}
                          onChange={handleInputChange}
                          required
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="fecha_contratacion">Fecha de Contratación *</Label>
                        <Input
                          id="fecha_contratacion"
                          name="fecha_contratacion"
                          type="date"
                          value={formData.fecha_contratacion || ""}
                          onChange={handleInputChange}
                          required
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="fecha_vencimiento">Fecha de Vencimiento *</Label>
                        <Input
                          id="fecha_vencimiento"
                          name="fecha_vencimiento"
                          type="date"
                          value={formData.fecha_vencimiento || ""}
                          onChange={handleInputChange}
                          required
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="tipo">Tipo de Seguro</Label>
                        <select
                          id="tipo"
                          name="tipo"
                          value={formData.tipo || "Terceros"}
                          onChange={handleInputChange}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Terceros">Terceros</option>
                          <option value="Terceros Ampliado">Terceros Ampliado</option>
                          <option value="Todo Riesgo">Todo Riesgo</option>
                          <option value="Todo Riesgo con Franquicia">Todo Riesgo con Franquicia</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="importe_anual">Importe Anual (€) *</Label>
                        <Input
                          id="importe_anual"
                          name="importe_anual"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.importe_anual || ""}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="telefono_asistencia">Teléfono de Asistencia</Label>
                        <Input
                          id="telefono_asistencia"
                          name="telefono_asistencia"
                          value={formData.telefono_asistencia || ""}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="telefono_asistencia2">Teléfono de Asistencia Alternativo</Label>
                        <Input
                          id="telefono_asistencia2"
                          name="telefono_asistencia2"
                          value={formData.telefono_asistencia2 || ""}
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
                        placeholder="Coberturas adicionales, condiciones especiales..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox id="activo" checked={esActivo} onCheckedChange={(checked) => setEsActivo(!!checked)} />
                      <Label htmlFor="activo">Póliza activa actualmente</Label>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false)
                          setEditingSeguro(null)
                          setError(null)
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="button" onClick={handleSubmitSeguro} disabled={isSubmitting}>
                        {isSubmitting ? "Guardando..." : editingSeguro ? "Actualizar" : "Crear"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <p className="text-center py-4">Cargando seguros...</p>
            ) : seguros.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay seguros registrados para este vehículo</p>
            ) : (
              <div className="space-y-3">
                {seguros.map((seguro) => (
                  <Card key={seguro.id} className={`p-4 ${seguro.activo ? "border-green-500" : ""}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">
                              {seguro.compania} - {seguro.numero_poliza}
                              {seguro.activo && <Badge className="ml-2 bg-green-100 text-green-800">Activo</Badge>}
                            </div>
                            <div className="text-sm">
                              <Badge variant={seguro.tipo.includes("Todo Riesgo") ? "default" : "secondary"}>
                                {seguro.tipo}
                              </Badge>
                            </div>
                          </div>

                          <div className="text-sm">
                            <span className="font-medium">Vigencia:</span> {formatDate(seguro.fecha_contratacion)} al{" "}
                            <span className={isSeguroVencido(seguro.fecha_vencimiento) ? "text-red-600 font-bold" : ""}>
                              {formatDate(seguro.fecha_vencimiento)}
                            </span>
                            {isSeguroVencido(seguro.fecha_vencimiento) && (
                              <Badge variant="destructive" className="ml-2">
                                Vencido
                              </Badge>
                            )}
                          </div>

                          {seguro.importe_anual && (
                            <div className="text-sm">
                              <span className="font-medium">Importe anual:</span> {seguro.importe_anual}€
                            </div>
                          )}

                          {/* Actualizar la parte donde se muestran los teléfonos de asistencia en la tarjeta de seguro */}
                          {(seguro.telefono_asistencia1 || seguro.telefono_asistencia2) && (
                            <div className="text-sm flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              <span className="font-medium">Asistencia:</span>{" "}
                              {seguro.telefono_asistencia1 && (
                                <a href={`tel:${seguro.telefono_asistencia1}`} className="text-blue-600 mr-2">
                                  {seguro.telefono_asistencia1}
                                </a>
                              )}
                              {seguro.telefono_asistencia2 && (
                                <a href={`tel:${seguro.telefono_asistencia2}`} className="text-blue-600">
                                  {seguro.telefono_asistencia2}
                                </a>
                              )}
                            </div>
                          )}

                          {seguro.observaciones && (
                            <div className="text-sm">
                              <span className="font-medium">Observaciones:</span> {seguro.observaciones}
                            </div>
                          )}
                        </div>
                      </div>

                      {isEditing && (
                        <div className="flex space-x-1 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingSeguro(seguro)
                              setShowForm(true)
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEliminar(seguro.id)}>
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
