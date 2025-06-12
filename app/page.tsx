import { Card, CardContent } from "@/components/ui/card"
import { Car, Users, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Suspense } from "react"

async function getDashboardData() {
  try {
    // Obtener estadísticas de coches
    const { data: coches, error: cochesError } = await supabase.from("coches").select("*")

    if (cochesError) {
      console.error("Error fetching coches:", cochesError)
    }

    // Obtener empleados
    const { data: empleados, error: empleadosError } = await supabase.from("empleados").select("*")

    if (empleadosError) {
      console.error("Error fetching empleados:", empleadosError)
    }

    // Obtener coches recientes
    const { data: cochesRecientes, error: recientesError } = await supabase
      .from("coches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3)

    if (recientesError) {
      console.error("Error fetching coches recientes:", recientesError)
    }

    // Obtener ITVs para calcular alertas
    const { data: itvs, error: itvsError } = await supabase
      .from("itvs")
      .select("*")
      .order("fechaproximarevision", { ascending: true })

    if (itvsError) {
      console.error("Error fetching ITVs:", itvsError)
    }

    // Calcular alertas de ITVs
    const today = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)

    const itvAlerts = (itvs || []).filter((itv) => {
      const fechaProximaRevision = new Date(itv.fechaproximarevision)
      return fechaProximaRevision <= thirtyDaysFromNow
    })

    const itvVencidas = itvAlerts.filter((itv) => {
      const fechaProximaRevision = new Date(itv.fechaproximarevision)
      return fechaProximaRevision < today
    })

    const itvProximasVencer = itvAlerts.filter((itv) => {
      const fechaProximaRevision = new Date(itv.fechaproximarevision)
      return fechaProximaRevision >= today && fechaProximaRevision <= thirtyDaysFromNow
    })

    return {
      coches: coches || [],
      empleados: empleados || [],
      cochesRecientes: cochesRecientes || [],
      itvAlerts: {
        total: itvAlerts.length,
        vencidas: itvVencidas.length,
        proximasVencer: itvProximasVencer.length,
        detalles: itvAlerts,
      },
    }
  } catch (error) {
    console.error("Error in getDashboardData:", error)
    return {
      coches: [],
      empleados: [],
      cochesRecientes: [],
      itvAlerts: {
        total: 0,
        vencidas: 0,
        proximasVencer: 0,
        detalles: [],
      },
    }
  }
}

