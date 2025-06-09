import { Card, CardContent } from "@/components/ui/card"
import { Car, Users, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

async function getDashboardData() {
  try {
    // Obtener estadísticas de coches
    const { data: coches, error: cochesError } = await supabase.from("coches").select("*")

    if (cochesError) {
      console.error("Error fetching coches:", cochesError)
    }

    // Obtener empleados (sin filtrar por activo ya que la columna no existe)
    const { data: empleados, error: empleadosError } = await supabase.from("empleados").select("*")

    if (empleadosError) {
      console.error("Error fetching empleados:", empleadosError)
    }

    // Obtener coches recientes
    const { data: cochesRecientes, error: recientesError } = await supabase
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
      .limit(3)

    if (recientesError) {
      console.error("Error fetching coches recientes:", recientesError)
    }

    return {
      coches: coches || [],
      empleados: empleados || [],
      cochesRecientes: cochesRecientes || [],
    }
  } catch (error) {
    console.error("Error in getDashboardData:", error)
    return {
      coches: [],
      empleados: [],
      cochesRecientes: [],
    }
  }
}

export default async function HomePage() {
  const { coches, empleados, cochesRecientes } = await getDashboardData()

  // Asegurar que todos los arrays están definidos
  const cochesArray = coches || []
  const empleadosArray = empleados || []
  const cochesRecientesArray = cochesRecientes || []

  // Calcular estadísticas reales - SIMPLIFICADO
  const stats = {
    totalCoches: cochesArray.length,
    // Coches asignados: cualquier coche que tenga valor en asignadoa (independientemente de alquiler)
    cochesAsignados: cochesArray.filter((c) => c.asignadoa && c.asignadoa.trim() !== "").length,
    totalEmpleados: empleadosArray.length,
    segurosProximosVencer: 0,
    itvsProximasVencer: 0,
  }

  // Coches disponibles: Total - Asignados
  stats.cochesDisponibles = stats.totalCoches - stats.cochesAsignados

  // Debug temporal - mostrar el desglose
  console.log("=== DEBUG ESTADÍSTICAS SIMPLIFICADO ===")
  console.log("Total coches:", stats.totalCoches)
  console.log("Coches con asignadoa:", stats.cochesAsignados)
  console.log("Coches disponibles (Total - Asignados):", stats.cochesDisponibles)

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Resumen general de la flota</p>
        </div>

        {/* Debug temporal - mostrar en pantalla */}
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="font-semibold text-yellow-800 mb-2">Debug - Cálculo simplificado:</h3>
          <div className="text-sm text-yellow-700 space-y-1">
            <p>• Total coches: {stats.totalCoches}</p>
            <p>• Coches con valor en 'asignadoa': {stats.cochesAsignados}</p>
            <p>• Disponibles (Total - Asignados): {stats.cochesDisponibles}</p>
          </div>
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
                  <Link
                    href="/coches"
                    className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {stats.totalCoches}
                  </Link>
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
                  <Link
                    href="/coches?filter=available"
                    className="text-2xl font-bold text-gray-900 hover:text-green-600 transition-colors"
                  >
                    {stats.cochesDisponibles}
                  </Link>
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
                  <Link
                    href="/coches?filter=assigned"
                    className="text-2xl font-bold text-gray-900 hover:text-orange-600 transition-colors"
                  >
                    {stats.cochesAsignados}
                  </Link>
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
                  <Link
                    href="/empleados"
                    className="text-2xl font-bold text-gray-900 hover:text-purple-600 transition-colors"
                  >
                    {stats.totalEmpleados}
                  </Link>
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
            {cochesRecientesArray.length === 0 ? (
              <div className="text-center py-8">
                <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No hay vehículos registrados</p>
                <Link
                  href="/coches/nuevo"
                  className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  <Car className="h-5 w-5 mr-2" />
                  Agregar Primer Vehículo
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {cochesRecientesArray.map((coche) => (
                  <div
                    key={coche.matricula}
                    className="flex justify-between items-center p-3 border rounded hover:bg-gray-50"
                  >
                    <div>
                      <h3 className="font-semibold">
                        {coche.matricula} - {coche.marca} {coche.modelo}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {coche.empleados
                          ? `Asignado a: ${coche.empleados.nombre} ${coche.empleados.apellidos}`
                          : coche.asignadoa && coche.asignadoa.trim() !== ""
                            ? `Asignado a: ${coche.asignadoa}`
                            : coche.alquiler
                              ? "Vehículo de alquiler"
                              : "Disponible para asignación"}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        coche.empleados || (coche.asignadoa && coche.asignadoa.trim() !== "")
                          ? "bg-green-100 text-green-800"
                          : coche.alquiler
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {coche.empleados || (coche.asignadoa && coche.asignadoa.trim() !== "")
                        ? "Asignado"
                        : coche.alquiler
                          ? "Alquiler"
                          : "Disponible"}
                    </span>
                  </div>
                ))}
                <div className="text-center mt-4">
                  <Link href="/coches" className="text-blue-600 hover:underline">
                    Ver todos los vehículos
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas - Solo mostrar si hay alertas */}
        {(stats.segurosProximosVencer > 0 || stats.itvsProximasVencer > 0) && (
          <Card className="mb-8 border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center text-yellow-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Alertas Importantes
              </h2>
              <div className="space-y-2">
                {stats.segurosProximosVencer > 0 && (
                  <p className="text-yellow-700">
                    • {stats.segurosProximosVencer} seguro(s) vencen en los próximos 30 días
                  </p>
                )}
                {stats.itvsProximasVencer > 0 && (
                  <p className="text-yellow-700">• {stats.itvsProximasVencer} ITV(s) vencen en los próximos 60 días</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
