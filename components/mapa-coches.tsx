"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, RefreshCw, Navigation, AlertCircle, Car } from "lucide-react"

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

// Hook personalizado para Google Maps con verificación completa
function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  // Función para verificar si Google Maps está completamente cargado
  const isGoogleMapsReady = useCallback(() => {
    return !!(
      window.google &&
      window.google.maps &&
      window.google.maps.Map &&
      window.google.maps.Marker &&
      window.google.maps.InfoWindow &&
      window.google.maps.LatLngBounds &&
      window.google.maps.MapTypeId &&
      window.google.maps.MapTypeId.ROADMAP &&
      window.google.maps.MapTypeId.SATELLITE &&
      window.google.maps.SymbolPath &&
      window.google.maps.event
    )
  }, [])

  const loadGoogleMaps = useCallback(async () => {
    if (loadingRef.current || isLoaded) {
      return
    }

    // Verificar si ya está cargado
    if (isGoogleMapsReady()) {
      setIsLoaded(true)
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setError("API key de Google Maps no configurada")
      return
    }

    loadingRef.current = true

    try {
      // Verificar si ya existe el script
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')

      if (existingScript) {
        // Script ya existe, esperar a que se cargue completamente
        let attempts = 0
        const checkLoaded = () => {
          if (isGoogleMapsReady()) {
            setIsLoaded(true)
            loadingRef.current = false
            return
          }
          attempts++
          if (attempts < 100) {
            // Aumentar intentos
            setTimeout(checkLoaded, 100)
          } else {
            setError("Timeout: Google Maps no se cargó completamente")
            loadingRef.current = false
          }
        }
        checkLoaded()
        return
      }

      // Crear callback único para este intento de carga
      const callbackName = `initGoogleMaps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Definir callback global
      ;(window as any)[callbackName] = () => {
        console.log("🗺️ Callback de Google Maps ejecutado")

        // Verificar que todo esté disponible
        let checkAttempts = 0
        const verifyComplete = () => {
          if (isGoogleMapsReady()) {
            console.log("✅ Google Maps completamente cargado")
            setIsLoaded(true)
            loadingRef.current = false
            // Limpiar callback
            delete (window as any)[callbackName]
          } else {
            checkAttempts++
            if (checkAttempts < 50) {
              setTimeout(verifyComplete, 100)
            } else {
              setError("Google Maps no se cargó completamente")
              loadingRef.current = false
              delete (window as any)[callbackName]
            }
          }
        }
        verifyComplete()
      }

      // Crear script
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}&loading=async`
      script.async = true
      script.defer = true

      script.onerror = () => {
        setError("Error cargando el script de Google Maps")
        loadingRef.current = false
        delete (window as any)[callbackName]
      }

      console.log("🔄 Cargando Google Maps...")
      document.head.appendChild(script)
    } catch (err) {
      console.error("Error al cargar Google Maps:", err)
      setError("Error al cargar Google Maps")
      loadingRef.current = false
    }
  }, [isLoaded, isGoogleMapsReady])

  useEffect(() => {
    loadGoogleMaps()
  }, [loadGoogleMaps])

  return { isLoaded, error, loadGoogleMaps, isGoogleMapsReady }
}