function DashboardStats({ coches, empleados, itvAlerts }: { coches: any[]; empleados: any[]; itvAlerts: any }) {
  // Calcular estadísticas de forma consistente
  const stats = {
    totalCoches: coches.length,
    cochesAsignados: coches.filter((c) => {
      if (!c.asignadoa) return false
      if (typeof c.asignadoa === "string") return c.asignadoa.trim() !== ""
      return true
    }).length,
    totalEmpleados: empleados.length,
    totalAlertas: itvAlerts.total,
  }

  stats.cochesDisponibles = stats.totalCoches - stats.cochesAsignados

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-50">
              <Car className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Coches</p>
              <Link href="/coches" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
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
            <div className={`p-3 rounded-lg ${stats.totalAlertas > 0 ? "bg-red-50" : "bg-gray-50"}`}>
              <AlertTriangle className={`h-6 w-6 ${stats.totalAlertas > 0 ? "text-red-600" : "text-gray-400"}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Alertas ITV</p>
              <p className={`text-2xl font-bold ${stats.totalAlertas > 0 ? "text-red-600" : "text-gray-900"}`}>
                {stats.totalAlertas}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AlertsSection({ itvAlerts, coches }: { itvAlerts: any; coches: any[] }) {
  if (itvAlerts.total === 0) {
    return null
  }

  // Crear mapa de coches para obtener información adicional
  const cochesMap = new Map()
  coches.forEach((coche) => {
    cochesMap.set(coche.matricula, coche)
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  const getDaysUntilDate = (dateString: string) => {
    const today = new Date()
    const targetDate = new Date(dateString)
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <Card className="mb-8 border-yellow-200 bg-yellow-50">
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center text-yellow-800">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Alertas de ITV ({itvAlerts.total})
        </h2>

        {itvAlerts.vencidas > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-red-700 mb-2">ITVs Vencidas ({itvAlerts.vencidas})</h3>
            <div className="space-y-2">
              {itvAlerts.detalles
                .filter((itv: any) => new Date(itv.fechaproximarevision) < new Date())
                .map((itv: any) => {
                  const coche = cochesMap.get(itv.matricula)
                  const daysOverdue = Math.abs(getDaysUntilDate(itv.fechaproximarevision))
                  return (
                    <div key={itv.id} className="p-3 bg-red-100 border border-red-200 rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-red-800">
                            {itv.matricula} - {coche ? `${coche.marca} ${coche.modelo}` : "Información no disponible"}
                          </p>
                          <p className="text-sm text-red-600">
                            ITV vencida hace {daysOverdue} días (venció el {formatDate(itv.fechaproximarevision)})
                          </p>
                        </div>
                        <Link
                          href={`/coches/detalle/${coche?.matricula || itv.matricula}`}
                          className="text-red-600 hover:text-red-800 text-sm underline"
                        >
                          Ver detalles
                        </Link>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {itvAlerts.proximasVencer > 0 && (
          <div>
            <h3 className="font-semibold text-yellow-700 mb-2">ITVs Próximas a Vencer ({itvAlerts.proximasVencer})</h3>
            <div className="space-y-2">
              {itvAlerts.detalles
                .filter((itv: any) => {
                  const fecha = new Date(itv.fechaproximarevision)
                  const today = new Date()
                  return fecha >= today
                })
                .map((itv: any) => {
                  const coche = cochesMap.get(itv.matricula)
                  const daysUntil = getDaysUntilDate(itv.fechaproximarevision)
                  return (
                    <div key={itv.id} className="p-3 bg-yellow-100 border border-yellow-200 rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-yellow-800">
                            {itv.matricula} - {coche ? `${coche.marca} ${coche.modelo}` : "Información no disponible"}
                          </p>
                          <p className="text-sm text-yellow-600">
                            ITV en {daysUntil} días ({formatDate(itv.fechaproximarevision)})
                          </p>
                        </div>
                        <Link
                          href={`/coches/detalle/${coche?.matricula || itv.matricula}`}
                          className="text-yellow-600 hover:text-yellow-800 text-sm underline"
                        >
                          Ver detalles
                        </Link>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecentVehicles({ cochesRecientes, empleados }: { cochesRecientes: any[]; empleados: any[] }) {
  // Crear mapa de empleados para búsqueda rápida
  const empleadosMap = new Map()
  empleados.forEach((empleado) => {
    empleadosMap.set(empleado.id, empleado)
  })

  if (cochesRecientes.length === 0) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4">Vehículos Recientes</h2>
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
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold mb-4">Vehículos Recientes</h2>
        <div className="space-y-3">
          {cochesRecientes.map((coche) => {
            // Buscar el empleado asociado si asignadoa es un número
            let empleadoInfo = null
            if (coche.asignadoa && !isNaN(Number(coche.asignadoa))) {
              empleadoInfo = empleadosMap.get(Number(coche.asignadoa))
            }

            const isAssigned =
              empleadoInfo ||
              (coche.asignadoa &&
                ((typeof coche.asignadoa === "string" && coche.asignadoa.trim() !== "") ||
                  typeof coche.asignadoa !== "string"))

            return (
              <div
                key={coche.matricula}
                className="flex justify-between items-center p-3 border rounded hover:bg-gray-50"
              >
                <div>
                  <h3 className="font-semibold">
                    {coche.matricula} - {coche.marca} {coche.modelo}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {empleadoInfo
                      ? `Asignado a: ${empleadoInfo.nombre} ${empleadoInfo.apellidos}`
                      : coche.asignadoa && typeof coche.asignadoa === "string" && coche.asignadoa.trim() !== ""
                        ? `Asignado a: ${coche.asignadoa}`
                        : coche.alquiler
                          ? "Vehículo de alquiler"
                          : "Disponible para asignación"}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    isAssigned
                      ? "bg-green-100 text-green-800"
                      : coche.alquiler
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {isAssigned ? "Asignado" : coche.alquiler ? "Alquiler" : "Disponible"}
                </span>
              </div>
            )
          })}
          <div className="text-center mt-4">
            <Link href="/coches" className="text-blue-600 hover:underline">
              Ver todos los vehículos
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function HomePage() {
  const { coches, empleados, cochesRecientes, itvAlerts } = await getDashboardData()

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Resumen general de la flota</p>
        </div>

        <Suspense fallback={<div>Cargando estadísticas...</div>}>
          <DashboardStats coches={coches} empleados={empleados} itvAlerts={itvAlerts} />
        </Suspense>

        <Suspense fallback={<div>Cargando alertas...</div>}>
          <AlertsSection itvAlerts={itvAlerts} coches={coches} />
        </Suspense>

        <Suspense fallback={<div>Cargando vehículos recientes...</div>}>
          <RecentVehicles cochesRecientes={cochesRecientes} empleados={empleados} />
        </Suspense>
      </div>
    </div>
  )
}
