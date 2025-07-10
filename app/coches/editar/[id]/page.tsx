import { obtenerCoche } from "./actions"
import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { UbicacionEditor } from "@/components/ubicacion-editor"
import { editarCoche, guardarSeccionBasica, guardarSeccionAlquiler, guardarSeccionAsignacion } from "./actions"

interface PageProps {
  params: {
    id: string
  }
}

async function getEmpleados() {
  try {
    const { data, error } = await supabase.from("empleados").select("*").order("nombre")

    if (error) {
      console.error("Error fetching empleados:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getEmpleados:", error)
    return []
  }
}

export default async function EditarCochePage({ params }: PageProps) {
  const coche = await obtenerCoche(params.id)
  const empleados = await getEmpleados()

  if (!coche) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/coches">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Editar Vehículo</h1>
              <p className="text-gray-600">Matrícula: {coche.matricula}</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Información Básica */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={guardarSeccionBasica.bind(null, coche.matricula)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor="fechamatriculacion">Fecha de Matriculación</Label>
                    <Input
                      id="fechamatriculacion"
                      name="fechamatriculacion"
                      type="date"
                      defaultValue={coche.fechamatriculacion || ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="kms">Kilómetros</Label>
                    <Input id="kms" name="kms" type="number" defaultValue={coche.kms || 0} />
                  </div>
                  <div>
                    <Label htmlFor="combustible">Combustible</Label>
                    <Select name="combustible" defaultValue={coche.combustible || "Gasolina"}>
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
                  <div>
                    <Label htmlFor="kw">Potencia (kW)</Label>
                    <Input id="kw" name="kw" type="number" defaultValue={coche.kw || ""} />
                  </div>
                  <div>
                    <Label htmlFor="cv">Potencia (CV)</Label>
                    <Input id="cv" name="cv" type="number" defaultValue={coche.cv || ""} />
                  </div>
                  <div>
                    <Label htmlFor="cc">Cilindrada (cc)</Label>
                    <Input id="cc" name="cc" type="number" defaultValue={coche.cc || ""} />
                  </div>
                  <div>
                    <Label htmlFor="preciocompra">Precio de Compra (€)</Label>
                    <Input
                      id="preciocompra"
                      name="preciocompra"
                      type="number"
                      step="0.01"
                      defaultValue={coche.preciocompra || ""}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="extras">Extras</Label>
                  <Textarea id="extras" name="extras" defaultValue={coche.extras || ""} rows={3} />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="donante" name="donante" defaultChecked={coche.donante} />
                  <Label htmlFor="donante">Vehículo donante</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="alquiler" name="alquiler" defaultChecked={coche.alquiler} />
                  <Label htmlFor="alquiler">Vehículo de alquiler</Label>
                </div>

                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Información Básica
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Datos del Alquiler */}
          {coche.alquiler && (
            <Card>
              <CardHeader>
                <CardTitle>Datos del Alquiler</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={guardarSeccionAlquiler.bind(null, coche.matricula)} className="space-y-4">
                  <input type="hidden" name="alquiler" value={coche.alquiler ? "on" : ""} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fecha_inicio">Fecha de Inicio</Label>
                      <Input
                        id="fecha_inicio"
                        name="fecha_inicio"
                        type="date"
                        defaultValue={coche.fecha_inicio || ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fecha_fin">Fecha de Fin</Label>
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
                      <Input id="compania" name="compania" defaultValue={coche.compania || ""} />
                    </div>
                    <div>
                      <Label htmlFor="kms_anuales">Kilómetros Anuales</Label>
                      <Input id="kms_anuales" name="kms_anuales" type="number" defaultValue={coche.kms_anuales || ""} />
                    </div>
                  </div>

                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Datos del Alquiler
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Asignación de Empleado */}
          <Card>
            <CardHeader>
              <CardTitle>Asignación de Empleado</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={guardarSeccionAsignacion.bind(null, coche.matricula)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="empleado_id">Empleado Asignado</Label>
                    <Select name="empleado_id" defaultValue={coche.empleado_id?.toString() || "0"}>
                      <SelectTrigger>
                        <SelectValue />
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
                  <div>
                    <Label htmlFor="fecha_asignacion">Fecha de Asignación</Label>
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
                    rows={3}
                  />
                </div>

                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Asignación
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Editor de Ubicación */}
          <UbicacionEditor
            matricula={coche.matricula}
            ubicacionActual={{
              latitud: coche.latitud,
              longitud: coche.longitud,
              direccion_actual: coche.direccion_actual,
            }}
          />

          <Separator />

          {/* Botón de Guardar Todo */}
          <Card>
            <CardContent className="pt-6">
              <form action={editarCoche.bind(null, coche.matricula)} className="space-y-4">
                {/* Campos ocultos con todos los datos actuales */}
                <input type="hidden" name="marca" value={coche.marca} />
                <input type="hidden" name="modelo" value={coche.modelo} />
                <input type="hidden" name="color" value={coche.color || ""} />
                <input type="hidden" name="fechamatriculacion" value={coche.fechamatriculacion || ""} />
                <input type="hidden" name="kms" value={coche.kms || 0} />
                <input type="hidden" name="kw" value={coche.kw || ""} />
                <input type="hidden" name="cv" value={coche.cv || ""} />
                <input type="hidden" name="cc" value={coche.cc || ""} />
                <input type="hidden" name="combustible" value={coche.combustible || "Gasolina"} />
                <input type="hidden" name="extras" value={coche.extras || ""} />
                <input type="hidden" name="donante" value={coche.donante ? "on" : ""} />
                <input type="hidden" name="alquiler" value={coche.alquiler ? "on" : ""} />
                <input type="hidden" name="preciocompra" value={coche.preciocompra || ""} />
                <input type="hidden" name="empleado_id" value={coche.empleado_id || 0} />
                <input type="hidden" name="fecha_asignacion" value={coche.fecha_asignacion || ""} />
                <input type="hidden" name="observaciones_asignacion" value={coche.observaciones_asignacion || ""} />

                <div className="flex gap-4">
                  <Button type="submit" size="lg">
                    <Save className="h-5 w-5 mr-2" />
                    Guardar Todos los Cambios
                  </Button>
                  <Link href={`/coches/detalle/${coche.matricula}`}>
                    <Button variant="outline" size="lg">
                      Ver Detalles
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
