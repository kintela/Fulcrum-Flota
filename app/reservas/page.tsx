import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Plus, User, Car } from "lucide-react"
import Link from "next/link"

export default function ReservasPage() {
  // Datos de demostración
  const reservas = [
    {
      id: "RES-001",
      empleado: "Carlos García",
      vehiculo: "1234ABC - Toyota Corolla",
      fechaInicio: "2024-06-10",
      fechaFin: "2024-06-15",
      estado: "Activa",
      proposito: "Visita a cliente en Madrid",
    },
    {
      id: "RES-002",
      empleado: "María López",
      vehiculo: "9012GHI - Volkswagen Golf",
      fechaInicio: "2024-06-12",
      fechaFin: "2024-06-20",
      estado: "Pendiente",
      proposito: "Feria comercial en Barcelona",
    },
    {
      id: "RES-003",
      empleado: "Juan Martínez",
      vehiculo: "3456JKL - Nissan Qashqai",
      fechaInicio: "2024-06-05",
      fechaFin: "2024-06-08",
      estado: "Completada",
      proposito: "Reunión con proveedores",
    },
    {
      id: "RES-004",
      empleado: "Ana Rodríguez",
      vehiculo: "7890MNO - Hyundai Tucson",
      fechaInicio: "2024-06-20",
      fechaFin: "2024-06-25",
      estado: "Pendiente",
      proposito: "Visita a sucursal de Valencia",
    },
  ]

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reservas.map((reserva) => (
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
      </div>
    </div>
  )
}
