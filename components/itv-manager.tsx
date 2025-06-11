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
import { Plus, Edit2, Trash2, Calendar, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react"
import { obtenerITVsPorMatricula, crearITV, actualizarITV, eliminarITV } from "@/app/actions/itvs"

// Valores exactos permitidos por el constraint actualizado
const RESULTADOS_VALIDOS = ["Apto", "No Apto", "Apto Con Observaciones"] as const
type ResultadoITV = (typeof RESULTADOS_VALIDOS)[number]

interface ITV {
  id?: number
  matricula: string
  fecharevision?: string
  fechaproximarevision: string
  resultado?: ResultadoITV
  observaciones?: string
  coste?: number
  estacion_itv?: string
  numero_certificado?: string
}

interface ITVManagerProps {
  matricula: string
  isEditing?: boolean
}

export function ITVManager({ matricula, isEditing = false }: ITVManagerProps) {
  const [itvs, setItvs] = useState<ITV[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingITV, setEditingITV] = useState<ITV | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tipoRegistro, setTipoRegistro] = useState<"realizada" | "programada">("realizada")

  // Campos del formulario
  const [formData, setFormData] = useState<Partial<ITV & { periodoAnios: string }>>({
    fecharevision: "",
    fechaproximarevision: "",
    resultado: "" as any,
    observaciones: "",
    coste: undefined,
    estacion_itv: "",
    numero_certificado: "",
    periodoAnios: "1",
  })

  useEffect(() => {
    if (matricula && matricula !== "undefined") {
      cargarITVs()
    } else {
      setIsLoading(false)
    }
  }, [matricula])

  useEffect(() => {
    if (editingITV) {
      // Permitir cambiar el tipo al editar
      // No forzar el tipo basado en los datos existentes
      setFormData({
        fecharevision: editingITV.fecharevision || "",
        fechaproximarevision: editingITV.fechaproximarevision || "",
        resultado: editingITV.resultado || "",
        observaciones: editingITV.observaciones || "",
        coste: editingITV.coste,
        estacion_itv: editingITV.estacion_itv || "",
        numero_certificado: editingITV.numero_certificado || "",
        periodoAnios: "1",
      })
    } else {
      // Resetear al tipo por defecto solo para nuevos registros
      setTipoRegistro("realizada")
      setFormData({
        fecharevision: "",
        fechaproximarevision: "",
        resultado: "" as any,
        observaciones: "",
        coste: undefined,
        estacion_itv: "",
        numero_certificado: "",
        periodoAnios: "1",
      })
    }
  }, [editingITV])

  // Resetear formulario cuando cambia el tipo
  useEffect(() => {
    if (!editingITV) {
      setFormData({
        fecharevision: "",
        fechaproximarevision: "",
        resultado: "" as any,
        observaciones: "",
        coste: undefined,
        estacion_itv: "",
        numero_certificado: "",
        periodoAnios: "1",
      })
    }
  }, [tipoRegistro, editingITV])

  async function cargarITVs() {
    try {
      setIsLoading(true)
      const response = await obtenerITVsPorMatricula(matricula)

      if (response.success) {
        setItvs(response.data)
      } else {
        setError(response.error || "Error al cargar las ITVs")
        setItvs([])
      }
    } catch (error) {
      console.error("Error al cargar ITVs:", error)
      setError("Error al cargar las ITVs")
      setItvs([])
    } finally {
      setIsLoading(false)
    }
  }

  function calcularFechaProximaRevision(fechaRevision: string, periodoAnios: string) {
    if (!fechaRevision || !periodoAnios) return ""

    const fecha = new Date(fechaRevision)
    fecha.setFullYear(fecha.getFullYear() + Number.parseInt(periodoAnios))

    return fecha.toISOString().split("T")[0]
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement

    let newFormData: any
    if (type === "number") {
      newFormData = {
        ...formData,
        [name]: value && value.trim() !== "" ? Number(value) : undefined,
      }
    } else {
      newFormData = {
        ...formData,
        [name]: value,
      }
    }

    // Solo calcular automáticamente si es una revisión realizada y tenemos los datos necesarios
    if (tipoRegistro === "realizada" && (name === "fecharevision" || name === "periodoAnios")) {
      const fechaRevision = name === "fecharevision" ? value : formData.fecharevision || ""
      const periodo = name === "periodoAnios" ? value : formData.periodoAnios || "1"

      if (fechaRevision && periodo) {
        newFormData.fechaproximarevision = calcularFechaProximaRevision(fechaRevision, periodo)
      }
    }

    setFormData(newFormData)
  }

  async function handleSubmitITV(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validaciones según el tipo
    if (tipoRegistro === "realizada") {
      if (!formData.fecharevision || !formData.resultado) {
        setError("Para una revisión realizada, la fecha y el resultado son obligatorios")
        setIsSubmitting(false)
        return
      }
    } else {
      if (!formData.fechaproximarevision) {
        setError("Para una revisión programada, la fecha de próxima revisión es obligatoria")
        setIsSubmitting(false)
        return
      }
    }

    const formDataObj = new FormData()
    formDataObj.append("matricula", matricula)
    formDataObj.append("tipoRegistro", tipoRegistro) // Añadir el tipo para que el servidor lo sepa

    // Solo añadir campos según el tipo
    if (tipoRegistro === "realizada") {
      formDataObj.append("fecharevision", formData.fecharevision || "")
      formDataObj.append("resultado", formData.resultado || "")
    } else {
      // Para revisión programada, enviar valores especiales para limpiar campos
      formDataObj.append("fecharevision", "")
      formDataObj.append("resultado", "")
    }

    formDataObj.append("fechaproximarevision", formData.fechaproximarevision || "")

    if (formData.observaciones) {
      formDataObj.append("observaciones", formData.observaciones)
    }

    if (formData.coste !== undefined && formData.coste !== null && formData.coste !== "") {
      formDataObj.append("coste", formData.coste.toString())
    }

    if (formData.estacion_itv) {
      formDataObj.append("estacion_itv", formData.estacion_itv)
    }

    if (formData.numero_certificado) {
      formDataObj.append("numero_certificado", formData.numero_certificado)
    }

    try {
      let result
      if (editingITV && editingITV.id) {
        result = await actualizarITV(editingITV.id, formDataObj)
      } else {
        result = await crearITV(formDataObj)
      }

      if (result.success) {
        await cargarITVs()
        setShowForm(false)
        setEditingITV(null)
      } else {
        setError(result.error || "Error al guardar la ITV")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Error inesperado al guardar la ITV")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEliminar(id: number) {
    if (!confirm("¿Estás seguro de que quieres eliminar esta ITV?")) {
      return
    }

    try {
      const result = await eliminarITV(id)
      if (result.success) {
        await cargarITVs()
      } else {
        setError(result.error || "Error al eliminar la ITV")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Error inesperado al eliminar la ITV")
    }
  }

  function getResultadoBadge(resultado?: string) {
    if (!resultado) return null

    switch (resultado) {
      case "Apto":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Apto
          </Badge>
        )
      case "No Apto":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            No Apto
          </Badge>
        )
      case "Apto Con Observaciones":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Apto Con Observaciones
          </Badge>
        )
      default:
        return <Badge variant="secondary">{resultado}</Badge>
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  function isProximaRevisionVencida(fecha: string) {
    return new Date(fecha) < new Date()
  }

  if (!matricula || matricula === "undefined") {
    return (
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="itvs">
          <AccordionTrigger>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Revisiones ITV
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-gray-500 text-center py-4">Guarda el coche primero para poder gestionar las ITVs</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="itvs">
        <AccordionTrigger>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Revisiones ITV
            {itvs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {itvs.length}
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
                    setEditingITV(null)
                  }}
                  className="flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva ITV
                </Button>
              </div>
            )}

            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingITV ? "Editar ITV" : "Nueva ITV"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Selector de tipo de registro - mostrar siempre */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <Label className="text-base font-medium mb-3 block">Tipo de registro</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="tipoRegistro"
                            value="realizada"
                            checked={tipoRegistro === "realizada"}
                            onChange={(e) => setTipoRegistro(e.target.value as "realizada" | "programada")}
                            className="text-blue-600"
                          />
                          <span className="text-sm">
                            <strong>Revisión realizada</strong> - Ya se hizo la ITV
                          </span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="tipoRegistro"
                            value="programada"
                            checked={tipoRegistro === "programada"}
                            onChange={(e) => setTipoRegistro(e.target.value as "realizada" | "programada")}
                            className="text-blue-600"
                          />
                          <span className="text-sm">
                            <strong>Próxima revisión</strong> - Programar cuándo debe hacerse
                          </span>
                        </label>
                      </div>
                      {editingITV && (
                        <p className="text-xs text-blue-600 mt-2">
                          <Info className="w-3 h-3 inline mr-1" />
                          Puedes cambiar el tipo de registro al editar
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Campos para revisión realizada */}
                      {tipoRegistro === "realizada" && (
                        <>
                          <div>
                            <Label htmlFor="fecharevision">Fecha de Revisión *</Label>
                            <Input
                              id="fecharevision"
                              name="fecharevision"
                              type="date"
                              required
                              value={formData.fecharevision || ""}
                              onChange={handleInputChange}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="resultado">Resultado *</Label>
                            <select
                              id="resultado"
                              name="resultado"
                              required
                              value={formData.resultado || ""}
                              onChange={handleInputChange}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Seleccionar resultado</option>
                              <option value="Apto">Apto</option>
                              <option value="No Apto">No Apto</option>
                              <option value="Apto Con Observaciones">Apto Con Observaciones</option>
                            </select>
                          </div>

                          <div>
                            <Label htmlFor="periodoAnios">Período hasta próxima revisión *</Label>
                            <select
                              id="periodoAnios"
                              name="periodoAnios"
                              required
                              value={formData.periodoAnios || "1"}
                              onChange={handleInputChange}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="1">1 año</option>
                              <option value="2">2 años</option>
                            </select>
                          </div>

                          <div>
                            <Label htmlFor="fechaproximarevision">Próxima Revisión (calculada automáticamente)</Label>
                            <Input
                              id="fechaproximarevision"
                              name="fechaproximarevision"
                              type="date"
                              value={formData.fechaproximarevision || ""}
                              readOnly
                              className="mt-1 bg-gray-50"
                              title="Este campo se calcula automáticamente basándose en la fecha de revisión y el período seleccionado"
                            />
                          </div>
                        </>
                      )}

                      {/* Campos para revisión programada */}
                      {tipoRegistro === "programada" && (
                        <div className="md:col-span-2">
                          <Label htmlFor="fechaproximarevision">Fecha de Próxima Revisión *</Label>
                          <Input
                            id="fechaproximarevision"
                            name="fechaproximarevision"
                            type="date"
                            required
                            value={formData.fechaproximarevision || ""}
                            onChange={handleInputChange}
                            className="mt-1"
                            min={new Date().toISOString().split("T")[0]} // No permitir fechas pasadas
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            <Info className="w-3 h-3 inline mr-1" />
                            Para coches nuevos o cuando solo necesitas programar la próxima revisión
                          </p>
                        </div>
                      )}

                      {/* Campos opcionales comunes */}
                      <div>
                        <Label htmlFor="coste">Coste (€)</Label>
                        <Input
                          id="coste"
                          name="coste"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.coste || ""}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="estacion_itv">Estación ITV</Label>
                        <Input
                          id="estacion_itv"
                          name="estacion_itv"
                          value={formData.estacion_itv || ""}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="numero_certificado">Número de Certificado</Label>
                        <Input
                          id="numero_certificado"
                          name="numero_certificado"
                          value={formData.numero_certificado || ""}
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
                        placeholder="Defectos encontrados, reparaciones necesarias..."
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
                          setEditingITV(null)
                          setError(null)
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="button" onClick={handleSubmitITV} disabled={isSubmitting}>
                        {isSubmitting ? "Guardando..." : editingITV ? "Actualizar" : "Crear"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <p className="text-center py-4">Cargando ITVs...</p>
            ) : itvs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay revisiones ITV registradas para este vehículo</p>
            ) : (
              <div className="space-y-3">
                {itvs.map((itv) => (
                  <Card key={itv.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="space-y-2">
                          {itv.fecharevision ? (
                            <div className="text-sm">
                              <span className="font-medium">Fecha revisión:</span> {formatDate(itv.fecharevision)}
                            </div>
                          ) : (
                            <div className="text-sm text-blue-600">
                              <Info className="w-3 h-3 inline mr-1" />
                              <span className="font-medium">Revisión programada</span>
                            </div>
                          )}

                          {itv.resultado && (
                            <div className="flex items-center">
                              <span className="font-medium text-sm mr-2">Resultado:</span>
                              {getResultadoBadge(itv.resultado)}
                              {isProximaRevisionVencida(itv.fechaproximarevision) && (
                                <Badge variant="destructive" className="ml-2">
                                  Vencida
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="text-sm">
                            <span className="font-medium">Próxima revisión:</span>{" "}
                            <span
                              className={
                                isProximaRevisionVencida(itv.fechaproximarevision) ? "text-red-600 font-bold" : ""
                              }
                            >
                              {formatDate(itv.fechaproximarevision)}
                            </span>
                            {!itv.fecharevision && isProximaRevisionVencida(itv.fechaproximarevision) && (
                              <Badge variant="destructive" className="ml-2">
                                Vencida
                              </Badge>
                            )}
                          </div>

                          {itv.observaciones && (
                            <div className="text-sm">
                              <span className="font-medium">Observaciones:</span> {itv.observaciones}
                            </div>
                          )}

                          {/* Información adicional en una fila compacta si existe */}
                          {(itv.coste || itv.estacion_itv || itv.numero_certificado) && (
                            <div className="text-xs text-gray-600 pt-1 border-t border-gray-100 mt-2">
                              {itv.coste && <span className="mr-4">Coste: {itv.coste}€</span>}
                              {itv.estacion_itv && <span className="mr-4">Estación: {itv.estacion_itv}</span>}
                              {itv.numero_certificado && <span>Certificado: {itv.numero_certificado}</span>}
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
                              setEditingITV(itv)
                              setShowForm(true)
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEliminar(itv.id!)}>
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
