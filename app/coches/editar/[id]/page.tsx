import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Car, Calendar, User, MapPin } from "lucide-react"
import Link from "next/link"
import { editarCoche } from "./actions"
import { UbicacionEditor } from "@/components/ubicacion-editor"

interface PageProps {
  params: {
    id: string
  }
}

export default async function EditarCochePage({ params }: PageProps) {
  const supabase = createClient()

  // Obtener datos del coche
  const { data: coche, error: cocheError } = await supabase
    .from("coches")
    .select("*")
    .eq("matricula", params.id)
    .single()

  if (cocheError || !coche) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Vehículo no encontrado</h1>
            <p className="text-gray-600 mb-4">No se pudo encontrar el vehículo con matrícula: {params.id}</p>
            <Link href="/coches">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Vehículos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Obtener empleados para el select
  const { data: empleados } = await supabase.from("empleados").select("id, nombre, apellidos").order("nombre")

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/coches">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Car className="h-8 w-8" />
              Editar Vehículo
            </h1>
            <p className="text-gray-600">Matrícula: {coche.matricula}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={coche.donante ? "destructive" : "default"}>{coche.donante ? "Donante" : "Activo"}</Badge>
          {coche.asignadoa && (
            <Badge variant="secondary">
              <User className="h-3 w-3 mr-1" />
              Asignado
            </Badge>
          )}
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
                  <Input id="marca" name="marca" defaultValue={coche.marca || ""} required />
                </div>
                <div>
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input id="modelo" name="modelo" defaultValue={coche.modelo || ""} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="año">Año</Label>
                  <Input id="año" name="año" type="number" min="1900" max="2030" defaultValue={coche.año || ""} />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" defaultValue={coche.color || ""} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="kilometraje">Kilometraje</Label>
                  <Input
                    id="kilometraje"
                    name="kilometraje"
                    type="number"
                    min="0"
                    defaultValue={coche.kilometraje || ""}
                  />
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
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="asignadoa">Asignado a</Label>
                <Select name="asignadoa" defaultValue={coche.asignadoa?.toString() || "0"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin asignar</SelectItem>
                    {empleados?.map((empleado) => (
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
                  placeholder="Aire acondicionado, GPS, etc."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="donante"
                  name="donante"
                  defaultChecked={coche.donante || false}
                  className="rounded"
                />
                <Label htmlFor="donante">Marcar como donante</Label>
              </div>

              <Button type="submit" className="w-full">
                Guardar Cambios
              </Button>
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

      {/* Información adicional */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Creado: {new Date(coche.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {coche.latitud && coche.longitud && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>
                  Ubicación: {coche.latitud.toFixed(4)}, {coche.longitud.toFixed(4)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {coche.ultima_ubicacion && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Última ubicación: {new Date(coche.ultima_ubicacion).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
