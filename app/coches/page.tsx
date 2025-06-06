import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Car, Plus } from "lucide-react"
import Link from "next/link"
import { obtenerCoches } from "@/app/actions/coches"

export default async function CochesPage() {
  const cochesData = await obtenerCoches()

  // Convert database results to match our interface
  const coches = cochesData.map((coche: any) => ({
    matricula: coche.matricula,
    marca: coche.marca,
    modelo: coche.modelo,
    color: coche.color,
    kms: coche.kms,
    combustible: coche.combustible,
    asignadoA: coche.asignado_a,
    donante: coche.es_donante,
    alquiler: coche.es_alquiler,
    estado: coche.estado,
  }))

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Coches</h1>
            <p className="text-gray-600">Administra la flota de vehículos</p>
          </div>
          <Link
            href="/coches/nuevo"
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Coche
          </Link>
        </div>

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
                  <Car className="h-6 w-6 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Color:</span>
                    <span>{coche.color}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Kilómetros:</span>
                    <span>{coche.kms.toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Combustible:</span>
                    <span>{coche.combustible}</span>
                  </div>
                  {coche.asignadoA && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Asignado a:</span>
                      <span className="font-medium">{coche.asignadoA}</span>
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
                  {coche.estado === "Activo" && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Activo</span>
                  )}
                  {coche.estado === "Disponible" && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">Disponible</span>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Link
                    href={`/coches/${coche.matricula}`}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
                  >
                    Ver detalles
                  </Link>
                  <Link
                    href={`/coches/${coche.matricula}/editar`}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm"
                  >
                    Editar
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