export function MapaCoches({ coches, empleados = [] }: MapaCochesProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markers = useRef<any[]>([])
  const { isLoaded, error, isGoogleMapsReady } = useGoogleMaps()

  const [isInitializing, setIsInitializing] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [selectedMatricula, setSelectedMatricula] = useState<string>("all")
  const [vehicleMessage, setVehicleMessage] = useState<string>("")

  // Crear mapa de empleados
  const empleadosMap = new Map()
  empleados.forEach((empleado) => {
    empleadosMap.set(empleado.id, empleado)
  })

  const getEmpleadoInfo = useCallback(
    (coche: Coche) => {
      if (!coche.asignadoa) return null
      const empleadoId = Number(coche.asignadoa)
      if (!isNaN(empleadoId)) {
        return empleadosMap.get(empleadoId)
      }
      if (typeof coche.asignadoa === "string" && coche.asignadoa.trim() !== "") {
        return { nombre: coche.asignadoa, apellidos: "" }
      }
      return null
    },
    [empleadosMap],
  )

  // Función para limpiar marcadores
  const clearMarkers = useCallback(() => {
    markers.current.forEach((marker) => {
      if (marker && typeof marker.setMap === "function") {
        try {
          marker.setMap(null)
        } catch (e) {
          console.warn("Error limpiando marcador:", e)
        }
      }
    })
    markers.current = []
  }, [])

  // Función para agregar marcadores
  const addMarkers = useCallback(
    (map: any) => {
      if (!map || !isGoogleMapsReady()) {
        console.warn("Mapa o Google Maps no están listos para agregar marcadores")
        return
      }

      // Limpiar marcadores existentes
      clearMarkers()

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
        try {
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
        } catch (error) {
          console.error("Error creando marcador:", error)
        }
      })

      // Ajustar vista del mapa con zoom más alto
      if (cochesConUbicacion.length > 0) {
        try {
          map.fitBounds(bounds)
          const listener = window.google.maps.event.addListenerOnce(map, "bounds_changed", () => {
            // Zoom más alto para ver más de cerca las ubicaciones
            if (map.getZoom() > 16) {
              map.setZoom(16)
            } else if (map.getZoom() < 14) {
              map.setZoom(14)
            }
          })
        } catch (error) {
          console.error("Error ajustando vista del mapa:", error)
        }
      }
    },
    [coches, getEmpleadoInfo, clearMarkers, isGoogleMapsReady],
  )

  // Función para inicializar el mapa
  const initializeMap = useCallback(async () => {
    if (!mapRef.current || !isLoaded || !isGoogleMapsReady() || mapInstance.current) {
      return
    }

    setIsInitializing(true)
    setMapError(null)

    try {
      console.log("🗺️ Inicializando mapa...")
      console.log("Verificando Google Maps:", {
        google: !!window.google,
        maps: !!window.google?.maps,
        Map: !!window.google?.maps?.Map,
        MapTypeId: !!window.google?.maps?.MapTypeId,
        ROADMAP: !!window.google?.maps?.MapTypeId?.ROADMAP,
        SATELLITE: !!window.google?.maps?.MapTypeId?.SATELLITE,
      })

      // Verificación adicional
      if (!window.google?.maps?.MapTypeId?.SATELLITE) {
        throw new Error("Google Maps MapTypeId no está disponible")
      }

      // Crear el mapa en modo satélite por defecto con zoom más alto
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 15, // Zoom más alto para ver más de cerca
        center: { lat: 43.2627, lng: -2.9253 }, // Bilbao como centro por defecto
        mapTypeId: window.google.maps.MapTypeId.SATELLITE, // Modo satélite por defecto
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_CENTER,
        },
        streetViewControl: true,
        fullscreenControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      })

      mapInstance.current = map
      console.log("✅ Mapa creado exitosamente en modo satélite con zoom alto")

      // Esperar a que el mapa esté listo y agregar marcadores
      window.google.maps.event.addListenerOnce(map, "idle", () => {
        console.log("🎯 Mapa completamente listo")
        addMarkers(map)
        setIsInitializing(false)
      })

      // Fallback
      setTimeout(() => {
        if (isInitializing) {
          console.log("⏰ Fallback: agregando marcadores")
          addMarkers(map)
          setIsInitializing(false)
        }
      }, 3000)
    } catch (err) {
      console.error("❌ Error creando el mapa:", err)
      setMapError(`Error al crear el mapa: ${err instanceof Error ? err.message : "Error desconocido"}`)
      setIsInitializing(false)
    }
  }, [isLoaded, addMarkers, isInitializing, isGoogleMapsReady])

  // Effect para inicializar el mapa cuando esté listo
  useEffect(() => {
    if (isLoaded && isGoogleMapsReady() && !mapInstance.current) {
      // Pequeño delay para asegurar que todo esté listo
      setTimeout(() => {
        initializeMap()
      }, 100)
    }
  }, [isLoaded, initializeMap, isGoogleMapsReady])

  // Effect para actualizar marcadores cuando cambien los datos
  useEffect(() => {
    if (mapInstance.current && isLoaded && isGoogleMapsReady()) {
      addMarkers(mapInstance.current)
    }
  }, [coches, empleados, addMarkers, isLoaded, isGoogleMapsReady])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      clearMarkers()
      if (mapInstance.current) {
        mapInstance.current = null
      }
    }
  }, [clearMarkers])

  const handleRefresh = useCallback(() => {
    window.location.reload()
  }, [])

  const handleCenter = useCallback(() => {
    if (mapInstance.current && coches.length > 0 && isGoogleMapsReady()) {
      const cochesConUbicacion = coches.filter((c) => c.latitud && c.longitud && !c.donante)
      if (cochesConUbicacion.length > 0) {
        try {
          const bounds = new window.google.maps.LatLngBounds()
          cochesConUbicacion.forEach((coche) => {
            bounds.extend({ lat: Number(coche.latitud), lng: Number(coche.longitud) })
          })
          mapInstance.current.fitBounds(bounds)
          // Ajustar zoom después de centrar con zoom más alto
          setTimeout(() => {
            if (mapInstance.current.getZoom() > 16) {
              mapInstance.current.setZoom(16)
            } else if (mapInstance.current.getZoom() < 14) {
              mapInstance.current.setZoom(14)
            }
          }, 100)
        } catch (error) {
          console.error("Error centrando mapa:", error)
        }
      }
    }
  }, [coches, isGoogleMapsReady])

  // FIXED: Calculate statistics correctly - only from vehicles with location
  const cochesConUbicacion = coches.filter((c) => c.latitud && c.longitud && !c.donante)
  const cochesAsignados = cochesConUbicacion.filter((c) => getEmpleadoInfo(c) || c.asignadoa)
  const cochesDisponibles = cochesConUbicacion.filter((c) => !getEmpleadoInfo(c) && !c.asignadoa)

  const isLoading = !isLoaded || isInitializing
  const displayError = error || mapError

  const zoomToVehicles = useCallback(
    (filterType: "all" | "assigned" | "available") => {
      if (!mapInstance.current || !isGoogleMapsReady()) return

      let targetCoches: Coche[] = []

      switch (filterType) {
        case "all":
          targetCoches = cochesConUbicacion
          break
        case "assigned":
          targetCoches = cochesAsignados
          break
        case "available":
          targetCoches = cochesDisponibles
          break
      }

      if (targetCoches.length === 0) return

      try {
        const bounds = new window.google.maps.LatLngBounds()
        targetCoches.forEach((coche) => {
          bounds.extend({ lat: Number(coche.latitud), lng: Number(coche.longitud) })
        })

        mapInstance.current.fitBounds(bounds)

        // Adjust zoom after centering
        setTimeout(() => {
          if (targetCoches.length === 1) {
            // For single vehicle, zoom closer
            mapInstance.current.setZoom(18)
          } else if (mapInstance.current.getZoom() > 16) {
            mapInstance.current.setZoom(16)
          } else if (mapInstance.current.getZoom() < 12) {
            mapInstance.current.setZoom(12)
          }
        }, 100)
      } catch (error) {
        console.error("Error zooming to vehicles:", error)
      }
    },
    [cochesConUbicacion, cochesAsignados, cochesDisponibles, isGoogleMapsReady],
  )

  // Función para buscar vehículo específico
  const handleVehicleSelect = useCallback(
    (matricula: string) => {
      setSelectedMatricula(matricula)
      setVehicleMessage("")

      if (!matricula || matricula === "all") return

      const coche = coches.find((c) => c.matricula === matricula)
      if (!coche) {
        setVehicleMessage("Vehículo no encontrado")
        return
      }

      // Verificar si tiene ubicación
      if (!coche.latitud || !coche.longitud || coche.donante) {
        const empleadoInfo = getEmpleadoInfo(coche)
        const status = empleadoInfo
          ? `asignado a ${empleadoInfo.nombre} ${empleadoInfo.apellidos || ""}`
          : coche.asignadoa
            ? `asignado a ${coche.asignadoa}`
            : "disponible"

        setVehicleMessage(
          `${coche.matricula} (${coche.marca} ${coche.modelo}) está ${status} pero no tiene ubicación registrada${
            coche.donante ? " (vehículo donante)" : ""
          }`,
        )
        return
      }

      // Tiene ubicación, centrar en el mapa
      if (mapInstance.current && isGoogleMapsReady()) {
        try {
          const position = { lat: Number(coche.latitud), lng: Number(coche.longitud) }
          mapInstance.current.setCenter(position)
          mapInstance.current.setZoom(18)

          // Buscar el marcador correspondiente y abrir su info window
          const targetMarker = markers.current.find((marker) => marker.getTitle().includes(matricula))
          if (targetMarker) {
            // Simular click en el marcador para abrir la info window
            window.google.maps.event.trigger(targetMarker, "click")
          }

          const empleadoInfo = getEmpleadoInfo(coche)
          const status = empleadoInfo
            ? `asignado a ${empleadoInfo.nombre} ${empleadoInfo.apellidos || ""}`
            : coche.asignadoa
              ? `asignado a ${coche.asignadoa}`
              : "disponible"

          setVehicleMessage(`${coche.matricula} (${coche.marca} ${coche.modelo}) está ${status} y ubicado en el mapa`)
        } catch (error) {
          console.error("Error centrando en vehículo:", error)
          setVehicleMessage("Error al mostrar la ubicación del vehículo")
        }
      }
    },
    [coches, getEmpleadoInfo, isGoogleMapsReady],
  )

  // Obtener todas las matrículas ordenadas alfabéticamente
  const matriculasOrdenadas = coches
    .map((c) => c.matricula)
    .sort((a, b) => a.localeCompare(b))
    .filter((matricula, index, array) => array.indexOf(matricula) === index) // Eliminar duplicados

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
        <div className="space-y-4">
          {/* Selector de vehículo */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Buscar vehículo:</span>
              </div>
              <div className="flex-1 max-w-xs">
                <Select value={selectedMatricula} onValueChange={handleVehicleSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar matrícula..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Mostrar todos</SelectItem>
                    {matriculasOrdenadas.map((matricula) => {
                      const coche = coches.find((c) => c.matricula === matricula)
                      const hasLocation = coche?.latitud && coche?.longitud && !coche?.donante
                      return (
                        <SelectItem key={matricula} value={matricula}>
                          {matricula} {hasLocation ? "📍" : "❌"}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {vehicleMessage && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">{vehicleMessage}</p>
              </div>
            )}
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <button
              onClick={() => zoomToVehicles("all")}
              className="text-center hover:bg-blue-50 p-2 rounded-lg transition-colors cursor-pointer group"
              disabled={cochesConUbicacion.length === 0}
            >
              <div className="text-2xl font-bold text-blue-600 group-hover:text-blue-700">
                {cochesConUbicacion.length}
              </div>
              <div className="text-sm text-gray-600 group-hover:text-gray-700">Total con ubicación</div>
              <div className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Click para ver en mapa
              </div>
            </button>
            <button
              onClick={() => zoomToVehicles("assigned")}
              className="text-center hover:bg-green-50 p-2 rounded-lg transition-colors cursor-pointer group"
              disabled={cochesAsignados.length === 0}
            >
              <div className="text-2xl font-bold text-green-600 group-hover:text-green-700">
                {cochesAsignados.length}
              </div>
              <div className="text-sm text-gray-600 group-hover:text-gray-700">Asignados</div>
              <div className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Click para ver en mapa
              </div>
            </button>
            <button
              onClick={() => zoomToVehicles("available")}
              className="text-center hover:bg-blue-50 p-2 rounded-lg transition-colors cursor-pointer group"
              disabled={cochesDisponibles.length === 0}
            >
              <div className="text-2xl font-bold text-blue-500 group-hover:text-blue-600">
                {cochesDisponibles.length}
              </div>
              <div className="text-sm text-gray-600 group-hover:text-gray-700">Disponibles</div>
              <div className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Click para ver en mapa
              </div>
            </button>
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
              className="w-full bg-gray-100 relative"
              style={{
                height: "400px",
                minHeight: "400px",
                width: "100%",
                display: "block",
                position: "relative",
              }}
            >
              {/* Overlay de carga */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500 mb-2">Cargando mapa...</p>
                    <p className="text-xs text-gray-400">
                      Total coches: {coches.length} | Con ubicación: {cochesConUbicacion.length}
                    </p>
                    {!isLoaded && <p className="text-xs text-gray-400 mt-2">Cargando Google Maps...</p>}
                  </div>
                </div>
              )}

              {/* Overlay de error */}
              {displayError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                  <div className="text-center p-4">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-600 mb-4 font-medium">{displayError}</p>
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
                    <Button onClick={handleRefresh} className="mt-4">
                      Reintentar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {cochesConUbicacion.length === 0 && !isLoading && !displayError && (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">
                No hay vehículos con ubicación registrada.
                <br />
                <span className="text-xs">Ejecuta el script SQL para agregar ubicaciones de ejemplo.</span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
