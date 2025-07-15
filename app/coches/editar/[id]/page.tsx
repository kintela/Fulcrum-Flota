import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Car, User, FileText, MapPin, Settings, Camera } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { editarCoche } from "./actions"
import { FotosManager } from "@/components/fotos-manager"
import { UbicacionEditor } from "@/components/ubicacion-editor"

async function getCoche(matricula: string) {
  const supabase = createClient()

  const { data: coche, error } = await supabase
    .from("coches")
    .select(`
      *,
      empleados (
        id,
        nombre,
        apellidos,
        email
      )
    `)
    .eq("matricula", matricula)
    .single()

  if (error || !coche) {
    return null
  }

  return coche
}

async function getEmpleados() {
  const supabase = createClient()

  const { data: empleados, error } = await supabase
    .from("empleados")
    .select("id, nombre, apellidos, email")
    .order("nombre")

  if (error) {
    console.error("Error obteniendo empleados:", error)
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

  const empleadoAsignado = coche.empleados

  return (
    <div className="container mx-auto py-6 space-y-6">
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
            <h1 className="text-3xl font-bold">Editar Vehículo</h1>
            <p className="text-muted-foreground">Modificar información del vehículo {coche.matricula}</p>
          </div>
        </div>
        <Badge variant={coche.donante ? "destructive" : "default"}>{coche.donante ? "Donante" : "Activo"}</Badge>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="asignacion" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Asignación
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="ubicacion" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Ubicación
          </TabsTrigger>
          <TabsTrigger value="mantenimiento" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Mantenimiento
          </TabsTrigger>
          <TabsTrigger value="fotos" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Fotos
          </TabsTrigger>
        </TabsList>

        {/* Tab General */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={editarCoche} className="space-y-6">
                <input type="hidden" name="matricula" value={coche.matricula} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="matricula_display">Matrícula</Label>
                    <Input id="matricula_display" value={coche.matricula} disabled className="bg-muted" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marca">Marca</Label>
                    <Input id="marca" name="marca" defaultValue={coche.marca || "N/A"} placeholder="Ej: Toyota" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="modelo">Modelo</Label>
                    <Input id="modelo" name="modelo" defaultValue={coche.modelo || "N/A"} placeholder="Ej: Corolla" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input id="color" name="color" defaultValue={coche.color || "N/A"} placeholder="Ej: Blanco" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="año">Año</Label>
                    <Input
                      id="año"
                      name="año"
                      type="number"
                      min="1900"
                      max="2030"
                      defaultValue={coche.año || "1900"}
                      placeholder="Ej: 2020"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kilometraje">Kilometraje</Label>
                    <Input
                      id="kilometraje"
                      name="kilometraje"
                      type="number"
                      min="0"
                      defaultValue={coche.kilometraje || "0"}
                      placeholder="Ej: 50000"
                    />
                  </div>

                  <div className="space-y-2">
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
                        <SelectItem value="glp">GLP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="precio">Precio (€)</Label>
                    <Input
                      id="precio"
                      name="precio"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={coche.precio || "0.00"}
                      placeholder="Ej: 15000.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="extras">Extras</Label>
                  <Textarea
                    id="extras"
                    name="extras"
                    defaultValue={coche.extras || "N/A"}
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
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="donante">Marcar como donante</Label>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button type="submit">Guardar Cambios</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Asignación */}
        <TabsContent value="asignacion">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Asignación de Empleado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={editarCoche} className="space-y-6">
                <input type="hidden" name="matricula" value={coche.matricula} />

                {empleadoAsignado && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Empleado Actual</h3>
                    <p className="text-blue-800">
                      {empleadoAsignado.nombre} {empleadoAsignado.apellidos}
                    </p>
                    <p className="text-blue-600 text-sm">{empleadoAsignado.email}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="asignadoa">Asignar a Empleado</Label>
                  <Select name="asignadoa" defaultValue={coche.asignadoa?.toString() || "0"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sin asignar</SelectItem>
                      {empleados.map((empleado) => (
                        <SelectItem key={empleado.id} value={empleado.id.toString()}>
                          {empleado.nombre} {empleado.apellidos} - {empleado.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button type="submit">Actualizar Asignación</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Documentos */}
        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={editarCoche} className="space-y-6">
                <input type="hidden" name="matricula" value={coche.matricula} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fecha_compra">Fecha de Compra</Label>
                    <Input
                      id="fecha_compra"
                      name="fecha_compra"
                      type="date"
                      defaultValue={coche.fecha_compra || "2023-01-01"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fecha_matriculacion">Fecha de Matriculación</Label>
                    <Input
                      id="fecha_matriculacion"
                      name="fecha_matriculacion"
                      type="date"
                      defaultValue={coche.fecha_matriculacion || "2023-01-01"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numero_bastidor">Número de Bastidor</Label>
                    <Input
                      id="numero_bastidor"
                      name="numero_bastidor"
                      defaultValue={coche.numero_bastidor || "N/A"}
                      placeholder="Ej: WVWZZZ1JZ3W386752"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numero_motor">Número de Motor</Label>
                    <Input
                      id="numero_motor"
                      name="numero_motor"
                      defaultValue={coche.numero_motor || "N/A"}
                      placeholder="Ej: CBZ123456"
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button type="submit">Guardar Documentación</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Ubicación */}
        <TabsContent value="ubicacion">
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
        </TabsContent>

        {/* Tab Mantenimiento */}
        <TabsContent value="mantenimiento">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Información de Mantenimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={editarCoche} className="space-y-6">
                <input type="hidden" name="matricula" value={coche.matricula} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="ultimo_mantenimiento">Último Mantenimiento</Label>
                    <Input
                      id="ultimo_mantenimiento"
                      name="ultimo_mantenimiento"
                      type="date"
                      defaultValue={coche.ultimo_mantenimiento || "2023-01-01"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proximo_mantenimiento">Próximo Mantenimiento</Label>
                    <Input
                      id="proximo_mantenimiento"
                      name="proximo_mantenimiento"
                      type="date"
                      defaultValue={coche.proximo_mantenimiento || "2023-01-01"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="km_ultimo_mantenimiento">KM Último Mantenimiento</Label>
                    <Input
                      id="km_ultimo_mantenimiento"
                      name="km_ultimo_mantenimiento"
                      type="number"
                      min="0"
                      defaultValue={coche.km_ultimo_mantenimiento || "0"}
                      placeholder="Ej: 45000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="km_proximo_mantenimiento">KM Próximo Mantenimiento</Label>
                    <Input
                      id="km_proximo_mantenimiento"
                      name="km_proximo_mantenimiento"
                      type="number"
                      min="0"
                      defaultValue={coche.km_proximo_mantenimiento || "0"}
                      placeholder="Ej: 55000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notas_mantenimiento">Notas de Mantenimiento</Label>
                  <Textarea
                    id="notas_mantenimiento"
                    name="notas_mantenimiento"
                    defaultValue={coche.notas_mantenimiento || "N/A"}
                    placeholder="Notas sobre el mantenimiento del vehículo..."
                    rows={4}
                  />
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button type="submit">Guardar Mantenimiento</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Fotos */}
        <TabsContent value="fotos">
          <FotosManager matricula={coche.matricula} tipo="coche" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
