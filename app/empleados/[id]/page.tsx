import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, User, Mail } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

async function getEmpleado(id: string) {
  if (!id || id === "undefined") {
    return null
  }

  try {
    const { data, error } = await supabase.from("empleados").select("*").eq("id", Number.parseInt(id)).single()

    if (error) {
      console.error("Error al obtener empleado:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error en getEmpleado:", error)
    return null
  }
}

interface EmpleadoDetailPageProps {
  params: { id: string }
}

export default async function EmpleadoDetailPage({ params }: EmpleadoDetailPageProps) {
  const empleado = await getEmpleado(params.id)

  if (!empleado) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Empleado no encontrado</h1>
          <p className="text-gray-600 mb-8">No se pudo encontrar el empleado con ID {params.id}</p>
          <Link href="/empleados" className="text-blue-600 hover:underline">
            Volver a la lista de empleados
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
            <Link href="/empleados" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver a Empleados
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {empleado.nombre} {empleado.apellidos}
              </h1>
              <p className="text-gray-600">{empleado.email}</p>
            </div>
          </div>
          <Link
            href={`/empleados/${empleado.id}/editar`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Editar Empleado
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información personal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">ID:</span>
                <span className="font-medium">{empleado.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nombre:</span>
                <span>{empleado.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Apellidos:</span>
                <span>{empleado.apellidos}</span>
              </div>
            </CardContent>
          </Card>

          {/* Información de contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span>{empleado.email}</span>
              </div>
              {empleado.movil && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Móvil:</span>
                  <span>{empleado.movil}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
