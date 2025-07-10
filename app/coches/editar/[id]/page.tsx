import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Car, User, FileText, Calendar, Fuel, Settings } from "lucide-react"
import { UbicacionEditor } from "@/components/ubicacion-editor"
import { FotosManager } from "@/components/fotos-manager"
import { SeguroManager } from "@/components/seguro-manager"
import { ItvManager } from "@/components/itv-manager"
import { SolredManager } from "@/components/solred-manager"
import { ViatManager } from "@/components/viat-manager"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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
    notFound()
  }

  // Obtener empleados para el selector
  const { data: empleados } = await supabase.from("empleados").select("*").order("nombre")

  const handleUbicacionGuardada = () => {
    // Esta función se ejecutará después de guardar la ubicación
    // Podrías agregar lógica adicional aquí si es necesario
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Vehículo</h1>
          <p className="text-muted-foreground">Gestiona la información completa del vehículo {coche.matricula}</p>
        </div>
        <Badge variant={coche.donante ? "destructive" : "default"}>{coche.donante ? "Donante" : "Activo"}</Badge>
      </div>

      {/* Información básica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Información del Vehículo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Matrícula</label>
              <p className="text-lg font-semibold">{coche.matricula}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Marca</label>
              <p className="text-lg">{coche.marca}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Modelo</label>
              <p className="text-lg">{coche.modelo}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Año</label>
              <p className="text-lg">{coche.ano}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Color</label>
              <p className="text-lg">{coche.color}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Combustible</label>
              <p className="text-lg flex items-center gap-2">
                <Fuel className="h-4 w-4" />
                {coche.combustible}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asignación */}
      {coche.asignadoa && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Asignación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">
              Asignado a: <span className="font-semibold">{coche.asignadoa}</span>
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Editor de Ubicación */}
      <UbicacionEditor
        matricula={coche.matricula}
        latitudActual={coche.latitud}
        longitudActual={coche.longitud}
        direccionActual={coche.direccion_actual}
        onUbicacionGuardada={handleUbicacionGuardada}
      />

      <Separator />

      {/* Gestor de Fotos */}
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

      <Separator />

      {/* Gestor de Seguros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gestión de Seguros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SeguroManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      <Separator />

      {/* Gestor de ITV */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gestión de ITV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ItvManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      <Separator />

      {/* Gestor de Solred */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5" />
            Gestión de Solred
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SolredManager matricula={coche.matricula} />
        </CardContent>
      </Card>

      <Separator />

      {/* Gestor de Viats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gestión de Viats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ViatManager matricula={coche.matricula} />
        </CardContent>
      </Card>
    </div>
  )
}
