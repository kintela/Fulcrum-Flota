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
  const mapInstanceRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [isMounted, setIsMounted] = useState(false)

  // Marcar componente como montado
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Debug: Log initial data
  useEffect(() => {
    const cochesConUbicacion = coches.filter((c) => c.latitud && c.longitud && !c.donante)
    console.log("MapaCoches - Datos recibidos:", {
      totalCoches: coches.length,
      cochesConUbicacion: cochesConUbicacion.length,
      cochesNoDonantes: coches.filter((c) => !c.donante).length,
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "Configurada" : "NO CONFIGURADA",
      primerosCoches: cochesConUbicacion.slice(0, 3),
    })

    setDebugInfo(
      `
Total coches: ${coches.length}
Con ubicación: ${cochesConUbicacion.length}
No donantes: ${coches.filter((c) => !c.donante).length}
API Key: ${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "✓" : "✗"}
Componente montado: ${isMounted ? "✓" : "✗"}
    `.trim(),
    )
  }, [coches, isMounted])

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
    if (!isMounted) return

    let retryCount = 0
    const maxRetries = 10

    const initMap = () => {
      console.log(`Intento ${retryCount + 1} de inicializar mapa...`)
      console.log("mapRef.current:", !!mapRef.current)
      console.log("window.google:", !!window.google)
      console.log("isMounted:", isMounted)

      if (!isMounted) {
        console.log("Componente no montado, cancelando...")
        return
      }

      if (!mapRef.current) {
        console.log("mapRef.current no disponible, reintentando...")
        retryCount++
        if (retryCount < maxRetries) {
          setTimeout(initMap, 100)
          return
        } else {
          console.error("mapRef.current no está disponible después de múltiples intentos")
          setError("Error: Contenedor del mapa no encontrado después de múltiples intentos")
          setIsLoading(false)
          return
        }
      }

      if (!window.google || !window.google.maps) {
        console.error("Google Maps no está disponible")
        setError("Error: Google Maps no cargado correctamente")
        setIsLoading(false)
        return
      }

      try {
        console.log("Creando instancia del mapa...")

        // Limpiar mapa anterior si existe
        if (mapInstanceRef.current) {
          mapInstanceRef.current = null
        }

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

        mapInstanceRef.current = mapInstance
        console.log("Mapa creado exitosamente")

        // Esperar a que el mapa esté completamente listo
        window.google.maps.event.addListenerOnce(mapInstance, "tilesloaded", () => {
          console.log("Mapa completamente cargado")
          setIsLoading(false)
          setError(null)
        })

        // Fallback en caso de que tilesloaded no se dispare
        setTimeout(() => {
          if (isLoading) {
            console.log("Fallback: marcando mapa como listo")
            setIsLoading(false)
            setError(null)
          }
        }, 2000)
      } catch (err) {
        console.error("Error creando mapa:", err)
        setError(`Error al crear el mapa: ${err instanceof Error ? err.message : "Error desconocido"}`)
        setIsLoading(false)
      }
    }

    const loadGoogleMaps = () => {
      console.log("Iniciando carga de Google Maps...")

      // Verificar que tenemos la API key
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      console.log("API Key disponible:", !!apiKey)

      if (!apiKey) {
        console.error("API key no configurada")
        setError("API key de Google Maps no configurada. Verifica NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")
        setIsLoading(false)
        return
      }

      if (window.google && window.google.maps) {
        console.log("Google Maps ya está cargado")
        // Pequeño delay para asegurar que el componente esté montado
        setTimeout(initMap, 100)
        return
      }

      // Limpiar callback anterior si existe
      if (window.initMapaCoches) {
        delete window.initMapaCoches
      }

      // Crear callback global único
      window.initMapaCoches = () => {
        console.log("Callback de Google Maps ejecutado")
        // Delay para asegurar que el componente esté completamente montado
        setTimeout(initMap, 200)
      }

      // Remover script anterior si existe
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        console.log("Removiendo script anterior")
        existingScript.remove()
      }

      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMapaCoches`
      script.async = true
      script.defer = true

      script.onload = () => {
        console.log("Script de Google Maps cargado exitosamente")
      }

      script.onerror = (e) => {
        console.error("Error cargando script de Google Maps:", e)
        setError(
          "Error al cargar Google Maps. Verifica tu API key, conexión a internet y que las APIs estén habilitadas.",
        )
        setIsLoading(false)
      }

      console.log("Agregando script al DOM...")
      document.head.appendChild(script)
    }

    loadGoogleMaps()

    // Cleanup
    return () => {
      if (window.initMapaCoches) {
        delete window.initMapaCoches
      }
    }
  }, [isMounted])

  // Agregar marcadores cuando el mapa esté listo
  useEffect(() => {
    if (isLoading || !mapInstanceRef.current || !window.google || !isMounted) {
      console.log("Esperando mapa:", {
        isLoading,
        map: !!mapInstanceRef.current,
        google: !!window.google,
        isMounted,
      })
      return
    }

    console.log("Agregando marcadores...")

    // Limpiar marcadores existentes
    markers.forEach((marker) => {
      if (marker && marker.setMap) {
        marker.setMap(null)
      }
    })
    setMarkers([])

    const cochesConUbicacion = coches.filter(
      (coche) =>
        coche.latitud &&
        coche.longitud &&
        !coche.donante &&
        typeof coche.latitud === "number" &&
        typeof coche.longitud === "number" &&
        !isNaN(coche.latitud) &&
        !isNaN(coche.longitud),
    )

    console.log("Coches con ubicación válida:", cochesConUbicacion.length, cochesConUbicacion)

    if (cochesConUbicacion.length === 0) {
      console.log("No hay coches con ubicación válida")
      return
    }

    const bounds = new window.google.maps.LatLngBounds()
    const newMarkers: any[] = []
    let markersCreated = 0

    cochesConUbicacion.forEach((coche, index) => {
      try {
        const lat = Number(coche.latitud)
        const lng = Number(coche.longitud)

        console.log(`Creando marcador ${index + 1} para ${coche.matricula}:`, { lat, lng })

        const position = { lat, lng }
        const empleadoInfo = getEmpleadoInfo(coche)
        const isAssigned = !!empleadoInfo || !!coche.asignadoa

        // Crear marcador
        const marker = new window.google.maps.Marker({
          position,
          map: mapInstanceRef.current,
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
          newMarkers.forEach((m) => {
            if (m.infoWindow && m.infoWindow.close) {
              m.infoWindow.close()
            }
          })
          infoWindow.open(mapInstanceRef.current, marker)
        })

        // Guardar referencia a la ventana de información
        marker.infoWindow = infoWindow
        newMarkers.push(marker)
        bounds.extend(position)
        markersCreated++

        console.log(`Marcador ${markersCreated} creado exitosamente para ${coche.matricula}`)
      } catch (err) {
        console.error(`Error creando marcador para ${coche.matricula}:`, err)
      }
    })

    console.log(`Total marcadores creados: ${markersCreated}`)
    setMarkers(newMarkers)

    // Ajustar el mapa para mostrar todos los marcadores
    if (newMarkers.length > 0) {
      try {
        console.log("Ajustando vista del mapa...")
        mapInstanceRef.current.fitBounds(bounds)

        // Evitar zoom excesivo si solo hay un marcador
        window.google.maps.event.addListenerOnce(mapInstanceRef.current, "bounds_changed", () => {
          if (mapInstanceRef.current.getZoom() && mapInstanceRef.current.getZoom() > 15) {
            mapInstanceRef.current.setZoom(15)
          }
        })
      } catch (err) {
        console.error("Error ajustando vista del mapa:", err)
      }
    }
  }, [isLoading, coches, empleados, isMounted])

  const handleRefresh = () => {
    console.log("Refrescando página...")
    window.location.reload()
  }

  const handleCenterMap = () => {
    if (mapInstanceRef.current && markers.length > 0) {
      try {
        console.log("Centrando mapa...")
        const bounds = new window.google.maps.LatLngBounds()
        markers.forEach((marker) => {
          if (marker && marker.getPosition) {
            bounds.extend(marker.getPosition())
          }
        })
        mapInstanceRef.current.fitBounds(bounds)
      } catch (err) {
        console.error("Error centrando mapa:", err)
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
            <div className="bg-gray-100 p-4 rounded-lg mb-4 text-left">
              <h4 className="font-semibold mb-2">Información de Debug:</h4>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">{debugInfo}</pre>
            </div>
            <div className="text-sm text-gray-500 mb-4">
              <p>
                <strong>Pasos para solucionar:</strong>
              </p>
              <ol className="text-left mt-2 space-y-1">
                <li>1. Verifica que NEXT_PUBLIC_GOOGLE_MAPS_API_KEY esté configurada</li>
                <li>2. Asegúrate de que las APIs estén habilitadas en Google Cloud Console:</li>
                <li>&nbsp;&nbsp;&nbsp;- Maps JavaScript API</li>
                <li>&nbsp;&nbsp;&nbsp;- Places API</li>
                <li>&nbsp;&nbsp;&nbsp;- Geocoding API</li>
                <li>3. Verifica que la API key tenga permisos para tu dominio</li>
                <li>4. Intenta refrescar la página</li>
              </ol>
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
              <p className="text-gray-500 mb-2">Cargando mapa...</p>
              <div className="bg-white p-3 rounded border text-xs text-gray-600 max-w-md">
                <pre className="whitespace-pre-wrap">{debugInfo}</pre>
              </div>
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
            <div
              ref={mapRef}
              className="w-full h-96 rounded-lg border shadow-sm bg-gray-100"
              style={{ minHeight: "400px" }}
              id="mapa-coches-container"
            />

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
                <pre className="mt-2 whitespace-pre-wrap">{debugInfo}</pre>
                <div className="mt-2">
                  <strong>Marcadores activos:</strong> {markers.length}
                  <br />
                  <strong>Mapa ref disponible:</strong> {mapRef.current ? "✓" : "✗"}
                  <br />
                  <strong>Mapa instancia:</strong> {mapInstanceRef.current ? "✓" : "✗"}
                </div>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
