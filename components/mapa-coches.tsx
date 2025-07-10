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
  }
}

export function MapaCoches({ coches, empleados = [] }: MapaCochesProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markers = useRef<any[]>([])
  const initAttempts = useRef(0)
  const maxAttempts = 10

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")

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

  // Función para verificar si el contenedor está listo
  const isContainerReady = () => {
    if (!mapRef.current) {
      console.log("❌ Contenedor no existe")
      return false
    }

    const rect = mapRef.current.getBoundingClientRect()
    const isVisible = rect.width > 0 && rect.height > 0
    const isInDOM = document.contains(mapRef.current)

    console.log("📦 Verificando contenedor:", {
      exists: true,
      width: rect.width,
      height: rect.height,
      isVisible,
      isInDOM,
      offsetParent: !!mapRef.current.offsetParent,
    })

    return isVisible && isInDOM
  }

  // Función para agregar marcadores
  const addMarkers = (map: any) => {
    // Limpiar marcadores existentes
    markers.current.forEach((marker) => {
      if (marker && marker.setMap) {
        marker.setMap(null)
      }
    })
    markers.current = []

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

      markers.current.push(marker)
      bounds.extend(position)
    })

    // Ajustar vista del mapa
    if (cochesConUbicacion.length > 0) {
      map.fitBounds(bounds)
      const listener = window.google.maps.event.addListenerOnce(map, "bounds_changed", () => {
        if (map.getZoom() > 15) {
          map.setZoom(15)
        }
      })
    }
  }

  // Función para inicializar el mapa
  const initializeMap = async () => {
    initAttempts.current++

    console.log(`🗺️ Intento ${initAttempts.current}/${maxAttempts} - Inicializando mapa...`)

    // Actualizar debug info
    setDebugInfo(`Intento ${initAttempts.current}/${maxAttempts}`)

    // Verificar Google Maps
    if (!window.google?.maps) {
      console.error("❌ Google Maps no disponible")
      if (initAttempts.current < maxAttempts) {
        setTimeout(initializeMap, 1000)
        return
      }
      setError("Google Maps no se cargó correctamente")
      setIsLoading(false)
      return
    }

    // Verificar contenedor
    if (!isContainerReady()) {
      console.error("❌ Contenedor no está listo")
      if (initAttempts.current < maxAttempts) {
        setTimeout(initializeMap, 500)
        return
      }
      setError("No se pudo inicializar el contenedor del mapa")
      setIsLoading(false)
      return
    }

    try {
      console.log("🏗️ Creando instancia del mapa...")

      // Crear el mapa
      const map = new window.google.maps.Map(mapRef.current, {
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

      mapInstance.current = map
      console.log("✅ Mapa creado exitosamente")

      // Esperar a que el mapa esté completamente listo
      const waitForMapReady = () => {
        return new Promise<void>((resolve) => {
          const checkReady = () => {
            if (map.getDiv() && map.getCenter()) {
              resolve()
            } else {
              setTimeout(checkReady, 100)
            }
          }
          checkReady()
        })
      }

      await waitForMapReady()
      console.log("🎯 Mapa completamente listo")

      setIsLoading(false)
      setError(null)

      // Agregar marcadores
      setTimeout(() => {
        addMarkers(map)
      }, 200)
    } catch (err) {
      console.error("❌ Error creando el mapa:", err)
      if (initAttempts.current < maxAttempts) {
        setTimeout(initializeMap, 1000)
        return
      }
      setError(`Error al crear el mapa: ${err instanceof Error ? err.message : "Error desconocido"}`)
      setIsLoading(false)
    }
  }

  // Cargar Google Maps y inicializar
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    console.log("🔑 API Key disponible:", !!apiKey)

    if (!apiKey) {
      setError("API key de Google Maps no configurada. Verifica NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")
      setIsLoading(false)
      return
    }

    // Función para inicializar cuando todo esté listo
    const startInitialization = () => {
      console.log("🚀 Iniciando proceso de inicialización...")
      // Resetear intentos
      initAttempts.current = 0
      // Esperar un poco para que el DOM esté completamente renderizado
      setTimeout(initializeMap, 100)
    }

    // Si Google Maps ya está cargado
    if (window.google?.maps) {
      console.log("♻️ Google Maps ya está disponible")
      startInitialization()
      return
    }

    // Callback global único
    const callbackName = `initMapaCoches_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    window[callbackName as keyof Window] = () => {
      console.log("📞 Callback de Google Maps ejecutado")
      startInitialization()
    }

    // Cargar script solo si no existe
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      console.log("🔄 Script de Google Maps ya existe, esperando...")
      // Verificar periódicamente si Google Maps está disponible
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkInterval)
          startInitialization()
        }
      }, 200)

      // Timeout de seguridad
      setTimeout(() => {
        clearInterval(checkInterval)
        if (!window.google?.maps) {
          setError("Google Maps no se cargó correctamente")
          setIsLoading(false)
        }
      }, 15000)
    } else {
      console.log("📝 Cargando script de Google Maps...")
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}&loading=async`
      script.async = true
      script.defer = true

      script.onload = () => {
        console.log("✅ Script de Google Maps cargado exitosamente")
      }

      script.onerror = (e) => {
        console.error("❌ Error cargando script de Google Maps:", e)
        setError("Error al cargar Google Maps. Verifica tu API key y conexión a internet.")
        setIsLoading(false)
      }

      document.head.appendChild(script)
    }

    return () => {
      if (window[callbackName as keyof Window]) {
        delete window[callbackName as keyof Window]
      }
    }
  }, [])

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleCenter = () => {
    if (mapInstance.current && coches.length > 0) {
      const cochesConUbicacion = coches.filter((c) => c.latitud && c.longitud && !c.donante)
      if (cochesConUbicacion.length > 0) {
        const bounds = new window.google.maps.LatLngBounds()
        cochesConUbicacion.forEach((coche) => {
          bounds.extend({ lat: Number(coche.latitud), lng: Number(coche.longitud) })
        })
        mapInstance.current.fitBounds(bounds)
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
            <p className="text-red-600 mb-4 font-medium">{error}</p>
            <div className="text-sm text-gray-500 mb-4">
              <p>
                <strong>Posibles soluciones:</strong>
              </p>
              <ul className="text-left mt-2 space-y-1">
                <li>• Verifica que NEXT_PUBLIC_GOOGLE_MAPS_API_KEY esté configurada</li>
                <li>• Asegúrate de que las APIs estén habilitadas en Google Cloud Console:</li>
                <li>&nbsp;&nbsp;&nbsp;- Maps JavaScript API</li>
                <li>&nbsp;&nbsp;&nbsp;- Places API</li>
                <li>&nbsp;&nbsp;&nbsp;- Geocoding API</li>
                <li>• Verifica que la API key tenga permisos para tu dominio</li>
                <li>• Intenta refrescar la página</li>
              </ul>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg mb-4 text-left">
              <h4 className="font-semibold mb-2">Información de Debug:</h4>
              <pre className="text-xs text-gray-600">
                {`Total coches: ${coches.length}
Con ubicación: ${coches.filter((c) => c.latitud && c.longitud && !c.donante).length}
API Key: ${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "✓ Configurada" : "✗ No configurada"}
Google Maps: ${typeof window !== "undefined" && window.google?.maps ? "✓ Disponible" : "✗ No disponible"}
Contenedor: ${mapRef.current ? "✓ Encontrado" : "✗ No encontrado"}
Intentos: ${initAttempts.current}/${maxAttempts}
Debug: ${debugInfo}`}
              </pre>
            </div>
            <Button onClick={handleRefresh} className="mt-4">
              Reintentar
            </Button>
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
            <Button variant="outline" size="sm" onClick={handleCenter} disabled={isLoading || !mapInstance.current}>
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
              <div className="mt-2 text-xs text-gray-500">
                <div>
                  Intentos: {initAttempts.current}/{maxAttempts}
                </div>
                <div>Estado: {debugInfo}</div>
              </div>
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

            {/* Contenedor del mapa - SIMPLIFICADO */}
            <div className="w-full bg-white rounded-lg border shadow-sm overflow-hidden">
              <div
                ref={mapRef}
                className="w-full bg-gray-100"
                style={{
                  height: "400px",
                  minHeight: "400px",
                  display: "block",
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

            {/* Debug info en desarrollo */}
            {process.env.NODE_ENV === "development" && (
              <details className="bg-gray-100 p-3 rounded text-xs">
                <summary className="cursor-pointer font-semibold">Debug Info</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {`Contenedor ref: ${mapRef.current ? "✓" : "✗"}
Mapa instancia: ${mapInstance.current ? "✓" : "✗"}
Marcadores: ${markers.current.length}
Intentos: ${initAttempts.current}/${maxAttempts}
Cargando: ${isLoading ? "✓" : "✗"}
Error: ${error || "Ninguno"}
Debug: ${debugInfo}`}
                </pre>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
