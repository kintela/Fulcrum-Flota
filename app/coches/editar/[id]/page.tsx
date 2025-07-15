import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { editarCoche } from "./actions"
import { UbicacionEditor } from "@/components/ubicacion-editor"
import { SeguroManager } from "@/components/seguro-manager"
import { SolredManager } from "@/components/solred-manager"
import { ViatManager } from "@/components/viat-manager"
import { ItvManager } from "@/components/itv-manager"
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/coches/detalle/${coche.matricula}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Editar Vehículo</h1>
          </div>
          <p className="text-gray-600">Modificar información del vehículo {coche.matricula}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario principal */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del Vehículo</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={editarCoche} className="space-y-6">
                  <input type="hidden" name="matricula" value={coche.matricula} />

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
                    <div>
                      <Label htmlFor="año">Año</Label>
                      <Input id="año" name="año" type="number" defaultValue={coche.año || ""} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="kilometros">Kilómetros</Label>
                      <Input id="kilometros" name="kilometros" type="number" defaultValue={coche.kilometros || ""} />
                    </div>
                    <div>
                      <Label htmlFor="combustible">Combustible</Label>
                      <Select name="combustible" defaultValue={coche.combustible || "Gasolina"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar combustible" />
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
                  </div>

                  <div>
                    <Label htmlFor="asignadoa">Asignado a</Label>
                    <Select name="asignadoa" defaultValue={coche.asignadoa?.toString() || "0"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar empleado" />
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
          </div>

          {/* Editor de ubicación */}
          <div className="space-y-6">
            <UbicacionEditor
              matricula={coche.matricula}
              latitud={coche.latitud}
              longitud={coche.longitud}
              direccion_actual={coche.direccion_actual}
              onUbicacionGuardada={() => {
                // Opcional: recargar la página o actualizar datos
                window.location.reload()
              }}
            />
          </div>
        </div>

        {/* Managers adicionales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Gestión de Seguros */}
          <SeguroManager matricula={coche.matricula} />

          {/* Gestión de ITVs */}
          <ItvManager matricula={coche.matricula} />

          {/* Gestión de SOLRED */}
          <SolredManager matricula={coche.matricula} />

          {/* Gestión de VIAT */}
          <ViatManager matricula={coche.matricula} />
        </div>
      </div>
    </div>
  )
}
