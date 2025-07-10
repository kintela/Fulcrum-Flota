import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Car, User, FileText, Calendar, Fuel, Settings } from "lucide-react"
import { UbicacionEditor } from "@/components/ubicacion-editor"
import { FotosManager } from "@/components/fotos-manager"
import { SeguroManager } from "@/components/seguro-manager"
import { ITVManager } from "@/components/itv-manager"
import { SolredManager } from "@/components/solred-manager"
import { ViatManager } from "@/components/viat-manager"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

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
            <h1 className="text-3xl font-bold tracking-tight">Editar Vehículo</h1>
            <p className="text-muted-foreground">Gestiona la información completa del vehículo {coche.matricula}</p>
          </div>
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
            {coche.fechamatriculacion && (
              <div>
                <label className="text-sm font-medium text-gray-500">Fecha Matriculación</label>
                <p className="text-lg">{new Date(coche.fechamatriculacion).toLocaleDateString("es-ES")}</p>
              </div>
            )}
            {coche.color && (
              <div>
                <label className="text-sm font-medium text-gray-500">Color</label>
                <p className="text-lg">{coche.color}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Combustible</label>
              <p className="text-lg flex items-center gap-2">
                <Fuel className="h-4 w-4" />
                {coche.combustible}
              </p>
            </div>
            {coche.kms && (
              <div>
                <label className="text-sm font-medium text-gray-500">Kilómetros</label>
                <p className="text-lg">{coche.kms.toLocaleString()} km</p>
              </div>
            )}
            {coche.kw && (
              <div>
                <label className="text-sm font-medium text-gray-500">Potencia</label>
                <p className="text-lg">
                  {coche.kw} kW {coche.cv && `(${coche.cv} CV)`}
                </p>
              </div>
            )}
            {coche.cc && (
              <div>
                <label className="text-sm font-medium text-gray-500">Cilindrada</label>
                <p className="text-lg">{coche.cc} cc</p>
              </div>
            )}
          </div>
          {coche.extras && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-500">Extras</label>
              <p className="text-sm text-gray-700 mt-1">{coche.extras}</p>
            </div>
          )}
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
            {coche.fecha_asignacion && (
              <p className="text-sm text-gray-500 mt-1">
                Fecha de asignación: {new Date(coche.fecha_asignacion).toLocaleDateString("es-ES")}
              </p>
            )}
            {coche.observaciones_asignacion && (
              <p className="text-sm text-gray-700 mt-2">{coche.observaciones_asignacion}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Información de alquiler */}
      {coche.alquiler && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Información de Alquiler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coche.compania && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Compañía</label>
                  <p className="text-lg">{coche.compania}</p>
                </div>
              )}
              {coche.fecha_inicio && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Fecha Inicio</label>
                  <p className="text-lg">{new Date(coche.fecha_inicio).toLocaleDateString("es-ES")}</p>
                </div>
              )}
              {coche.fecha_fin && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Fecha Fin</label>
                  <p className="text-lg">{new Date(coche.fecha_fin).toLocaleDateString("es-ES")}</p>
                </div>
              )}
              {coche.importe_anual && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Importe Anual</label>
                  <p className="text-lg">{coche.importe_anual.toLocaleString()} €</p>
                </div>
              )}
              {coche.kms_anuales && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Kilómetros Anuales</label>
                  <p className="text-lg">{coche.kms_anuales.toLocaleString()} km</p>
                </div>
              )}
            </div>
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
        onUbicacionGuardada={() => {
          // Recargar la página para mostrar los cambios
          window.location.reload()
        }}
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
          <FotosManager matricula={coche.matricula} isEditing={true} />
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
          <SeguroManager matricula={coche.matricula} isEditing={true} />
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
          <ITVManager matricula={coche.matricula} isEditing={true} />
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
          <SolredManager matricula={coche.matricula} isEditing={true} />
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
          <ViatManager empleadoId={coche.empleado_id} showEmployeeAssignment={false} isEditing={true} />
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex gap-4 pt-6">
        <Link href={`/coches/detalle/${coche.matricula}`}>
          <Button variant="outline">Ver Detalles Completos</Button>
        </Link>
        <Link href="/coches">
          <Button>Volver a Lista de Vehículos</Button>
        </Link>
      </div>
    </div>
  )
}
