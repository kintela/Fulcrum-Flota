import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { supabaseServer as supabase } from "@/lib/supabase-server"
import { esRolAdministrador } from "@/lib/user-role"

async function getEmpleados() {
  // Obtener empleados
  const { data: empleados, error } = await supabase
    .from("empleados")
    .select("*")
    .order("nombre", { ascending: true })
    .order("apellidos", { ascending: true })

  if (error) {
    console.error("Error fetching empleados:", error)
    return []
  }

  // Obtener coches para mapear asignaciones
  const { data: coches, error: cochesError } = await supabase
    .from("coches")
    .select("matricula, asignadoa")
    .not("asignadoa", "is", null)

  if (cochesError) {
    console.error("Error fetching coches:", cochesError)
  }

  // Crear un mapa de empleado ID a matrículas asignadas
  const cochesAsignados = {}
  if (coches) {
    coches.forEach(coche => {
      const empleadoId = coche.asignadoa
      if (!cochesAsignados[empleadoId]) {
        cochesAsignados[empleadoId] = []
      }
      cochesAsignados[empleadoId].push(coche.matricula)
    })
  }

  // Agregar las matrículas a cada empleado
  const empleadosConCoches = (empleados || []).map(empleado => ({
    ...empleado,
    matriculasAsignadas: cochesAsignados[empleado.id] || []
  }))

  return empleadosConCoches
}

export default async function EmpleadosPage() {
  const empleados = await getEmpleados()

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Empleados</h1>
            <p className="text-gray-600">Administra los empleados de la empresa ({empleados.length} empleados)</p>
          </div>
          <Link
            href="/empleados/nuevo-empleado"
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Empleado
          </Link>
        </div>

        {empleados.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay empleados registrados</h3>
              <p className="text-gray-600 mb-4">Comienza agregando tu primer empleado.</p>
              <Link
                href="/empleados/nuevo-empleado"
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                <Plus className="h-5 w-5 mr-2" />
                Agregar Primer Empleado
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {empleados.map((empleado) => {
              const isAdmin = esRolAdministrador(empleado.role)
              return (
              <Card
                key={empleado.id}
                className={`hover:shadow-lg transition-shadow ${
                  empleado.baneado
                    ? "bg-gray-100 border-gray-300"
                    : isAdmin
                      ? "bg-blue-50 border-blue-200"
                      : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {empleado.nombre} {empleado.apellidos}
                      </CardTitle>
                      <p className="text-gray-600">{empleado.email}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {isAdmin && (
                          <Badge className="bg-blue-600 text-white">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Administrador
                          </Badge>
                        )}
                        {empleado.baneado && (
                          <Badge variant="destructive">
                            Baneado
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isAdmin ? (
                      <ShieldCheck className="h-6 w-6 text-blue-600" />
                    ) : (
                      <Users className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {empleado.baneado && (
                      <div className="text-xs text-gray-600">
                        Este empleado no puede crear nuevas reservas.
                      </div>
                    )}
                    {empleado.movil && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Móvil:</span>
                        <span>{empleado.movil}</span>
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="text-gray-500">Vehículos asignados:</span>
                      <div className="mt-1">
                        {empleado.matriculasAsignadas && empleado.matriculasAsignadas.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {empleado.matriculasAsignadas.map((matricula, index) => (
                              <span 
                                key={matricula}
                                className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                              >
                                {matricula}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Sin vehículos asignados</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Link
                      href={`/empleados/${empleado.id}`}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
                    >
                      Ver detalles
                    </Link>
                    <Link
                      href={`/empleados/${empleado.id}/editar`}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm"
                    >
                      Editar
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        )}
      </div>
    </div>
  )
}
