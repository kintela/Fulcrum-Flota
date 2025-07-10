import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Car, Save } from "lucide-react"
import Link from "next/link"
import { editarCoche } from "./actions"
import { FotosManager } from "@/components/fotos-manager"
import { ItvManager } from "@/components/itv-manager"
import { SeguroManager } from "@/components/seguro-manager"
import { SolredManager } from "@/components/solred-manager"
import { ViatManager } from "@/components/viat-manager"
import { UbicacionEditor } from "@/components/ubicacion-editor"

async function getCoche(matricula: string) {
  const { data: coche, error } = await supabase.from("coches").select("*").eq("matricula", matricula).single()

  if (error || !coche) {
    return null
  }

  return coche
}

async function getEmpleados() {
  const { data: empleados, error } = await supabase.from("empleados").select("*").order("nombre")

  if (error) {
    console.error("Error fetching empleados:", error)
    return []
  }

  return empleados || []
}

export default async function EditarCochePage({ params }: { params: { id: string } }) {
  const coche = await getCoche(params.id)
  const empleados = await getEmpleados()

  if (!coche) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/coches/detalle/${coche.matricula}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Car className="h-8 w-8" />
                Editar Vehículo
              </h1>
              <p className="text-gray-600">
                {coche.matricula} - {coche.marca} {coche.modelo}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna izquierda - Datos básicos */}
          <div className="space-y-6">
            {/* Formulario principal */}
            <Card>
              <CardHeader>
                <CardTitle>Datos del Vehículo</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={editarCoche} className="space-y-4">
                  <input type="hidden" name="matricula" value={coche.matricula} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="marca">Marca</Label>
                      <Input
                        id="marca"
                        name="marca"
                        defaultValue={coche.marca || ""}
                        placeholder="Ej: Toyota"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="modelo">Modelo</Label>
                      <Input
                        id="modelo"
                        name="modelo"
                        defaultValue={coche.modelo || ""}
                        placeholder="Ej: Corolla"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="año">Año</Label>
                      <Input
                        id="año"
                        name="año"
                        type="number"
                        min="1900"
                        max="2030"
                        defaultValue={coche.año || ""}
                        placeholder="Ej: 2020"
                      />
                    </div>
                    <div>
                      <Label htmlFor="color">Color</Label>
                      <Input id="color" name="color" defaultValue={coche.color || ""} placeholder="Ej: Blanco" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div>
                      <Label htmlFor="kilometraje">Kilometraje</Label>
                      <Input
                        id="kilometraje"
                        name="kilometraje"
                        type="number"
                        min="0"
                        defaultValue={coche.kilometraje || ""}
                        placeholder="Ej: 50000"
                      />
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
                    <Label htmlFor="donante">Vehículo donante</Label>
                  </div>

                  <Button type="submit" className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Editor de ubicación */}
            <UbicacionEditor
              matricula={coche.matricula}
              latitud={coche.latitud}
              longitud={coche.longitud}
              direccion_actual={coche.direccion_actual}
            />

            {/* Gestión de fotos */}
            <FotosManager matricula={coche.matricula} />
          </div>

          {/* Columna derecha - Gestiones */}
          <div className="space-y-6">
            {/* ITV */}
            <ItvManager matricula={coche.matricula} />

            {/* Seguros */}
            <SeguroManager matricula={coche.matricula} />

            {/* SOLRED */}
            <SolredManager matricula={coche.matricula} />

            {/* VIAT */}
            <ViatManager matricula={coche.matricula} />
          </div>
        </div>
      </div>
    </div>
  )
}
