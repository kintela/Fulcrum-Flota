import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { editarCoche } from "./actions"
import { UbicacionEditorWrapper } from "@/components/ubicacion-editor-wrapper"
import { SeguroManager } from "@/components/seguro-manager"
import { SolredManager } from "@/components/solred-manager"
import { ViatManager } from "@/components/viat-manager"
import { ITVManager } from "@/components/itv-manager"
import { FotosManager } from "@/components/fotos-manager"

async function getCoche(matricula: string) {
  const { data, error } = await supabase.from("coches").select("*").eq("matricula", matricula).single()

  if (error || !data) {
    return null
  }

  return data
}

async function getEmpleados() {
  const { data, error } = await supabase.from("empleados").select("*").order("nombre")

  if (error) {
    console.error("Error fetching empleados:", error)
    return []
  }

  return data || []
}

export default async function EditarCochePage({ params }: { params: { id: string } }) {
  const coche = await getCoche(params.id)
  const empleados = await getEmpleados()

  if (!coche) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/coches/detalle/${coche.matricula}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Editar Vehículo · {coche.matricula}</h1>
          </div>
        </div>

        {/* Formulario principal - Una sola columna */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Vehículo</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={editarCoche} className="space-y-6">
                <input type="hidden" name="matricula_original" value={coche.matricula} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="marca">Marca</Label>
                    <Input id="marca" name="marca" defaultValue={coche.marca || ""} required />
                  </div>
                  <div>
                    <Label htmlFor="modelo">Modelo</Label>
                    <Input id="modelo" name="modelo" defaultValue={coche.modelo || ""} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input id="color" name="color" defaultValue={coche.color || ""} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="kms">Kilómetros</Label>
                    <Input id="kms" name="kms" type="number" defaultValue={coche.kms || ""} />
                  </div>
                  <div>
                    <Label htmlFor="combustible">Combustible</Label>
                    <select
                      id="combustible"
                      name="combustible"
                      defaultValue={coche.combustible || "Gasolina"}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="Gasolina">Gasolina</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Híbrido">Híbrido</option>
                      <option value="Eléctrico">Eléctrico</option>
                      <option value="GLP">GLP</option>
                      <option value="GNC">GNC</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <Label htmlFor="asignadoa">Asignado a</Label>
                    <select
                      id="asignadoa"
                      name="asignadoa"
                      defaultValue={coche.asignadoa?.toString() || "0"}
                      className="flex h-10 w-full md:w-3/4 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="0">Sin asignar</option>
                      {empleados.map((empleado) => (
                        <option key={empleado.id} value={empleado.id.toString()}>
                          {empleado.nombre} {empleado.apellidos}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="matricula">Matrícula</Label>
                    <Input
                      id="matricula"
                      name="matricula"
                      defaultValue={coche.matricula || ""}
                      required
                      className="uppercase"
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

                <div className="flex items-center space-x-2">
                  <Checkbox id="donante" name="donante" defaultChecked={coche.donante || false} />
                  <Label htmlFor="donante">Vehículo donante (para piezas)</Label>
                </div>

                <Button type="submit" className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Gestión de Fotos */}
          <FotosManager matricula={coche.matricula} />

          {/* Managers adicionales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gestión de Seguros */}
            <SeguroManager matricula={coche.matricula} />

            {/* Gestión de ITVs */}
            <ITVManager matricula={coche.matricula} isEditing />

            {/* Gestión de SOLRED */}
            <SolredManager matricula={coche.matricula} />

            {/* Gestión de VIAT */}
            <ViatManager matricula={coche.matricula} />
          </div>

          {/* Editor de ubicación - Al final */}
          <UbicacionEditorWrapper
            matricula={coche.matricula}
            latitud={coche.latitud}
            longitud={coche.longitud}
            direccion_actual={coche.direccion_actual}
          />
        </div>
      </div>
    </div>
  )
}
