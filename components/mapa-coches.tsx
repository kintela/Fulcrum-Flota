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
    initMapaCoches?: () => void
  }
}

export function MapaCoches({ coches, empleados = [] }: MapaCochesProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

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

  // Marcar como montado
  useEffect(() => {
    setMounted(true)
  }, [])

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
      const listener = window.google.maps.event.addListenerOnce(map, "bounds_changed", () => {
        if (map.getZoom() > 15) {
          map.setZoom(15)
        }
      })
    }
  }

  // Función para inicializar el mapa
  const initMap = () => {
    console.log("🗺️ Inicializando mapa...")
    console.log("📦 Contenedor disponible:", !!mapRef.current)
    console.log("🌍 Google Maps disponible:", !!(window.google && window.google.maps))

    // Verificar que el contenedor existe y está en el DOM
    if (!mapRef.current) {
      console.error("❌ No se encontró el contenedor del mapa")
      setError("No se pudo encontrar el contenedor del mapa")
      setIsLoading(false)
      return
    }

    // Verificar que el contenedor está visible
    const rect = mapRef.current.getBoundingClientRect()
    console.log("📏 Dimensiones del contenedor:", rect)

    if (rect.width === 0 || rect.height === 0) {
      console.error("❌ El contenedor del mapa no tiene dimensiones")
      setError("El contenedor del mapa no tiene dimensiones válidas")
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

      console.log("✅ Mapa creado exitosamente")
      setMapInstance(map)
      setIsLoading(false)
      setError(null)

      // Agregar marcadores después de un pequeño delay
      setTimeout(() => {
        addMarkers(map)
      }, 100)
    } catch (err) {
      console.error("❌ Error creando el mapa:", err)
      setError(`Error al crear el mapa: ${err instanceof Error ? err.message : "Error desconocido"}`)
      setIsLoading(false)
    }
  }

  // Cargar Google Maps
  useEffect(() => {
    if (!mounted) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    console.log("🔑 API Key disponible:", !!apiKey)

    if (!apiKey) {
      setError("API key de Google Maps no configurada. Verifica NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")
      setIsLoading(false)
      return
    }

    // Timeout de seguridad
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.error("⏰ Timeout cargando Google Maps")
        setError("Timeout cargando Google Maps. Verifica tu conexión a internet.")
        setIsLoading(false)
      }
    }, 20000) // 20 segundos

    // Si Google Maps ya está cargado
    if (window.google?.maps) {
      console.log("♻️ Google Maps ya está disponible")
      clearTimeout(timeoutId)
      // Esperar a que el DOM esté completamente listo
      setTimeout(() => {
        initMap()
      }, 100)
      return
    }

    // Callback global único
    const callbackName = `initMapaCoches_${Date.now()}`
    window[callbackName as keyof Window] = () => {
      console.log("📞 Callback de Google Maps ejecutado")
      clearTimeout(timeoutId)
      // Esperar un poco más para asegurar que todo esté listo
      setTimeout(() => {
        initMap()
      }, 200)
    }

    // Cargar script solo si no existe
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      console.log("🔄 Script de Google Maps ya existe, esperando...")
      // Si el script ya existe, esperar y luego inicializar
      setTimeout(() => {
        if (window.google?.maps) {
          initMap()
        } else {
          setError("Google Maps no se cargó correctamente")
          setIsLoading(false)
        }
      }, 1000)
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
        clearTimeout(timeoutId)
        setError("Error al cargar Google Maps. Verifica tu API key y conexión a internet.")
        setIsLoading(false)
      }

      document.head.appendChild(script)
    }

    return () => {
      clearTimeout(timeoutId)
      if (window[callbackName as keyof Window]) {
        delete window[callbackName as keyof Window]
      }
    }
  }, [mounted, isLoading])

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

  // No renderizar hasta que esté montado
  if (!mounted) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Vehículos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Inicializando componente...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
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
Contenedor: ${mapRef.current ? "✓ Encontrado" : "✗ No encontrado"}`}
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

            {/* Contenedor del mapa */}
            <div className="w-full bg-white rounded-lg border shadow-sm overflow-hidden">
              <div
                ref={mapRef}
                id="google-map-container"
                className="w-full h-96 bg-gray-100"
                style={{
                  minHeight: "400px",
                  width: "100%",
                  height: "400px",
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
                  {`Montado: ${mounted ? "✓" : "✗"}
Contenedor ref: ${mapRef.current ? "✓" : "✗"}
Mapa instancia: ${mapInstance ? "✓" : "✗"}
Google Maps: ${typeof window !== "undefined" && window.google?.maps ? "✓" : "✗"}
Cargando: ${isLoading ? "✓" : "✗"}
Error: ${error || "Ninguno"}`}
                </pre>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
