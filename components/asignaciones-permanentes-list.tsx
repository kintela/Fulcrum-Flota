import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Car, MapPin, Mail, Phone, UserX, AlertTriangle } from "lucide-react"
import { useState, useEffect } from "react"
import { obtenerFotosCoche } from "@/lib/storage"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { AsignacionPermanente } from "@/app/actions/reservas-admin"

interface AsignacionesPermanentesListProps {
  asignaciones: AsignacionPermanente[]
  onLiberarCoche: (matricula: string) => Promise<void>
  liberandoCoche: string | null
  searchText: string
}

export default function AsignacionesPermanentesList({ 
  asignaciones, 
  onLiberarCoche, 
  liberandoCoche, 
  searchText 
}: AsignacionesPermanentesListProps) {
  const [fotosCache, setFotosCache] = useState<{ [matricula: string]: string | null }>({})

  // Cargar fotos de los coches
  useEffect(() => {
    async function cargarFotos() {
      const nuevasFotos: { [matricula: string]: string | null } = {}
      
      for (const asignacion of asignaciones) {
        // Solo cargar si no está ya en cache
        if (fotosCache[asignacion.matricula] === undefined) {
          try {
            const fotosResult = await obtenerFotosCoche(asignacion.matricula)
            nuevasFotos[asignacion.matricula] = fotosResult.success && fotosResult.fotos && fotosResult.fotos.length > 0 
              ? fotosResult.fotos[0] 
              : null
          } catch (error) {
            // Silenciar errores de fotos faltantes
            nuevasFotos[asignacion.matricula] = null
          }
        }
      }
      
      if (Object.keys(nuevasFotos).length > 0) {
        setFotosCache(prev => ({ ...prev, ...nuevasFotos }))
      }
    }

    if (asignaciones.length > 0) {
      cargarFotos()
    }
  }, [asignaciones])

  // Filtrar asignaciones por texto de búsqueda
  const asignacionesFiltradas = asignaciones.filter((asignacion) => {
    if (!searchText.trim()) return true

    const searchLower = searchText.toLowerCase().trim()
    
    // Buscar en matrícula
    if (asignacion.matricula.toLowerCase().includes(searchLower)) return true
    
    // Buscar en marca y modelo
    if (asignacion.marca.toLowerCase().includes(searchLower) || 
        asignacion.modelo.toLowerCase().includes(searchLower)) return true
    
    // Buscar en dirección actual
    if (asignacion.direccion_actual && 
        asignacion.direccion_actual.toLowerCase().includes(searchLower)) return true
    
    // Buscar en información del empleado
    if (asignacion.empleado) {
      const nombreCompleto = `${asignacion.empleado.nombre || ''} ${asignacion.empleado.apellidos || ''}`.toLowerCase()
      if (nombreCompleto.includes(searchLower)) return true
      
      if (asignacion.empleado.email && asignacion.empleado.email.toLowerCase().includes(searchLower)) return true
      
      if (asignacion.empleado.telefono && asignacion.empleado.telefono.toLowerCase().includes(searchLower)) return true
    }
    
    return false
  })

  // Ordenar por matrícula
  const asignacionesOrdenadas = [...asignacionesFiltradas].sort((a, b) => 
    a.matricula.localeCompare(b.matricula)
  )

  if (asignacionesOrdenadas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Asignaciones Permanentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {searchText.trim() ? 'No se encontraron asignaciones permanentes que coincidan con la búsqueda' : 'No hay asignaciones permanentes activas'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Asignaciones Permanentes ({asignacionesOrdenadas.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {asignacionesOrdenadas.map((asignacion) => (
            <Card key={asignacion.matricula} className="p-4">
              <div className="flex items-start gap-4">
                {/* Foto del vehículo */}
                <div className="flex-shrink-0">
                  {fotosCache[asignacion.matricula] ? (
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      <img
                        src={fotosCache[asignacion.matricula]!}
                        alt={`${asignacion.marca} ${asignacion.modelo}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Si hay error cargando, mostrar placeholder
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Car className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  {/* Información del vehículo */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{asignacion.matricula}</h3>
                      <p className="text-muted-foreground">
                        {asignacion.marca} {asignacion.modelo}
                      </p>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Asignado
                    </Badge>
                  </div>

                  {/* Información del empleado asignado */}
                  {asignacion.empleado ? (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">Empleado Asignado</span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {asignacion.empleado.nombre} {asignacion.empleado.apellidos}
                        </p>
                        {asignacion.empleado.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {asignacion.empleado.email}
                          </div>
                        )}
                        {asignacion.empleado.telefono && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {asignacion.empleado.telefono}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-amber-800">
                          Empleado no encontrado (ID: {asignacion.asignadoa})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Ubicación actual */}
                  {asignacion.direccion_actual && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{asignacion.direccion_actual}</span>
                    </div>
                  )}
                </div>

                {/* Botón de liberar */}
                <div className="flex-shrink-0">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={liberandoCoche === asignacion.matricula}
                      >
                        {liberandoCoche === asignacion.matricula ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                            Liberando...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <UserX className="h-4 w-4" />
                            Liberar
                          </div>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          Confirmar liberación
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          ¿Estás seguro de que deseas liberar el vehículo{' '}
                          <strong>{asignacion.matricula}</strong> ({asignacion.marca} {asignacion.modelo})?
                          <br />
                          <br />
                          {asignacion.empleado ? (
                            <>
                              El vehículo dejará de estar asignado a{' '}
                              <strong>{asignacion.empleado.nombre} {asignacion.empleado.apellidos}</strong>{' '}
                              y estará disponible para nuevas asignaciones.
                            </>
                          ) : (
                            'El vehículo estará disponible para nuevas asignaciones.'
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onLiberarCoche(asignacion.matricula)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Sí, liberar vehículo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
