"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, RefreshCw, Navigation } from "lucide-react"

interface Coche {
  matricula: string
  marca: string
  modelo: string
  latitud?: number
  longitud?: number
  ultima_ubicacion?: string
  asignadoa?: string | number
  donante?: boolean
  direccion_actual?: string
}

interface MapaCochesProps {
  coches: Coche[]
  empleados?: any[]
}

declare global {
  interface Window {
    google: any
  }
}

export function MapaCoches({ coches, empleados = [] }: MapaCochesProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markers, setMarkers] = useState<any[]>([])

  // Crear mapa de empleados para búsqueda rápida
  const empleadosMap = new Map()
  empleados.forEach((empleado) => {
    empleadosMap.set(empleado.id, empleado)
  })

  // Función para obtener información del empleado
  const getEmpleadoInfo = (coche: Coche) => {
    if (!coche.asignadoa) return null

    const empleadoId = Number(coche.asignadoa)
    if (!isNaN(empleadoId)) {
      return empleadosMap.get(empleadoId)
    }

    if (typeof coche.asignadoa === "string" && coche.asignadoa.trim() !== "") {
      return { nombre: coche.asignadoa, apellidos: "" }
    }

    return null
  }

  // Inicializar el mapa
  useEffect(() => {
    const initMap = async () => {
      try {
        if (!window.google) {
          const script = document.createElement("script")
          script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
          script.async = true
          script.defer = true

          script.onload = () => {
            createMap()
          }

          script.onerror = () => {
            setError("Error al cargar Google Maps. Verifica tu API key.")
            setIsLoading(false)
          }

          document.head.appendChild(script)
        } else {
          createMap()
        }
      } catch (err) {
        setError("Error al inicializar el mapa")
        setIsLoading(false)
      }
    }

    const createMap = () => {
      if (!mapRef.current) return

      const mapInstance = new window.google.maps.Map(mapRef.current, {
        zoom: 6,
        center: { lat: 40.4168, lng: -3.7038 }, // Madrid
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      })

      setMap(mapInstance)
      setIsLoading(false)
    }

    initMap()
  }, [])

  // Agregar marcadores cuando el mapa esté listo
  useEffect(() => {
    if (!map || !coches.length) return

    // Limpiar marcadores existentes
    markers.forEach((marker) => marker.setMap(null))
    setMarkers([])

    const bounds = new window.google.maps.LatLngBounds()
    const newMarkers: any[] = []
    let hasValidLocations = false

    coches.forEach((coche) => {
      if (coche.latitud && coche.longitud && !coche.donante) {
        const position = { lat: coche.latitud, lng: coche.longitud }
        const empleadoInfo = getEmpleadoInfo(coche)
        const isAssigned = !!empleadoInfo || !!coche.asignadoa

        // Crear marcador personalizado
        const marker = new window.google.maps.Marker({
          position,
          map,
          title: `${coche.matricula} - ${coche.marca} ${coche.modelo}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: isAssigned ? "#10b981" : "#3b82f6",
            fillOpacity: 0.8,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        })

        // Crear ventana de información
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; min-width: 250px; font-family: system-ui, -apple-system, sans-serif;">
              <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${isAssigned ? "#10b981" : "#3b82f6"}; margin-right: 8px;"></div>
                <h3 style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 600;">${coche.matricula}</h3>
              </div>
              
              <div style="margin-bottom: 8px;">
                <p style="margin: 2px 0; color: #6b7280; font-size: 14px;"><strong>Vehículo:</strong> ${coche.marca} ${coche.modelo}</p>
                <p style="margin: 2px 0; color: #6b7280; font-size: 14px;"><strong>Estado:</strong> 
                  <span style="color: ${isAssigned ? "#059669" : "#2563eb"}; font-weight: 500;">
                    ${isAssigned ? "Asignado" : "Disponible"}
                  </span>
                </p>
                ${empleadoInfo ? `<p style="margin: 2px 0; color: #6b7280; font-size: 14px;"><strong>Asignado a:</strong> ${empleadoInfo.nombre} ${empleadoInfo.apellidos || ""}</p>` : ""}
              </div>

              ${coche.direccion_actual ? `<p style="margin: 4px 0; color: #6b7280; font-size: 13px;"><strong>📍 Ubicación:</strong> ${coche.direccion_actual}</p>` : ""}
              
              ${
                coche.ultima_ubicacion
                  ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                    <strong>Última actualización:</strong><br>
                    ${new Date(coche.ultima_ubicacion).toLocaleString("es-ES")}
                  </p>
                </div>
              `
                  : ""
              }
              
              <div style="margin-top: 12px;">
                <a href="/coches/detalle/${coche.matricula}" 
                   style="display: inline-block; background-color: #3b82f6; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500;">
                  Ver detalles
                </a>
              </div>
            </div>
          `,
        })

        // Agregar evento click al marcador
        marker.addListener("click", () => {
          // Cerrar otras ventanas de información
          newMarkers.forEach((m) => m.infoWindow?.close())
          infoWindow.open(map, marker)
        })

        // Guardar referencia a la ventana de información
        marker.infoWindow = infoWindow
        newMarkers.push(marker)
        bounds.extend(position)
        hasValidLocations = true
      }
    })

    setMarkers(newMarkers)

    // Ajustar el mapa para mostrar todos los marcadores
    if (hasValidLocations) {
      map.fitBounds(bounds)

      // Evitar zoom excesivo si solo hay un marcador
      window.google.maps.event.addListenerOnce(map, "bounds_changed", () => {
        if (map.getZoom() && map.getZoom()! > 15) {
          map.setZoom(15)
        }
      })
    }
  }, [map, coches, empleados])

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleCenterMap = () => {
    if (map && markers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      markers.forEach((marker) => bounds.extend(marker.getPosition()))
      map.fitBounds(bounds)
    }
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Vehículos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-4 font-medium">{error}</p>
            <p className="text-gray-500 text-sm">
              Verifica que la API key de Google Maps esté configurada correctamente
              <br />y que las APIs necesarias estén habilitadas en Google Cloud Console.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const cochesConUbicacion = coches.filter((c) => c.latitud && c.longitud && !c.donante)
  const cochesAsignados = cochesConUbicacion.filter((c) => getEmpleadoInfo(c) || c.asignadoa)
  const cochesDisponibles = cochesConUbicacion.filter((c) => !getEmpleadoInfo(c) && !c.asignadoa)

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Vehículos
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCenterMap} disabled={isLoading || markers.length === 0}>
              <Navigation className="h-4 w-4 mr-2" />
              Centrar
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Cargando mapa...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Estadísticas del mapa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{cochesConUbicacion.length}</div>
                <div className="text-sm text-gray-600">Total con ubicación</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{cochesAsignados.length}</div>
                <div className="text-sm text-gray-600">Asignados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{cochesDisponibles.length}</div>
                <div className="text-sm text-gray-600">Disponibles</div>
              </div>
            </div>

            {/* Leyenda */}
            <div className="flex items-center justify-center gap-6 text-sm text-gray-600 bg-white p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>Asignado</span>
              </div>
            </div>

            {/* Mapa */}
            <div ref={mapRef} className="w-full h-96 rounded-lg border shadow-sm" style={{ minHeight: "400px" }} />

            {cochesConUbicacion.length === 0 && (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">
                  No hay vehículos con ubicación registrada.
                  <br />
                  <span className="text-xs">Ejecuta el script SQL para agregar ubicaciones de ejemplo.</span>
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
