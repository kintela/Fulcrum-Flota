import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Car, Plus } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

async function getCoches() {
  const { data: coches, error } = await supabase
    .from("coches")
    .select(`
      *,
      empleados (
        id,
        nombre,
        apellidos
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching coches:", error)
    return []
  }

  return coches || []
}

export default async function CochesPage() {
  const coches = await getCoches()

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Coches</h1>
            <p className="text-gray-600">Administra la flota de vehículos ({coches.length} vehículos)</p>
          </div>
          <Link
            href="/coches/nuevo"
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Coche
          </Link>
        </div>

        {coches.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay vehículos registrados</h3>
              <p className="text-gray-600 mb-4">Comienza agregando tu primer vehículo a la flota.</p>
              <Link
                href="/coches/nuevo"
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                <Plus className="h-5 w-5 mr-2" />
                Agregar Primer Coche
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coches.map((coche) => (
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
                      {coche.empleados && (
                        <p className="text-sm text-blue-600 font-medium text-right">
                          {coche.empleados.nombre} {coche.empleados.apellidos}
                        </p>
                      )}
                      {coche.alquiler && !coche.empleados && (
                        <p className="text-sm text-purple-600 font-medium">Alquiler</p>
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
                      href={`/coches/${encodeURIComponent(coche.matricula)}`}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
                    >
                      Ver detalles
                    </Link>
                    <Link
                      href={`/coches/${encodeURIComponent(coche.matricula)}/editar`}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm"
                    >
                      Editar
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
