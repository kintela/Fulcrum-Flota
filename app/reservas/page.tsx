import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, User, Car, MapPin, Mail, Phone, UserCheck, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import Link from "next/link"

async function getReservasActivas() {
  // Obtener todos los coches asignados (reservas activas)
  const { data: coches, error: cochesError } = await supabase
    .from("coches")
    .select("*")
    .not("asignadoa", "is", null)
    .eq("donante", false)

  if (cochesError) {
    console.error("Error al obtener coches:", cochesError)
    return []
  }

  // Obtener información de empleados
  const { data: empleados, error: empleadosError } = await supabase
    .from("empleados")
    .select("*")

  if (empleadosError) {
    console.error("Error al obtener empleados:", empleadosError)
    return []
  }

  // Combinar información de coches con empleados
  const reservas = coches.map((coche) => {
    const empleado = empleados.find((emp) => emp.id === Number(coche.asignadoa))
    return {
      ...coche,
      empleado: empleado
    }
  })

  return reservas
}

export default async function ReservasPage() {
  const session = await getServerSession(authOptions)
  const reservas = await getReservasActivas()

  // Calcular estadísticas
  const totalReservas = reservas.length
  const reservasConUbicacion = reservas.filter(r => r.latitud && r.longitud).length
  const reservasSinUbicacion = totalReservas - reservasConUbicacion

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reservas Activas</h1>
            <p className="text-gray-600">Vehículos actualmente asignados a empleados</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white px-4 py-2 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{totalReservas}</div>
              <div className="text-sm text-gray-600">Total reservas</div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{reservasConUbicacion}</div>
              <div className="text-sm text-gray-600">Con ubicación</div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">{reservasSinUbicacion}</div>
              <div className="text-sm text-gray-600">Sin ubicación</div>
            </div>
          </div>
        </div>

        {reservas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay reservas activas</h3>
              <p className="text-gray-600 mb-4">Actualmente no hay vehículos asignados a empleados.</p>
              <Link
                href="/coches"
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                <Car className="h-5 w-5 mr-2" />
                Gestionar Vehículos
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reservas.map((reserva) => (
              <Card key={reserva.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        <Car className="h-5 w-5 mr-2 text-blue-600" />
                        {reserva.matricula}
                      </CardTitle>
                      <p className="text-gray-600">{reserva.marca} {reserva.modelo}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 flex items-center">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Asignado
                      </span>
                      {reserva.latitud && reserva.longitud ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 mt-1 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          Ubicado
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 mt-1 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Sin ubicar
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    {/* Información del empleado */}
                    {reserva.empleado ? (
                      <>
                        <div className="flex items-center text-sm">
                          <User className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-gray-700 font-medium">
                            {reserva.empleado.nombre} {reserva.empleado.apellidos}
                          </span>
                        </div>
                        {reserva.empleado.email && (
                          <div className="flex items-center text-sm">
                            <Mail className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-gray-600 text-xs">{reserva.empleado.email}</span>
                          </div>
                        )}
                        {reserva.empleado.telefono && (
                          <div className="flex items-center text-sm">
                            <Phone className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-gray-600">{reserva.empleado.telefono}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center text-sm">
                        <User className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-700">ID Empleado: {reserva.asignadoa}</span>
                      </div>
                    )}

                    {/* Ubicación */}
                    {reserva.direccion_actual ? (
                      <div className="flex items-start text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500 mt-0.5" />
                        <span className="text-gray-600 text-xs leading-relaxed">
                          {reserva.direccion_actual}
                        </span>
                      </div>
                    ) : reserva.latitud && reserva.longitud ? (
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-600 text-xs">
                          Lat: {Number(reserva.latitud).toFixed(4)}, Lng: {Number(reserva.longitud).toFixed(4)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-400 text-xs">Sin ubicación registrada</span>
                      </div>
                    )}

                    {/* Última actualización */}
                    {reserva.ultima_ubicacion && (
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-500 text-xs">
                          Última actualización: {new Date(reserva.ultima_ubicacion).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between space-x-2">
                    <Link
                      href={`/coches/detalle/${reserva.matricula}`}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded text-sm text-center"
                    >
                      Ver Detalles
                    </Link>
                    {session?.user?.role === 'administrador' && (
                      <Link
                        href={`/coches/editar/${reserva.id}`}
                        className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-2 rounded text-sm text-center"
                      >
                        Editar
                      </Link>
                    )}
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
