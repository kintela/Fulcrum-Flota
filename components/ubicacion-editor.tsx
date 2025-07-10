"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Navigation, Save, Trash2, RefreshCw, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface UbicacionEditorProps {
  matricula: string
  latitud?: number | null
  longitud?: number | null
  direccion_actual?: string | null
  onUbicacionGuardada?: () => void
}

declare global {
  interface Window {
    google: any
    initEditorCallback?: () => void
  }
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

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Estados del formulario
  const [latitud, setLatitud] = useState<string>(initialLatitud?.toString() || "")
  const [longitud, setLongitud] = useState<string>(initialLongitud?.toString() || "")
  const [direccion, setDireccion] = useState<string>(initialDireccion || "")

  // Función para obtener dirección desde coordenadas
  const geocodeLatLng = async (lat: number, lng: number) => {
    if (!geocoder.current) return null

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
  }

  // Función para actualizar marcador
  const updateMarker = async (lat: number, lng: number) => {
    if (!mapInstance.current || !window.google) return

    const position = { lat, lng }

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
    mapInstance.current.setZoom(15)
  }

  // Función para inicializar el editor - VERSIÓN FORZADA
  const forceInitializeEditor = () => {
    console.log("🚀 FORZANDO inicialización del editor...")

    if (!window.google?.maps) {
      console.error("❌ Editor - Google Maps no disponible")
      setError("Google Maps no está disponible")
      setIsLoading(false)
      return
    }

    // Obtener el contenedor
    let container = mapRef.current
    if (!container) {
      console.log("🔍 Editor - Buscando contenedor por ID...")
      container = document.getElementById("editor-container")
    }

    if (!container) {
      console.error("❌ Editor - No se puede encontrar el contenedor")
      setError("No se pudo encontrar el contenedor del editor")
      setIsLoading(false)
      return
    }

    // Forzar dimensiones del contenedor
    container.style.width = "100%"
    container.style.height = "400px"
    container.style.minHeight = "400px"
    container.style.display = "block"
    container.style.position = "relative"

    console.log("📦 Editor - Contenedor preparado:", {
      width: container.offsetWidth,
      height: container.offsetHeight,
    })

    try {
      const hasInitialLocation = initialLatitud && initialLongitud
      const center = hasInitialLocation
        ? { lat: Number(initialLatitud), lng: Number(initialLongitud) }
        : { lat: 40.4168, lng: -3.7038 }

      const map = new window.google.maps.Map(container, {
        zoom: hasInitialLocation ? 15 : 6,
        center,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      })

      mapInstance.current = map

      // Inicializar geocoder
      geocoder.current = new window.google.maps.Geocoder()

      // Si hay ubicación inicial, crear marcador
      if (hasInitialLocation) {
        setTimeout(() => {
          updateMarker(Number(initialLatitud), Number(initialLongitud))
        }, 200)
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
      setIsLoading(false)
      setError(null)
    } catch (err) {
      console.error("❌ Error creando editor:", err)
      setError("Error al crear el editor de ubicación")
      setIsLoading(false)
    }
  }

  // Efecto para marcar como montado
  useEffect(() => {
    setMounted(true)
  }, [])

  // Efecto principal para cargar Google Maps
  useEffect(() => {
    if (!mounted) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError("API key de Google Maps no configurada")
      setIsLoading(false)
      return
    }

    // Si Google Maps ya está disponible
    if (window.google?.maps) {
      console.log("♻️ Editor - Google Maps ya disponible")
      setTimeout(forceInitializeEditor, 500)
      return
    }

    // Callback global
    window.initEditorCallback = () => {
      console.log("📞 Editor - Callback ejecutado")
      setTimeout(forceInitializeEditor, 500)
    }

    // Cargar script
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (!existingScript) {
      console.log("📝 Editor - Cargando Google Maps...")
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initEditorCallback`
      script.async = true
      script.defer = true

      script.onerror = () => {
        setError("Error al cargar Google Maps")
        setIsLoading(false)
      }

      document.head.appendChild(script)
    } else {
      // Script ya existe
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkInterval)
          setTimeout(forceInitializeEditor, 500)
        }
      }, 100)

      setTimeout(() => {
        clearInterval(checkInterval)
        if (!window.google?.maps) {
          setError("Timeout esperando Google Maps")
          setIsLoading(false)
        }
      }, 10000)
    }

    return () => {
      if (window.initEditorCallback) {
        delete window.initEditorCallback
      }
    }
  }, [mounted, isLoading])

  // Función para obtener ubicación actual
  const handleGetCurrentLocation = () => {
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
  }

  // Función para guardar ubicación
  const handleSave = async () => {
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
  }

  // Función para eliminar ubicación
  const handleDelete = async () => {
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
  }

  // Actualizar marcador cuando cambien las coordenadas manualmente
  const handleCoordinateChange = async (newLat: string, newLng: string) => {
    const lat = Number.parseFloat(newLat)
    const lng = Number.parseFloat(newLng)

    if (!isNaN(lat) && !isNaN(lng) && mapInstance.current) {
      await updateMarker(lat, lng)
      const address = await geocodeLatLng(lat, lng)
      if (address) {
        setDireccion(address)
      }
    }
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Editor de Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <div className="bg-gray-100 p-4 rounded-lg mb-4 text-left">
              <h4 className="font-semibold mb-2">Debug Info:</h4>
              <pre className="text-xs text-gray-600">
                {`Contenedor ref: ${mapRef.current ? "✓" : "✗"}
Contenedor DOM: ${typeof document !== "undefined" && document.getElementById("editor-container") ? "✓" : "✗"}
Montado: ${mounted ? "✓" : "✗"}`}
              </pre>
            </div>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

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
              placeholder="Ej: 40.416775"
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
              placeholder="Ej: -3.703790"
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

        {/* Mapa */}
        <div className="w-full bg-white rounded-lg border shadow-sm overflow-hidden">
          <div
            ref={mapRef}
            id="editor-container"
            className="w-full bg-gray-100"
            style={{
              height: "400px",
              minHeight: "400px",
              width: "100%",
              display: "block",
              position: "relative",
            }}
          >
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 text-sm">Cargando editor...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instrucciones */}
        <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Instrucciones:</h4>
          <ul className="space-y-1">
            <li>• Haz clic en el mapa para establecer la ubicación</li>
            <li>• Arrastra el marcador para ajustar la posición</li>
            <li>• Usa "Mi Ubicación" para obtener tu posición actual</li>
            <li>• La dirección se completará automáticamente</li>
            <li>• Haz clic en "Guardar Ubicación" para confirmar los cambios</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
