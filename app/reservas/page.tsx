import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Plus, User, Car } from "lucide-react"
import Link from "next/link"

async function getReservas() {
  // Esta función debería consultar las reservas reales cuando exista la tabla
  // Por ahora, devolvemos un array vacío
  return []
}

export default async function ReservasPage() {
  const reservas = await getReservas()

  // Función para obtener el color según el estado
  const getStatusColor = (estado: string) => {
    switch (estado) {
      case "Activa":
        return "bg-green-100 text-green-800"
      case "Pendiente":
        return "bg-yellow-100 text-yellow-800"
      case "Completada":
        return "bg-blue-100 text-blue-800"
      case "Cancelada":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Reservas</h1>
            <p className="text-gray-600">Administra las reservas de vehículos</p>
          </div>
          <Link
            href="/reservas/nueva"
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nueva Reserva
          </Link>
        </div>

        {reservas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay reservas registradas</h3>
              <p className="text-gray-600 mb-4">Comienza creando tu primera reserva de vehículo.</p>
              <Link
                href="/reservas/nueva"
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                <Plus className="h-5 w-5 mr-2" />
                Crear Primera Reserva
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reservas.map((reserva: any) => (
              <Card key={reserva.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{reserva.id}</CardTitle>
                      <p className="text-gray-600">{reserva.proposito}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(reserva.estado)}`}>
                      {reserva.estado}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-700">{reserva.empleado}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Car className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-700">{reserva.vehiculo}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-700">
                        {new Date(reserva.fechaInicio).toLocaleDateString()} -{" "}
                        {new Date(reserva.fechaFin).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Link
                      href={`/reservas/${reserva.id}`}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
                    >
                      Ver detalles
                    </Link>
                    <Link
                      href={`/reservas/${reserva.id}/editar`}
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
