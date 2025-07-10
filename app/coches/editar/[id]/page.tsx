import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Car } from "lucide-react"
import Link from "next/link"
import { editarCoche } from "./actions"
import { UbicacionEditor } from "@/components/ubicacion-editor"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function getCoche(id: string) {
  const { data, error } = await supabase.from("coches").select("*").eq("matricula", id).single()

  if (error || !data) {
    return null
  }

  return data
}

async function getEmpleados() {
  const { data, error } = await supabase.from("empleados").select("id, nombre, apellidos").order("nombre")

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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/coches">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Car className="h-6 w-6" />
            Editar Vehículo - {coche.matricula}
          </h1>
          <p className="text-gray-600">
            {coche.marca} {coche.modelo} ({coche.año})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de edición */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Vehículo</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={editarCoche} className="space-y-4">
              <input type="hidden" name="matricula" value={coche.matricula} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="marca">Marca</Label>
                  <Input id="marca" name="marca" defaultValue={coche.marca} required />
                </div>
                <div>
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input id="modelo" name="modelo" defaultValue={coche.modelo} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="año">Año</Label>
                  <Input id="año" name="año" type="number" defaultValue={coche.año} required />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" defaultValue={coche.color || "Sin especificar"} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="kilometraje">Kilometraje</Label>
                  <Input id="kilometraje" name="kilometraje" type="number" defaultValue={coche.kilometraje || "0"} />
                </div>
                <div>
                  <Label htmlFor="combustible">Combustible</Label>
                  <Select name="combustible" defaultValue={coche.combustible || "gasolina"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar combustible" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasolina">Gasolina</SelectItem>
                      <SelectItem value="diesel">Diésel</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                      <SelectItem value="electrico">Eléctrico</SelectItem>
                      <SelectItem value="gas">Gas</SelectItem>
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
                  placeholder="Equipamiento adicional, características especiales..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Guardar Cambios
                </Button>
                <Link href={`/coches/detalle/${coche.matricula}`}>
                  <Button variant="outline">Ver Detalles</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Editor de ubicación */}
        <div>
          <UbicacionEditor
            matricula={coche.matricula}
            latitud={coche.latitud}
            longitud={coche.longitud}
            direccion_actual={coche.direccion_actual}
            onUbicacionGuardada={() => {
              // Recargar la página para mostrar los cambios
              window.location.reload()
            }}
          />
        </div>
      </div>
    </div>
  )
}
