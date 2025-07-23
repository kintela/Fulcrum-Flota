"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, AlertCircle } from "lucide-react"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { 
  obtenerReservasTemporales, 
  obtenerAsignacionesPermanentes,
  cancelarReservaTemporal,
  type ReservaTemporal,
  type AsignacionPermanente 
} from "@/app/actions/reservas-admin"
import { liberarCoche } from "@/app/actions/reservas"
import ReservasTemporalesList from "@/components/reservas-temporales-list"
import AsignacionesPermanentesList from "@/components/asignaciones-permanentes-list"

export default function ReservasPage() {
  const { data: session, status } = useSession()
  const [reservasTemporales, setReservasTemporales] = useState<ReservaTemporal[]>([])
  const [asignacionesPermanentes, setAsignacionesPermanentes] = useState<AsignacionPermanente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [searchText, setSearchText] = useState<string>("")
  const [cancelandoReserva, setCancelandoReserva] = useState<number | null>(null)
  const [liberandoCoche, setLiberandoCoche] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string>("")

  useEffect(() => {
    if (status === "loading") return
    
    if (status === "unauthenticated") {
      setError("Acceso no autorizado")
      setLoading(false)
      return
    }

    loadData()
  }, [status])

  const loadData = async () => {
    try {
      setLoading(true)
      setError("")

      // Cargar reservas temporales
      const reservasResult = await obtenerReservasTemporales()
      
      if (reservasResult.success && reservasResult.reservas) {
        setReservasTemporales(reservasResult.reservas)
      } else {
        console.error("Error cargando reservas temporales:", reservasResult.error)
      }

      // Cargar asignaciones permanentes
      const asignacionesResult = await obtenerAsignacionesPermanentes()
      
      if (asignacionesResult.success && asignacionesResult.asignaciones) {
        setAsignacionesPermanentes(asignacionesResult.asignaciones)
      } else {
        console.error("Error cargando asignaciones permanentes:", asignacionesResult.error)
      }

    } catch (error) {
      console.error("Error cargando datos:", error)
      setError("Error inesperado al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelarReserva = async (reservaId: number) => {
    setCancelandoReserva(reservaId)
    setMensaje("")

    try {
      const resultado = await cancelarReservaTemporal(reservaId)
      
      if (resultado.success) {
        setMensaje(`✅ ${resultado.message}`)
        // Recargar datos para actualizar la lista
        await loadData()
      } else {
        setMensaje(`❌ ${resultado.error}`)
      }
    } catch (error) {
      console.error("Error cancelando reserva:", error)
      setMensaje("❌ Error inesperado al cancelar la reserva")
    } finally {
      setCancelandoReserva(null)
    }
  }

  const handleLiberarCoche = async (matricula: string) => {
    setLiberandoCoche(matricula)
    setMensaje("")

    try {
      const resultado = await liberarCoche(matricula)
      
      if (resultado.success) {
        setMensaje(`✅ ${resultado.message}`)
        // Recargar datos para actualizar la lista
        await loadData()
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-gray-600">Cargando datos de reservas...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error de acceso</h3>
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Reservas</h1>
            <p className="text-gray-600">Administración de reservas temporales y asignaciones permanentes</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white px-4 py-3 rounded-lg shadow text-center">
              <div className="text-2xl font-bold text-blue-600">{reservasTemporales.length}</div>
              <div className="text-xs text-gray-600">Reservas Temporales</div>
            </div>
            <div className="bg-white px-4 py-3 rounded-lg shadow text-center">
              <div className="text-2xl font-bold text-green-600">{asignacionesPermanentes.length}</div>
              <div className="text-xs text-gray-600">Asignaciones Permanentes</div>
            </div>
          </div>
        </div>

        {/* Buscador global */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5" />
              Búsqueda Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Buscar por matrícula, empleado, email, marca, modelo, observaciones..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full"
                />
              </div>
              {searchText && (
                <button
                  onClick={() => setSearchText("")}
                  className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2 rounded border"
                >
                  Limpiar
                </button>
              )}
            </div>
            {searchText && (
              <p className="text-sm text-gray-600 mt-2">
                Buscando en reservas temporales y asignaciones permanentes
              </p>
            )}
          </CardContent>
        </Card>

        {/* Mensajes */}
        {mensaje && (
          <div className={`mb-6 p-4 rounded-lg ${
            mensaje.startsWith('✅') 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {mensaje}
          </div>
        )}

        {/* Lista de reservas temporales */}
        <div className="mb-8">
          <ReservasTemporalesList
            reservas={reservasTemporales}
            onCancelarReserva={handleCancelarReserva}
            cancelandoReserva={cancelandoReserva}
            searchText={searchText}
          />
        </div>

        {/* Lista de asignaciones permanentes */}
        <div>
          <AsignacionesPermanentesList
            asignaciones={asignacionesPermanentes}
            onLiberarCoche={handleLiberarCoche}
            liberandoCoche={liberandoCoche}
            searchText={searchText}
          />
        </div>
      </div>
    </div>
  )
}
