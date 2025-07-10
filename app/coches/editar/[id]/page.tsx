import { createClient } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Car, Calendar, User, FileText, Wrench, Shield, CreditCard, Fuel } from "lucide-react"
import Link from "next/link"
import { FotosManager } from "@/components/fotos-manager"
import { SeguroManager } from "@/components/seguro-manager"
import { SolredManager } from "@/components/solred-manager"
import { ItvManager } from "@/components/itv-manager"
import { ViatManager } from "@/components/viat-manager"
import { UbicacionEditor } from "@/components/ubicacion-editor"
import { editarCoche } from "./actions"

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
          <p className="text-muted-foreground">Matrícula: {coche.matricula}</p>
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
                  <Input id="marca" name="marca" defaultValue={coche.marca || "Desconocida"} required />
                </div>
                <div>
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input id="modelo" name="modelo" defaultValue={coche.modelo || "Desconocido"} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="año">Año</Label>
                  <Input id="año" name="año" type="number" defaultValue={coche.año || "0"} />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" defaultValue={coche.color || "Desconocido"} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="kilometros">Kilómetros</Label>
                  <Input id="kilometros" name="kilometros" type="number" defaultValue={coche.kilometros || "0"} />
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
                  placeholder="Describe los extras del vehículo..."
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
                <Label htmlFor="donante">Vehículo donante (no operativo)</Label>
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
              <FileText className="h-5 w-5" />
              Estado del Vehículo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Estado</Label>
                <Badge variant={coche.donante ? "destructive" : "default"} className="mt-1">
                  {coche.donante ? "Donante" : "Operativo"}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">Asignación</Label>
                <Badge variant={coche.asignadoa ? "default" : "secondary"} className="mt-1">
                  {coche.asignadoa ? "Asignado" : "Disponible"}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Fechas importantes</Label>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Creado: {new Date(coche.created_at).toLocaleDateString()}</span>
                </div>
                {coche.updated_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Actualizado: {new Date(coche.updated_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {coche.asignadoa && empleados && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Empleado asignado</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm">
                      {empleados.find((e) => e.id === coche.asignadoa)?.nombre}{" "}
                      {empleados.find((e) => e.id === coche.asignadoa)?.apellidos}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Editor de Ubicación */}
      <UbicacionEditor
        matricula={coche.matricula}
        latitud={coche.latitud}
        longitud={coche.longitud}
        direccion_actual={coche.direccion_actual}
      />

      {/* Gestión de fotos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gestión de Fotos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FotosManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      {/* Gestión de seguros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gestión de Seguros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SeguroManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      {/* Gestión de ITVs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Gestión de ITVs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ItvManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      {/* Gestión de tarjetas Solred */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5" />
            Gestión de Tarjetas Solred
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SolredManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      {/* Gestión de tarjetas ViaT */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Gestión de Tarjetas ViaT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ViatManager matricula={coche.matricula} />
        </CardContent>
      </Card>
    </div>
  )
}
