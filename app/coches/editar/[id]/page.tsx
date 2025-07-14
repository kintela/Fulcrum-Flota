import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Car, User, FileText, MapPin } from "lucide-react"
import Link from "next/link"
import { editarCoche } from "./actions"
import { UbicacionEditor } from "@/components/ubicacion-editor"
import { redirect } from "next/navigation"

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
    redirect("/coches")
  }

  // Obtener empleados para el select
  const { data: empleados } = await supabase.from("empleados").select("id, nombre, apellidos").order("nombre")

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
          <h1 className="text-3xl font-bold">Editar Vehículo</h1>
          <p className="text-muted-foreground">Matrícula: {coche.matricula}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de edición */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Información del Vehículo
            </CardTitle>
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
                  <Input id="año" name="año" type="number" defaultValue={coche.año} />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" defaultValue={coche.color} />
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
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="kilometraje">Kilometraje</Label>
                  <Input id="kilometraje" name="kilometraje" type="number" defaultValue={coche.kilometraje} />
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
                  defaultValue={coche.extras}
                  placeholder="Descripción de extras del vehículo..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="donante" name="donante" defaultChecked={coche.donante} className="rounded" />
                <Label htmlFor="donante">Vehículo donante</Label>
              </div>

              <Button type="submit" className="w-full">
                Guardar Cambios
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Editor de ubicación */}
        <div className="space-y-6">
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

          {/* Información adicional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información Adicional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Estado</Label>
                <div className="mt-1">
                  <Badge variant={coche.donante ? "destructive" : "default"}>
                    {coche.donante ? "Donante" : "Activo"}
                  </Badge>
                </div>
              </div>

              {coche.asignadoa && (
                <div>
                  <Label className="text-sm font-medium">Empleado Asignado</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm">
                      {empleados?.find((e) => e.id === coche.asignadoa)?.nombre}{" "}
                      {empleados?.find((e) => e.id === coche.asignadoa)?.apellidos}
                    </span>
                  </div>
                </div>
              )}

              {(coche.latitud || coche.longitud) && (
                <div>
                  <Label className="text-sm font-medium">Ubicación</Label>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {coche.latitud?.toFixed(6)}, {coche.longitud?.toFixed(6)}
                      </span>
                    </div>
                    {coche.direccion_actual && (
                      <p className="text-sm text-muted-foreground">{coche.direccion_actual}</p>
                    )}
                    {coche.ultima_ubicacion && (
                      <p className="text-xs text-muted-foreground">
                        Última actualización: {new Date(coche.ultima_ubicacion).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Fecha de Creación</Label>
                <p className="text-sm text-muted-foreground">{new Date(coche.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
