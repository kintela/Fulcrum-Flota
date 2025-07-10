"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, RefreshCw, Navigation, AlertCircle } from "lucide-react"

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
    initGoogleMap?: () => void
  }
}

export function MapaCoches({ coches, empleados = [] }: MapaCochesProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)

  // Crear mapa de empleados
  const empleadosMap = new Map()
  empleados.forEach((empleado) => {
    empleadosMap.set(empleado.id, empleado)
  })

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

  // Función para inicializar el mapa
  const initMap = () => {
    console.log("🗺️ Inicializando mapa...")

    if (!mapRef.current) {
      console.error("❌ No se encontró el contenedor del mapa")
      setError("No se pudo encontrar el contenedor del mapa")
      setIsLoading(false)
      return
    }

    if (!window.google?.maps) {
      console.error("❌ Google Maps no está disponible")
      setError("Google Maps no se cargó correctamente")
      setIsLoading(false)
      return
    }

    try {
      // Crear el mapa
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 6,
        center: { lat: 40.4168, lng: -3.7038 }, // Madrid
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      })

      console.log("✅ Mapa creado exitosamente")
      setMapInstance(map)
      setIsLoading(false)
      setError(null)

      // Agregar marcadores
      addMarkers(map)
    } catch (err) {
      console.error("❌ Error creando el mapa:", err)
      setError("Error al crear el mapa")
      setIsLoading(false)
    }
  }

  // Función para agregar marcadores
  const addMarkers = (map: any) => {
    const cochesConUbicacion = coches.filter(
      (coche) =>
        coche.latitud &&
        coche.longitud &&
        !coche.donante &&
        !isNaN(Number(coche.latitud)) &&
        !isNaN(Number(coche.longitud)),
    )

    console.log(`📍 Agregando ${cochesConUbicacion.length} marcadores`)

    if (cochesConUbicacion.length === 0) {
      console.log("⚠️ No hay coches con ubicación válida")
      return
    }

    const bounds = new window.google.maps.LatLngBounds()

    cochesConUbicacion.forEach((coche) => {
      const lat = Number(coche.latitud)
      const lng = Number(coche.longitud)
      const position = { lat, lng }
      const empleadoInfo = getEmpleadoInfo(coche)
      const isAssigned = !!empleadoInfo || !!coche.asignadoa

      // Crear marcador
      const marker = new window.google.maps.Marker({
        position,
        map,
        title: `${coche.matricula} - ${coche.marca} ${coche.modelo}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: isAssigned ? "#10b981" : "#3b82f6",
          fillOpacity: 0.8,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      })

      // Crear ventana de información
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 10px; font-family: Arial, sans-serif;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937;">${coche.matricula}</h3>
            <p style="margin: 4px 0; color: #6b7280;"><strong>Vehículo:</strong> ${coche.marca} ${coche.modelo}</p>
            <p style="margin: 4px 0; color: #6b7280;"><strong>Estado:</strong> 
              <span style="color: ${isAssigned ? "#059669" : "#2563eb"};">
                ${isAssigned ? "Asignado" : "Disponible"}
              </span>
            </p>
            ${empleadoInfo ? `<p style="margin: 4px 0; color: #6b7280;"><strong>Asignado a:</strong> ${empleadoInfo.nombre} ${empleadoInfo.apellidos || ""}</p>` : ""}
            ${coche.direccion_actual ? `<p style="margin: 4px 0; color: #6b7280;"><strong>Ubicación:</strong> ${coche.direccion_actual}</p>` : ""}
            <div style="margin-top: 8px;">
              <a href="/coches/detalle/${coche.matricula}" 
                 style="background-color: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; text-decoration: none; font-size: 12px;">
                Ver detalles
              </a>
            </div>
          </div>
        `,
      })

      marker.addListener("click", () => {
        infoWindow.open(map, marker)
      })

      bounds.extend(position)
    })

    // Ajustar vista del mapa
    if (cochesConUbicacion.length > 0) {
      map.fitBounds(bounds)

      // Evitar zoom excesivo
      const listener = window.google.maps.event.addListenerOnce(map, "bounds_changed", () => {
        if (map.getZoom() > 15) {
          map.setZoom(15)
        }
      })
    }
  }

  // Cargar Google Maps
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError("API key de Google Maps no configurada")
      setIsLoading(false)
      return
    }

    // Si Google Maps ya está cargado
    if (window.google?.maps) {
      console.log("♻️ Google Maps ya está disponible")
      setTimeout(initMap, 100)
      return
    }

    // Timeout de seguridad
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setError("Timeout cargando Google Maps")
        setIsLoading(false)
      }
    }, 15000) // 15 segundos

    // Callback global
    window.initGoogleMap = () => {
      console.log("📞 Callback de Google Maps ejecutado")
      clearTimeout(timeoutId)
      setTimeout(initMap, 100)
    }

    // Cargar script
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap&loading=async`
    script.async = true
    script.defer = true

    script.onerror = () => {
      clearTimeout(timeoutId)
      setError("Error al cargar Google Maps")
      setIsLoading(false)
    }

    document.head.appendChild(script)

    return () => {
      clearTimeout(timeoutId)
      if (window.initGoogleMap) {
        delete window.initGoogleMap
      }
    }
  }, [])

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleCenter = () => {
    if (mapInstance && coches.length > 0) {
      const cochesConUbicacion = coches.filter((c) => c.latitud && c.longitud && !c.donante)
      if (cochesConUbicacion.length > 0) {
        const bounds = new window.google.maps.LatLngBounds()
        cochesConUbicacion.forEach((coche) => {
          bounds.extend({ lat: Number(coche.latitud), lng: Number(coche.longitud) })
        })
        mapInstance.fitBounds(bounds)
      }
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
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <div className="text-sm text-gray-500 mb-4">
              <p>
                <strong>Posibles soluciones:</strong>
              </p>
              <ul className="text-left mt-2 space-y-1">
                <li>• Verifica que NEXT_PUBLIC_GOOGLE_MAPS_API_KEY esté configurada</li>
                <li>• Asegúrate de que las APIs estén habilitadas en Google Cloud Console</li>
                <li>• Verifica tu conexión a internet</li>
              </ul>
            </div>
            <Button onClick={handleRefresh}>Reintentar</Button>
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
            <Button variant="outline" size="sm" onClick={handleCenter} disabled={isLoading || !mapInstance}>
              <Navigation className="h-4 w-4 mr-2" />
              Centrar
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
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
              <p className="text-gray-500 mb-2">Cargando mapa...</p>
              <p className="text-xs text-gray-400">
                Total coches: {coches.length} | Con ubicación: {cochesConUbicacion.length}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Estadísticas */}
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
            <div className="w-full bg-white rounded-lg border shadow-sm overflow-hidden">
              <div
                ref={mapRef}
                style={{
                  width: "100%",
                  height: "400px",
                  backgroundColor: "#f3f4f6",
                }}
              />
            </div>

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
