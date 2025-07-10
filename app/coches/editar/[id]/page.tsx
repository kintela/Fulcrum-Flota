import { createClient } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Car, Save } from "lucide-react"
import Link from "next/link"
import { editarCoche } from "./actions"
import { UbicacionEditor } from "@/components/ubicacion-editor"
import { FotosManager } from "@/components/fotos-manager"
import { SeguroManager } from "@/components/seguro-manager"
import { SolredManager } from "@/components/solred-manager"
import { ViatManager } from "@/components/viat-manager"
import { ItvManager } from "@/components/itv-manager"

interface PageProps {
  params: {
    id: string
  }
}

export default async function EditarCochePage({ params }: PageProps) {
  const supabase = createClient()

  // Obtener datos del coche
  const { data: coche, error } = await supabase.from("coches").select("*").eq("matricula", params.id).single()

  if (error || !coche) {
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Car className="h-8 w-8" />
            Editar Vehículo
          </h1>
          <p className="text-muted-foreground">Modificar información del vehículo {coche.matricula}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario principal */}
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
                  <Input id="año" name="año" type="number" min="1900" max="2030" defaultValue={coche.año} required />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" defaultValue={coche.color || "Sin especificar"} />
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
                    defaultValue={coche.kilometraje || "0"}
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
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  name="observaciones"
                  defaultValue={coche.observaciones || "Sin observaciones"}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="extras">Extras</Label>
                <Textarea
                  id="extras"
                  name="extras"
                  defaultValue={coche.extras || "Sin extras"}
                  placeholder="Aire acondicionado, GPS, etc."
                  rows={2}
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

        {/* Editor de ubicación */}
        <UbicacionEditor
          matricula={coche.matricula}
          latitud={coche.latitud}
          longitud={coche.longitud}
          direccion_actual={coche.direccion_actual}
        />
      </div>

      {/* Gestores adicionales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FotosManager matricula={coche.matricula} />
        <SeguroManager matricula={coche.matricula} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SolredManager matricula={coche.matricula} />
        <ViatManager matricula={coche.matricula} />
      </div>

      <ItvManager matricula={coche.matricula} />
    </div>
  )
}
