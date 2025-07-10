import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Car, Calendar, User } from "lucide-react"
import Link from "next/link"
import { editarCoche } from "./actions"
import { FotosManager } from "@/components/fotos-manager"
import { SolredManager } from "@/components/solred-manager"
import { SeguroManager } from "@/components/seguro-manager"
import { ItvManager } from "@/components/itv-manager"
import { ViatManager } from "@/components/viat-manager"
import { UbicacionEditor } from "@/components/ubicacion-editor"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface PageProps {
  params: {
    id: string
  }
}

export default async function EditarCochePage({ params }: PageProps) {
  const { id } = params

  // Obtener datos del coche
  const { data: coche, error } = await supabase.from("coches").select("*").eq("matricula", id).single()

  if (error || !coche) {
    console.error("Error obteniendo coche:", error)
    notFound()
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
          <p className="text-muted-foreground">Modificar información del vehículo {coche.matricula}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información básica */}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="marca">Marca</Label>
                  <Input id="marca" name="marca" defaultValue={coche.marca} required />
                </div>
                <div>
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input id="modelo" name="modelo" defaultValue={coche.modelo} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="año">Año</Label>
                  <Input id="año" name="año" type="number" min="1900" max="2030" defaultValue={coche.año} required />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" defaultValue={coche.color || "Sin especificar"} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    defaultValue={coche.kilometraje || "0"}
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
                  defaultValue={coche.extras || "Sin especificar"}
                  placeholder="Equipamiento adicional, características especiales..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="donante" name="donante" defaultChecked={coche.donante} className="rounded" />
                <Label htmlFor="donante">Vehículo donante (para piezas)</Label>
              </div>

              <Button type="submit" className="w-full">
                Guardar Cambios
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Estado del vehículo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Estado del Vehículo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Estado</Label>
                <Badge variant={coche.donante ? "destructive" : "default"}>
                  {coche.donante ? "Donante" : "Activo"}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">Asignación</Label>
                <Badge variant={coche.asignadoa ? "default" : "secondary"}>
                  {coche.asignadoa ? "Asignado" : "Disponible"}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Fecha de registro</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(coche.created_at).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {coche.asignadoa && empleados && (
              <div>
                <Label className="text-sm font-medium">Empleado asignado</Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {empleados.find((e) => e.id.toString() === coche.asignadoa?.toString())?.nombre}{" "}
                    {empleados.find((e) => e.id.toString() === coche.asignadoa?.toString())?.apellidos}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ubicación */}
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

      {/* Gestión de fotos */}
      <FotosManager matricula={coche.matricula} />

      {/* Gestión de tarjetas SOLRED */}
      <SolredManager matricula={coche.matricula} />

      {/* Gestión de seguros */}
      <SeguroManager matricula={coche.matricula} />

      {/* Gestión de ITVs */}
      <ItvManager matricula={coche.matricula} />

      {/* Gestión de ViaT */}
      <ViatManager matricula={coche.matricula} />
    </div>
  )
}
