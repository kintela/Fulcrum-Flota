import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Car, Calendar, User, Wrench } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

async function getCoche(id: string) {
  if (!id || id === "undefined") {
    return null
  }

  try {
    const { data, error } = await supabase
      .from("coches")
      .select(`
        *,
        empleados (
          id,
          nombre,
          apellidos
        )
      `)
      .eq("matricula", id)

    if (error) {
      console.error("Error al obtener coche:", error)
      return null
    }

    // Si no hay datos, retornar null
    if (!data || data.length === 0) {
      return null
    }

    // Si hay múltiples registros, tomar el primero y registrar advertencia
    if (data.length > 1) {
      console.warn(`Múltiples coches encontrados con matrícula ${id}, tomando el primero`)
    }

    return data[0]
  } catch (error) {
    console.error("Error en getCoche:", error)
    return null
  }
}

interface CocheDetailPageProps {
  params: { id: string }
}

export default async function CocheDetailPage({ params }: CocheDetailPageProps) {
  const coche = await getCoche(params.id)

  if (!coche) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Coche no encontrado</h1>
          <p className="text-gray-600 mb-8">No se pudo encontrar el coche con matrícula {params.id}</p>
          <Link href="/coches" className="text-blue-600 hover:underline">
            Volver a la lista de coches
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link href="/coches" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver a Coches
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{coche.matricula}</h1>
              <p className="text-gray-600">
                {coche.marca} {coche.modelo}
              </p>
            </div>
          </div>
          <Link
            href={`/coches/${encodeURIComponent(coche.matricula)}/editar`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Editar Coche
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Car className="h-5 w-5 mr-2" />
                Información del Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Matrícula:</span>
                <span className="font-medium">{coche.matricula}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Marca:</span>
                <span>{coche.marca}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Modelo:</span>
                <span>{coche.modelo}</span>
              </div>
              {coche.color && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Color:</span>
                  <span>{coche.color}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Combustible:</span>
                <span>{coche.combustible}</span>
              </div>
              {coche.fechamatriculacion && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha matriculación:</span>
                  <span>{new Date(coche.fechamatriculacion).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información técnica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="h-5 w-5 mr-2" />
                Información Técnica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Kilómetros:</span>
                <span>{coche.kms?.toLocaleString() || 0} km</span>
              </div>
              {coche.kw && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Potencia (kW):</span>
                  <span>{coche.kw} kW</span>
                </div>
              )}
              {coche.cv && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Potencia (CV):</span>
                  <span>{coche.cv} CV</span>
                </div>
              )}
              {coche.cc && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cilindrada:</span>
                  <span>{coche.cc} cc</span>
                </div>
              )}
              {coche.preciocompra && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Precio compra:</span>
                  <span>{coche.preciocompra.toLocaleString()} €</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Asignación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Asignación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {coche.alquiler ? (
                <div className="text-center py-4">
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                    Vehículo de Alquiler
                  </span>
                </div>
              ) : coche.empleados ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Empleado:</span>
                    <span className="font-medium">
                      {coche.empleados.nombre} {coche.empleados.apellidos}
                    </span>
                  </div>
                  {coche.fecha_asignacion && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fecha asignación:</span>
                      <span>{new Date(coche.fecha_asignacion).toLocaleDateString()}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <span className="text-gray-500">Sin asignar</span>
                </div>
              )}

              {coche.donante && (
                <div className="text-center">
                  <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">Vehículo Donante</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extras y observaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Información Adicional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {coche.extras && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Extras y Equipamiento:</h4>
                  <p className="text-gray-600 text-sm">{coche.extras}</p>
                </div>
              )}

              {coche.observaciones_asignacion && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Observaciones de Asignación:</h4>
                  <p className="text-gray-600 text-sm">{coche.observaciones_asignacion}</p>
                </div>
              )}

              {coche.asignadoa && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Asignación anterior (texto):</h4>
                  <p className="text-gray-600 text-sm">{coche.asignadoa}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
