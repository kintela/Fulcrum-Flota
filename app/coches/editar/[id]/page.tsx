import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Car, MapPin, Calendar, User, FileText } from "lucide-react"
import Link from "next/link"
import { UbicacionEditor } from "@/components/ubicacion-editor"
import { FotosManager } from "@/components/fotos-manager"
import { SeguroManager } from "@/components/seguro-manager"
import { ItvManager } from "@/components/itv-manager"
import { SolredManager } from "@/components/solred-manager"
import { ViatManager } from "@/components/viat-manager"
import { editarCocheAction } from "./actions"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface PageProps {
  params: {
    id: string
  }
}

export default async function EditarCochePage({ params }: PageProps) {
  // Obtener datos del coche
  const { data: coche, error } = await supabase.from("coches").select("*").eq("matricula", params.id).single()

  if (error || !coche) {
    notFound()
  }

  // Obtener empleados para el selector
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
            <form action={editarCocheAction} className="space-y-4">
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
                  <Input id="año" name="año" type="number" defaultValue={coche.año} min="1900" max="2030" />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" defaultValue={coche.color || "Sin especificar"} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="kilometraje">Kilometraje</Label>
                  <Input
                    id="kilometraje"
                    name="kilometraje"
                    type="number"
                    defaultValue={coche.kilometraje || "0"}
                    min="0"
                  />
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

              <div className="flex items-center gap-2">
                <input type="checkbox" id="donante" name="donante" defaultChecked={coche.donante} className="rounded" />
                <Label htmlFor="donante">Vehículo donante</Label>
              </div>

              <Button type="submit" className="w-full">
                <Car className="h-4 w-4 mr-2" />
                Guardar Cambios
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Estado del vehículo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Estado del Vehículo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Matrícula</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="font-mono">
                    {coche.matricula}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Estado</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={coche.donante ? "destructive" : "default"}>
                    {coche.donante ? "Donante" : "Activo"}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Asignación</Label>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {coche.asignadoa
                    ? empleados?.find((e) => e.id.toString() === coche.asignadoa?.toString())
                      ? `${empleados.find((e) => e.id.toString() === coche.asignadoa?.toString())?.nombre} ${empleados.find((e) => e.id.toString() === coche.asignadoa?.toString())?.apellidos}`
                      : coche.asignadoa
                    : "Sin asignar"}
                </span>
              </div>
            </div>

            {coche.ultima_ubicacion && (
              <div>
                <Label className="text-sm font-medium">Última ubicación</Label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{new Date(coche.ultima_ubicacion).toLocaleString()}</span>
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">Fecha de registro</Label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{new Date(coche.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Editor de ubicación */}
      <UbicacionEditor
        matricula={coche.matricula}
        latitud={coche.latitud}
        longitud={coche.longitud}
        direccion_actual={coche.direccion_actual}
      />

      {/* Gestores de servicios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seguros */}
        <SeguroManager matricula={coche.matricula} />

        {/* ITV */}
        <ItvManager matricula={coche.matricula} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solred */}
        <SolredManager matricula={coche.matricula} />

        {/* ViaT */}
        <ViatManager matricula={coche.matricula} />
      </div>

      {/* Fotos */}
      <FotosManager matricula={coche.matricula} />
    </div>
  )
}
