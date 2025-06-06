import { Card, CardContent } from "@/components/ui/card"
import { Car, Users, AlertTriangle } from "lucide-react"
import { obtenerCoches } from "@/app/actions/coches"

export default async function HomePage() {
  const cochesData = await obtenerCoches()

  // Calculate real statistics
  const stats = {
    totalCoches: cochesData.length,
    cochesDisponibles: cochesData.filter((c: any) => c.estado === "Disponible").length,
    cochesAsignados: cochesData.filter((c: any) => c.asignado_a !== null).length,
    totalEmpleados: 7, // This could also be fetched from database
    segurosProximosVencer: cochesData.filter((c: any) => {
      if (!c.fecha_seguro) return false
      const fechaSeguro = new Date(c.fecha_seguro)
      const hoy = new Date()
      const treintaDias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)
      return fechaSeguro <= treintaDias && fechaSeguro >= hoy
    }).length,
    itvsProximasVencer: cochesData.filter((c: any) => {
      if (!c.fecha_itv) return false
      const fechaItv = new Date(c.fecha_itv)
      const hoy = new Date()
      const sesentaDias = new Date(hoy.getTime() + 60 * 24 * 60 * 60 * 1000)
      return fechaItv <= sesentaDias && fechaItv >= hoy
    }).length,
  }

  // Get recent vehicles (first 3)
  const vehiculosRecientes = cochesData.slice(0, 3).map((coche: any) => ({
    matricula: coche.matricula,
    marca: coche.marca,
    modelo: coche.modelo,
    asignadoA: coche.asignado_a,
    estado: coche.estado,
  }))

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Resumen general de la flota</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-50">
                  <Car className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Coches</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCoches}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-50">
                  <Car className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Disponibles</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.cochesDisponibles}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-orange-50">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Asignados</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.cochesAsignados}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-50">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Empleados</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEmpleados}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-red-50">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Alertas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.segurosProximosVencer + stats.itvsProximasVencer}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vehículos recientes */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">Vehículos Recientes</h2>
            <div className="space-y-3">
              {vehiculosRecientes.map((vehiculo: any) => (
                <div
                  key={vehiculo.matricula}
                  className="flex justify-between items-center p-3 border rounded hover:bg-gray-50"
                >
                  <div>
                    <h3 className="font-semibold">
                      {vehiculo.matricula} - {vehiculo.marca} {vehiculo.modelo}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {vehiculo.asignadoA ? `Asignado a: ${vehiculo.asignadoA}` : "Disponible para asignación"}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      vehiculo.estado === "Activo"
                        ? "bg-green-100 text-green-800"
                        : vehiculo.estado === "Disponible"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {vehiculo.estado}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card className="mb-8 border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center text-yellow-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Alertas Importantes
            </h2>
            <div className="space-y-2">
              <p className="text-yellow-700">
                • {stats.segurosProximosVencer} seguro(s) vencen en los próximos 30 días
              </p>
              <p className="text-yellow-700">• {stats.itvsProximasVencer} ITV(s) vencen en los próximos 60 días</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
