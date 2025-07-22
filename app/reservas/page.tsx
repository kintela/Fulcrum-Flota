"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, User, Car, MapPin, Mail, Phone, UserCheck, Clock, UserX, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { obtenerFotosCoche } from "@/lib/storage"
import { liberarCoche } from "@/app/actions/reservas"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"

interface Reserva {
  id: number
  matricula: string
  marca: string
  modelo: string
  latitud?: number
  longitud?: number
  asignadoa?: string | number
  donante?: boolean
  direccion_actual?: string
  ultima_ubicacion?: string
  empleado?: any
  foto?: string | null
}

async function getReservasActivas(): Promise<Reserva[]> {
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

  // Combinar información de coches con empleados y fotos
  const reservas = await Promise.all(
    coches.map(async (coche) => {
      const empleado = empleados.find((emp) => emp.id === Number(coche.asignadoa))
      
      // Obtener la primera foto del coche
      const fotosResult = await obtenerFotosCoche(coche.matricula)
      const primeraFoto = fotosResult.success && fotosResult.fotos && fotosResult.fotos.length > 0 
        ? fotosResult.fotos[0] 
        : null
      
      return {
        ...coche,
        empleado: empleado,
        foto: primeraFoto
      }
    })
  )

  return reservas
}

export default function ReservasPage() {
  const { data: session } = useSession()
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [liberandoCoche, setLiberandoCoche] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string>("")
  const [searchText, setSearchText] = useState<string>("") // Texto de búsqueda global

  useEffect(() => {
    async function loadReservas() {
      try {
        const data = await getReservasActivas()
        setReservas(data)
      } catch (error) {
        console.error("Error cargando reservas:", error)
      } finally {
        setLoading(false)
      }
    }

    loadReservas()
  }, [])

  // Función para manejar la liberación de un coche
  const handleLiberar = async (matricula: string) => {
    setLiberandoCoche(matricula)
    setMensaje("")

    try {
      const resultado = await liberarCoche(matricula)
      
      if (resultado.success) {
        setMensaje(`✅ ${resultado.message}`)
        // Recargar las reservas para actualizar la lista
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setMensaje(`❌ ${resultado.error}`)
      }
    } catch (error) {
      console.error("Error liberando coche:", error)
      setMensaje("❌ Error inesperado al liberar el vehículo")
    } finally {
      setLiberandoCoche(null)
    }
  }

  // Función para filtrar reservas por texto de búsqueda
  const filtrarReservas = (reservasArray: Reserva[]) => {
    if (!searchText.trim()) {
      return reservasArray
    }

    const searchLower = searchText.toLowerCase().trim()
    
    return reservasArray.filter((reserva) => {
      // Buscar en matrícula
      if (reserva.matricula.toLowerCase().includes(searchLower)) {
        return true
      }
      
      // Buscar en marca y modelo
      if (reserva.marca.toLowerCase().includes(searchLower) || 
          reserva.modelo.toLowerCase().includes(searchLower)) {
        return true
      }
      
      // Buscar en dirección actual
      if (reserva.direccion_actual && 
          reserva.direccion_actual.toLowerCase().includes(searchLower)) {
        return true
      }
      
      // Buscar en información del empleado
      if (reserva.empleado) {
        const nombreCompleto = `${reserva.empleado.nombre || ''} ${reserva.empleado.apellidos || ''}`.toLowerCase()
        if (nombreCompleto.includes(searchLower)) {
          return true
        }
        
        if (reserva.empleado.email && 
            reserva.empleado.email.toLowerCase().includes(searchLower)) {
          return true
        }
        
        if (reserva.empleado.telefono && 
            reserva.empleado.telefono.includes(searchText.trim())) {
          return true
        }
      }
      
      // Buscar en asignación directa (cuando no hay empleado)
      if (typeof reserva.asignadoa === 'string' && 
          reserva.asignadoa.toLowerCase().includes(searchLower)) {
        return true
      }
      
      return false
    })
  }

  // Calcular estadísticas
  const reservasFiltradas = filtrarReservas(reservas)
  const totalReservas = reservasFiltradas.length

  // Ordenar reservas por matrícula
  const reservasOrdenadas = [...reservasFiltradas].sort((a, b) => a.matricula.localeCompare(b.matricula))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-gray-600">Cargando reservas...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reservas Activas</h1>
            <p className="text-gray-600">Vehículos actualmente asignados a empleados</p>
          </div>
          <div className="bg-white px-6 py-4 rounded-lg shadow">
            <div className="text-3xl font-bold text-blue-600">{totalReservas}</div>
            <div className="text-sm text-gray-600">Total de reservas activas</div>
          </div>
        </div>

        {/* Caja de búsqueda global */}
        <div className="bg-white p-4 rounded-lg border shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Búsqueda global:</span>
            </div>
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Buscar por matrícula, empleado, dirección, marca, modelo..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              />
            </div>
            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                title="Limpiar búsqueda"
              >
                ✕ Limpiar
              </button>
            )}
          </div>
          {searchText && (
            <div className="mt-2 text-xs text-gray-600">
              {totalReservas === reservas.length 
                ? `Mostrando ${totalReservas} de ${reservas.length} reservas`
                : `Filtrando: ${totalReservas} de ${reservas.length} reservas encontradas`
              }
            </div>
          )}
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
          <>
            {mensaje && (
              <div className={`mb-6 p-4 rounded-lg ${
                mensaje.startsWith('✅') 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {mensaje}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reservasOrdenadas.map((reserva) => (
              <Card key={reserva.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
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
                  
                  {/* Imagen del coche */}
                  <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                    {reserva.foto ? (
                      <img
                        src={reserva.foto}
                        alt={`${reserva.marca} ${reserva.modelo} - ${reserva.matricula}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Si la imagen falla al cargar, mostrar el icono de coche
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center ${reserva.foto ? 'hidden' : ''}`}>
                      <Car className="h-12 w-12 text-gray-400" />
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

                    {/* Fecha de asignación */}
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-600 text-xs">
                        Asignado: {new Date().toLocaleDateString('es-ES')}
                      </span>
                    </div>

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

                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleLiberar(reserva.matricula)}
                      disabled={liberandoCoche === reserva.matricula}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      size="sm"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      {liberandoCoche === reserva.matricula ? "Liberando..." : "Liberar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  )
}
