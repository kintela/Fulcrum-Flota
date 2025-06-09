import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Plus } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

async function getEmpleados() {
  const { data: empleados, error } = await supabase
    .from("empleados")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching empleados:", error)
    return []
  }

  return empleados || []
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
            href="/empleados/crear"
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
                href="/empleados/crear"
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                <Plus className="h-5 w-5 mr-2" />
                Agregar Primer Empleado
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {empleados.map((empleado) => (
              <Card key={empleado.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {empleado.nombre} {empleado.apellidos}
                      </CardTitle>
                      <p className="text-gray-600">{empleado.email}</p>
                    </div>
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {empleado.movil && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Móvil:</span>
                        <span>{empleado.movil}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">ID:</span>
                      <span>{empleado.id}</span>
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
