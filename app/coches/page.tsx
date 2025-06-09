import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Car, Plus, Filter, Users, Calendar } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

// Tipo para los parámetros de búsqueda
interface SearchParams {
  filter?: string
}

async function getCoches(filter?: string) {
  let query = supabase.from("coches").select(`
      *,
      empleados (
        id,
        nombre,
        apellidos
      )
    `)

  // Aplicar filtros según el parámetro
  if (filter === "assigned") {
    // Coches asignados (por empleado_id o asignadoa)
    query = query.or(`empleado_id.not.is.null,asignadoa.not.is.null,and(asignadoa.neq.'')`)
  } else if (filter === "available") {
    // Coches disponibles (no asignados y no de alquiler)
    query = query.is("empleado_id", null).is("asignadoa", null).eq("alquiler", false)
  } else if (filter === "rental") {
    // Coches de alquiler
    query = query.eq("alquiler", true)
  }

  const { data: coches, error } = await query.order("matricula", { ascending: true })

  if (error) {
    console.error("Error fetching coches:", error)
    return []
  }

  return coches || []
}

export default async function CochesPage({ searchParams }: { searchParams: SearchParams }) {
  // Obtener el filtro de los parámetros de búsqueda
  const filter = searchParams.filter
  const coches = await getCoches(filter)

  // Determinar el título según el filtro
  let title = "Gestión de Coches"
  let subtitle = `Administra la flota de vehículos (${coches.length} vehículos)`

  if (filter === "assigned") {
    title = "Coches Asignados"
    subtitle = `Vehículos asignados a empleados (${coches.length} vehículos)`
  } else if (filter === "available") {
    title = "Coches Disponibles"
    subtitle = `Vehículos disponibles para asignación (${coches.length} vehículos)`
  } else if (filter === "rental") {
    title = "Coches de Alquiler"
    subtitle = `Vehículos de alquiler (${coches.length} vehículos)`
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-600">{subtitle}</p>
          </div>
          <div className="flex gap-2">
            {filter && (
              <Link
                href="/coches"
                className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
              >
                <Filter className="h-5 w-5 mr-2" />
                Quitar filtros
              </Link>
            )}
            <Link
              href="/coches/nuevo"
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nuevo Coche
            </Link>
          </div>
        </div>

        {/* Filtros rápidos */}
        {!filter && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Link
              href="/coches?filter=assigned"
              className="bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-1.5 rounded-md text-sm flex items-center"
            >
              <Users className="h-4 w-4 mr-1.5" />
              Ver asignados
            </Link>
            <Link
              href="/coches?filter=available"
              className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1.5 rounded-md text-sm flex items-center"
            >
              <Car className="h-4 w-4 mr-1.5" />
              Ver disponibles
            </Link>
            <Link
              href="/coches?filter=rental"
              className="bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-1.5 rounded-md text-sm flex items-center"
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              Ver alquileres
            </Link>
          </div>
        )}

        {coches.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filter ? "No hay vehículos que coincidan con el filtro" : "No hay vehículos registrados"}
              </h3>
              <p className="text-gray-600 mb-4">
                {filter
                  ? "Prueba con otro filtro o agrega nuevos vehículos a la flota."
                  : "Comienza agregando tu primer vehículo a la flota."}
              </p>
              <div className="flex justify-center gap-4">
                {filter && (
                  <Link
                    href="/coches"
                    className="inline-flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                  >
                    <Filter className="h-5 w-5 mr-2" />
                    Ver todos los coches
                  </Link>
                )}
                <Link
                  href="/coches/nuevo"
                  className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {filter ? "Agregar Vehículo" : "Agregar Primer Coche"}
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coches.map((coche) => {
              // Determinar quién está asignado: empleado por relación o texto legacy
              const empleadoAsignado = coche.empleados
                ? `${coche.empleados.nombre} ${coche.empleados.apellidos}`
                : coche.asignadoa || null

              return (
                <Card key={coche.matricula} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{coche.matricula}</CardTitle>
                        <p className="text-gray-600">
                          {coche.marca} {coche.modelo}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <Car className="h-6 w-6 text-gray-400 mb-1" />
                        {empleadoAsignado ? (
                          <p className="text-sm text-blue-600 font-medium text-right">{empleadoAsignado}</p>
                        ) : coche.alquiler ? (
                          <p className="text-sm text-purple-600 font-medium">Alquiler</p>
                        ) : (
                          <p className="text-sm text-gray-400">Sin asignar</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {coche.color && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Color:</span>
                          <span>{coche.color}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Kilómetros:</span>
                        <span>{coche.kms?.toLocaleString() || 0} km</span>
                      </div>
                      {coche.combustible && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Combustible:</span>
                          <span>{coche.combustible}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {coche.donante && (
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">Donante</span>
                      )}
                      {coche.alquiler && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">Alquiler</span>
                      )}
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/coches/detalle/${encodeURIComponent(coche.matricula)}`}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
                      >
                        Ver detalles
                      </Link>
                      <Link
                        href={`/coches/editar/${encodeURIComponent(coche.matricula)}`}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm"
                      >
                        Editar
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
