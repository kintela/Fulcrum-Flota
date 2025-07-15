"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Navigation, Save, Trash2, RefreshCw, AlertCircle, Search } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface UbicacionEditorProps {
  matricula: string
  latitud?: number | null
  longitud?: number | null
  direccion_actual?: string | null
  onUbicacionGuardada?: () => void
}

// Hook personalizado para Google Maps (mejorado)
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
      window.google.maps.Geocoder &&
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
      const callbackName = `initGoogleMapsEditor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Definir callback global
      ;(window as any)[callbackName] = () => {
        console.log("🗺️ Callback de Google Maps Editor ejecutado")

        // Verificar que todo esté disponible
        let checkAttempts = 0
        const verifyComplete = () => {
          if (isGoogleMapsReady()) {
            console.log("✅ Google Maps Editor completamente cargado")
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

      console.log("🔄 Cargando Google Maps Editor...")
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

export function UbicacionEditor({
  matricula,
  latitud: initialLatitud,
  longitud: initialLongitud,
  direccion_actual: initialDireccion,
  onUbicacionGuardada,
}: UbicacionEditorProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const marker = useRef<any>(null)
  const geocoder = useRef<any>(null)
  const { isLoaded, error, isGoogleMapsReady } = useGoogleMaps()

  const [isInitializing, setIsInitializing] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Estados del formulario
  const [latitud, setLatitud] = useState<string>(initialLatitud?.toString() || "")
  const [longitud, setLongitud] = useState<string>(initialLongitud?.toString() || "")
  const [direccion, setDireccion] = useState<string>(initialDireccion || "")

  // Estado para el campo de búsqueda
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Coordenadas exactas de Fulcrum, S.A. en Leioa (Calle Aldapa 13) - obtenidas del enlace de Google Maps
  const FULCRUM_SEDE = {
    lat: 43.32969,
    lng: -2.98469,
    address: "Calle Aldapa, 13, 48940 Leioa, Bizkaia, España",
  }

  // Función para buscar ubicación por dirección o coordenadas
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !geocoder.current || !isGoogleMapsReady()) {
      toast({
        title: "Error",
        description: "Introduce una dirección o coordenadas para buscar",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)

    try {
      // Verificar si es un formato de coordenadas (lat, lng)
      const coordsMatch = searchQuery.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/)

      if (coordsMatch) {
        // Es un formato de coordenadas
        const lat = Number.parseFloat(coordsMatch[1])
        const lng = Number.parseFloat(coordsMatch[2])

        if (isNaN(lat) || isNaN(lng)) {
          throw new Error("Coordenadas inválidas")
        }

        // Centrar el mapa en las coordenadas
        if (mapInstance.current) {
          const position = { lat, lng }
          mapInstance.current.setCenter(position)
          mapInstance.current.setZoom(16)

          // Obtener la dirección de las coordenadas
          const address = await geocodeLatLng(lat, lng)

          toast({
            title: "Ubicación encontrada",
            description: `Coordenadas: ${lat}, ${lng}`,
          })
        }
      } else {
        // Es una dirección, usar geocoding
        const response = await new Promise((resolve, reject) => {
          geocoder.current.geocode({ address: searchQuery }, (results: any[], status: string) => {
            if (status === "OK" && results[0]) {
              resolve(results[0])
            } else {
              reject(new Error(`No se encontró la ubicación: ${status}`))
            }
          })
        })

        const result = response as any
        const location = result.geometry.location
        const lat = location.lat()
        const lng = location.lng()

        // Centrar el mapa en la ubicación encontrada
        if (mapInstance.current) {
          const position = { lat, lng }
          mapInstance.current.setCenter(position)
          mapInstance.current.setZoom(16)

          toast({
            title: "Ubicación encontrada",
            description: result.formatted_address,
          })
        }
      }
    } catch (error) {
      console.error("Error en búsqueda:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo encontrar la ubicación",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, isGoogleMapsReady])

  // Función para obtener dirección desde coordenadas
  const geocodeLatLng = useCallback(
    async (lat: number, lng: number) => {
      if (!geocoder.current || !isGoogleMapsReady()) return null

      try {
        const response = await new Promise((resolve, reject) => {
          geocoder.current.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
            if (status === "OK" && results[0]) {
              resolve(results[0].formatted_address)
            } else {
              reject(new Error(`Geocoding failed: ${status}`))
            }
          })
        })
        return response as string
      } catch (error) {
        console.error("Error en geocoding:", error)
        return null
      }
    },
    [isGoogleMapsReady],
  )

  // Función para actualizar marcador
  const updateMarker = useCallback(
    async (lat: number, lng: number) => {
      if (!mapInstance.current || !isGoogleMapsReady()) return

      const position = { lat, lng }

      try {
        if (marker.current) {
          marker.current.setPosition(position)
        } else {
          const newMarker = new window.google.maps.Marker({
            position,
            map: mapInstance.current,
            draggable: true,
            title: `Ubicación de ${matricula}`,
          })

          newMarker.addListener("dragend", async (event: any) => {
            const newLat = event.latLng.lat()
            const newLng = event.latLng.lng()
            setLatitud(newLat.toFixed(6))
            setLongitud(newLng.toFixed(6))

            const address = await geocodeLatLng(newLat, newLng)
            if (address) {
              setDireccion(address)
            }
          })

          marker.current = newMarker
        }

        mapInstance.current.setCenter(position)
        mapInstance.current.setZoom(19) // Zoom muy alto para ver la ubicación exacta
      } catch (error) {
        console.error("Error actualizando marcador:", error)
      }
    },
    [matricula, geocodeLatLng, isGoogleMapsReady],
  )

  // Función para inicializar el editor
  const initializeEditor = useCallback(async () => {
    if (!mapRef.current || !isLoaded || !isGoogleMapsReady() || mapInstance.current) {
      return
    }

    setIsInitializing(true)
    setMapError(null)

    try {
      console.log("🗺️ Editor - Inicializando...")
      console.log("Verificando Google Maps Editor:", {
        google: !!window.google,
        maps: !!window.google?.maps,
        Map: !!window.google?.maps?.Map,
        MapTypeId: !!window.google?.maps?.MapTypeId,
        ROADMAP: !!window.google?.maps?.MapTypeId?.ROADMAP,
        SATELLITE: !!window.google?.maps?.MapTypeId?.SATELLITE,
        Geocoder: !!window.google?.maps?.Geocoder,
      })

      // Verificación adicional
      if (!window.google?.maps?.MapTypeId?.SATELLITE) {
        throw new Error("Google Maps MapTypeId no está disponible")
      }

      const hasInitialLocation = initialLatitud && initialLongitud

      // Si hay ubicación inicial, usar esa; si no, usar la sede exacta de Fulcrum
      const center = hasInitialLocation ? { lat: Number(initialLatitud), lng: Number(initialLongitud) } : FULCRUM_SEDE

      // Determinar el tipo de mapa y zoom
      const mapTypeId = hasInitialLocation
        ? window.google.maps.MapTypeId.ROADMAP
        : window.google.maps.MapTypeId.SATELLITE

      const zoom = hasInitialLocation ? 15 : 19 // Zoom máximo para la sede

      console.log("🎯 Centrando mapa en:", center)

      const map = new window.google.maps.Map(mapRef.current, {
        zoom,
        center,
        mapTypeId,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_CENTER,
        },
        streetViewControl: true,
        fullscreenControl: true,
      })

      mapInstance.current = map

      // Inicializar geocoder
      geocoder.current = new window.google.maps.Geocoder()

      // Si hay ubicación inicial, crear marcador
      if (hasInitialLocation) {
        setTimeout(() => {
          updateMarker(Number(initialLatitud), Number(initialLongitud))
        }, 200)
      } else {
        // Si no hay ubicación inicial, mostrar un marcador en la sede de Fulcrum como referencia
        setTimeout(() => {
          const sedeMarker = new window.google.maps.Marker({
            position: FULCRUM_SEDE,
            map: mapInstance.current,
            title: "Sede Fulcrum, S.A.",
            icon: {
              url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            },
          })

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px;">
                <strong>Sede Fulcrum, S.A.</strong><br>
                <small>${FULCRUM_SEDE.address}</small>
              </div>
            `,
          })

          sedeMarker.addListener("click", () => {
            infoWindow.open(mapInstance.current, sedeMarker)
          })
        }, 300)
      }

      // Agregar listener para clicks en el mapa
      map.addListener("click", async (event: any) => {
        const lat = event.latLng.lat()
        const lng = event.latLng.lng()

        setLatitud(lat.toFixed(6))
        setLongitud(lng.toFixed(6))

        await updateMarker(lat, lng)

        const address = await geocodeLatLng(lat, lng)
        if (address) {
          setDireccion(address)
        }
      })

      console.log("✅ Editor creado exitosamente")
      setIsInitializing(false)
    } catch (err) {
      console.error("❌ Error creando editor:", err)
      setMapError(`Error al crear el editor de ubicación: ${err instanceof Error ? err.message : "Error desconocido"}`)
      setIsInitializing(false)
    }
  }, [isLoaded, initialLatitud, initialLongitud, updateMarker, geocodeLatLng, isGoogleMapsReady])

  // Effect para inicializar el editor cuando esté listo
  useEffect(() => {
    if (isLoaded && isGoogleMapsReady() && !mapInstance.current) {
      // Pequeño delay para asegurar que todo esté listo
      setTimeout(() => {
        initializeEditor()
      }, 100)
    }
  }, [isLoaded, initializeEditor, isGoogleMapsReady])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (marker.current) {
        try {
          marker.current.setMap(null)
        } catch (e) {
          console.warn("Error limpiando marcador:", e)
        }
        marker.current = null
      }
      if (mapInstance.current) {
        mapInstance.current = null
      }
      geocoder.current = null
    }
  }, [])

  // Función para obtener ubicación actual
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "La geolocalización no está disponible",
        variant: "destructive",
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        setLatitud(lat.toFixed(6))
        setLongitud(lng.toFixed(6))

        if (mapInstance.current) {
          await updateMarker(lat, lng)
          const address = await geocodeLatLng(lat, lng)
          if (address) {
            setDireccion(address)
          }
        }

        toast({
          title: "Éxito",
          description: "Ubicación actual obtenida",
        })
      },
      () => {
        toast({
          title: "Error",
          description: "No se pudo obtener la ubicación actual",
          variant: "destructive",
        })
      },
    )
  }, [updateMarker, geocodeLatLng])

  // Función para centrar en la sede de Fulcrum
  const handleCenterOnSede = useCallback(() => {
    if (mapInstance.current && isGoogleMapsReady()) {
      mapInstance.current.setCenter(FULCRUM_SEDE)
      mapInstance.current.setZoom(19)
      mapInstance.current.setMapTypeId(window.google.maps.MapTypeId.SATELLITE)

      toast({
        title: "Mapa centrado",
        description: "Vista centrada en la sede de Fulcrum (modo satélite)",
      })
    }
  }, [isGoogleMapsReady])

  // Función para guardar ubicación
  const handleSave = useCallback(async () => {
    if (!latitud || !longitud) {
      toast({
        title: "Error",
        description: "Debes seleccionar una ubicación",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch(`/api/coches/${matricula}/ubicacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitud: Number.parseFloat(latitud),
          longitud: Number.parseFloat(longitud),
          direccion_actual: direccion,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar ubicación")
      }

      toast({
        title: "Éxito",
        description: "Ubicación guardada correctamente",
      })

      if (onUbicacionGuardada) {
        onUbicacionGuardada()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar ubicación",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [latitud, longitud, direccion, matricula, onUbicacionGuardada])

  // Función para eliminar ubicación
  const handleDelete = useCallback(async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar la ubicación?")) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/coches/${matricula}/ubicacion`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar ubicación")
      }

      setLatitud("")
      setLongitud("")
      setDireccion("")

      if (marker.current) {
        marker.current.setMap(null)
        marker.current = null
      }

      toast({
        title: "Éxito",
        description: "Ubicación eliminada correctamente",
      })

      if (onUbicacionGuardada) {
        onUbicacionGuardada()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar ubicación",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }, [matricula, onUbicacionGuardada])

  // Actualizar marcador cuando cambien las coordenadas manualmente
  const handleCoordinateChange = useCallback(
    async (newLat: string, newLng: string) => {
      const lat = Number.parseFloat(newLat)
      const lng = Number.parseFloat(newLng)

      if (!isNaN(lat) && !isNaN(lng) && mapInstance.current && isGoogleMapsReady()) {
        await updateMarker(lat, lng)
        const address = await geocodeLatLng(lat, lng)
        if (address) {
          setDireccion(address)
        }
      }
    },
    [updateMarker, geocodeLatLng, isGoogleMapsReady],
  )

  // Manejar Enter en el campo de búsqueda
  const handleSearchKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSearch()
      }
    },
    [handleSearch],
  )

  const isLoading = !isLoaded || isInitializing
  const displayError = error || mapError

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Editor de Ubicación - {matricula}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulario de coordenadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="latitud">Latitud</Label>
            <Input
              id="latitud"
              type="number"
              step="any"
              value={latitud}
              onChange={(e) => {
                setLatitud(e.target.value)
                if (longitud) {
                  handleCoordinateChange(e.target.value, longitud)
                }
              }}
              placeholder="Ej: 43.329690"
            />
          </div>
          <div>
            <Label htmlFor="longitud">Longitud</Label>
            <Input
              id="longitud"
              type="number"
              step="any"
              value={longitud}
              onChange={(e) => {
                setLongitud(e.target.value)
                if (latitud) {
                  handleCoordinateChange(latitud, e.target.value)
                }
              }}
              placeholder="Ej: -2.984690"
            />
          </div>
        </div>

        {/* Campo de dirección */}
        <div>
          <Label htmlFor="direccion">Dirección</Label>
          <Input
            id="direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="La dirección se completará automáticamente"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGetCurrentLocation} variant="outline" disabled={isLoading}>
            <Navigation className="h-4 w-4 mr-2" />
            Mi Ubicación
          </Button>
          <Button onClick={handleCenterOnSede} variant="outline" disabled={isLoading}>
            <MapPin className="h-4 w-4 mr-2" />
            Sede Fulcrum
          </Button>
          <Button onClick={handleSave} disabled={!latitud || !longitud || isSaving}>
            {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Ubicación
          </Button>
          {(initialLatitud || latitud) && (
            <Button onClick={handleDelete} variant="destructive" disabled={isDeleting}>
              {isDeleting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Eliminar Ubicación
            </Button>
          )}
        </div>

        {/* Campo de búsqueda */}
        <div className="space-y-2">
          <Label htmlFor="search">Buscar ubicación</Label>
          <div className="flex gap-2">
            <Input
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              placeholder="Introduce una dirección o coordenadas (ej: 43.329690, -2.984690)"
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading || isSearching || !searchQuery.trim()} variant="outline">
              {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Puedes buscar por dirección (ej: "Calle Mayor 1, Madrid") o coordenadas (ej: "43.329690, -2.984690")
          </p>
        </div>

        {/* Mapa */}
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
                  <p className="text-gray-500 text-sm">Cargando editor...</p>
                  {!isLoaded && <p className="text-xs text-gray-400 mt-2">Cargando Google Maps...</p>}
                </div>
              </div>
            )}

            {/* Overlay de error */}
            {displayError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                <div className="text-center p-4">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <p className="text-red-600 mb-4">{displayError}</p>
                  <Button onClick={() => window.location.reload()}>Reintentar</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instrucciones */}
        <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Instrucciones:</h4>
          <ul className="space-y-1">
            <li>• Usa el campo de búsqueda para encontrar ubicaciones por dirección o coordenadas</li>
            <li>• Haz clic en el mapa para establecer la ubicación</li>
            <li>• Arrastra el marcador para ajustar la posición</li>
            <li>• Usa "Mi Ubicación" para obtener tu posición actual</li>
            <li>• Usa "Sede Fulcrum" para centrar en Calle Aldapa 13, Leioa (modo satélite)</li>
            <li>• La dirección se completará automáticamente</li>
            <li>• Haz clic en "Guardar Ubicación" para confirmar los cambios</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
