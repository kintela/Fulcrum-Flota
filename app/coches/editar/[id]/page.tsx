import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Car, User, Calendar, MapPin } from "lucide-react"
import Link from "next/link"
import { EditarCocheForm } from "./editar-coche-form"
import { UbicacionEditor } from "@/components/ubicacion-editor"

async function getCocheData(matricula: string) {
  try {
    // Obtener datos del coche
    const { data: coche, error: cocheError } = await supabase
      .from("coches")
      .select("*")
      .eq("matricula", matricula)
      .single()

    if (cocheError) {
      console.error("Error fetching coche:", cocheError)
      return { coche: null, empleados: [] }
    }

    // Obtener lista de empleados para el selector
    const { data: empleados, error: empleadosError } = await supabase
      .from("empleados")
      .select("id, nombre, apellidos")
      .order("nombre")

    if (empleadosError) {
      console.error("Error fetching empleados:", empleadosError)
    }

    return {
      coche,
      empleados: empleados || [],
    }
  } catch (error) {
    console.error("Error in getCocheData:", error)
    return { coche: null, empleados: [] }
  }
}

export default async function EditarCochePage({ params }: { params: { id: string } }) {
  const matricula = decodeURIComponent(params.id)
  const { coche, empleados } = await getCocheData(matricula)

  if (!coche) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Vehículo no encontrado</h1>
              <p className="text-gray-600 mb-6">No se pudo encontrar el vehículo con matrícula: {matricula}</p>
              <Link href="/coches">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a la lista
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Obtener información del empleado asignado
  const getEmpleadoInfo = () => {
    if (!coche.asignadoa) return null

    const empleadoId = Number(coche.asignadoa)
    if (!isNaN(empleadoId)) {
      return empleados.find((emp) => emp.id === empleadoId)
    }

    if (typeof coche.asignadoa === "string" && coche.asignadoa.trim() !== "") {
      return { nombre: coche.asignadoa, apellidos: "" }
    }

    return null
  }

  const empleadoInfo = getEmpleadoInfo()

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Vehículo</h1>
            <p className="text-gray-600">Modificar información del vehículo {matricula}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/coches/detalle/${matricula}`}>
              <Button variant="outline">
                <Car className="h-4 w-4 mr-2" />
                Ver Detalles
              </Button>
            </Link>
            <Link href="/coches">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>
        </div>

        {/* Información actual del vehículo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Información Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Matrícula</p>
                <p className="text-lg font-semibold">{coche.matricula}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Vehículo</p>
                <p className="text-lg font-semibold">
                  {coche.marca} {coche.modelo}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Estado</p>
                <div className="flex items-center gap-2">
                  {coche.donante ? (
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">Donante</span>
                  ) : empleadoInfo ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">Asignado</span>
                  ) : (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">Disponible</span>
                  )}
                </div>
              </div>
              {empleadoInfo && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Asignado a</p>
                  <p className="text-lg font-semibold flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {empleadoInfo.nombre} {empleadoInfo.apellidos}
                  </p>
                </div>
              )}
            </div>

            {/* Información de ubicación actual */}
            {coche.latitud && coche.longitud && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Ubicación Actual
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700 font-medium">Coordenadas</p>
                    <p className="text-blue-600">
                      {coche.latitud}, {coche.longitud}
                    </p>
                  </div>
                  {coche.direccion_actual && (
                    <div>
                      <p className="text-blue-700 font-medium">Dirección</p>
                      <p className="text-blue-600">{coche.direccion_actual}</p>
                    </div>
                  )}
                  {coche.ultima_ubicacion && (
                    <div>
                      <p className="text-blue-700 font-medium">Última actualización</p>
                      <p className="text-blue-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(coche.ultima_ubicacion).toLocaleString("es-ES")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulario de edición */}
        <EditarCocheForm coche={coche} empleados={empleados} />

        {/* Editor de ubicación */}
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
  )
}
