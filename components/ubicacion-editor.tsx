"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Navigation, Save, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface UbicacionEditorProps {
  matricula: string
  latitudActual?: number
  longitudActual?: number
  direccionActual?: string
  onUbicacionGuardada?: () => void
}

declare global {
  interface Window {
    google: any
    initUbicacionEditor?: () => void
  }
}

export function UbicacionEditor({
  matricula,
  latitudActual,
  longitudActual,
  direccionActual,
  onUbicacionGuardada,
}: UbicacionEditorProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados del formulario
  const [latitud, setLatitud] = useState<string>(latitudActual?.toString() || "")
  const [longitud, setLongitud] = useState<string>(longitudActual?.toString() || "")
  const [direccion, setDireccion] = useState<string>(direccionActual || "")

  // Asegurar que estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Inicializar el mapa solo en el cliente
  useEffect(() => {
    if (!isClient) return

    const initMap = () => {
      console.log("Iniciando editor de ubicación...")

      if (!mapRef.current) {
        console.error("mapRef.current no está disponible")
        setError("Error: Contenedor del mapa no encontrado")
        setIsLoading(false)
        return
      }

      if (!window.google || !window.google.maps) {
        console.error("Google Maps no está disponible")
        setError("Error: Google Maps no cargado correctamente")
        setIsLoading(false)
        return
      }

      try {
        console.log("Creando mapa del editor...")

        // Posición inicial (ubicación actual o Madrid)
        const initialPosition = {
          lat: latitudActual || 40.4168,
          lng: longitudActual || -3.7038,
        }

        const mapInstance = new window.google.maps.Map(mapRef.current, {
          zoom: latitudActual ? 15 : 6,
          center: initialPosition,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        })

        mapInstanceRef.current = mapInstance

        // Crear marcador
        const marker = new window.google.maps.Marker({
          position: initialPosition,
          map: mapInstance,
          draggable: true,
          title: `Ubicación de ${matricula}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 15,
            fillColor: "#ef4444",
            fillOpacity: 0.8,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
        })

        markerRef.current = marker

        // Evento de arrastrar marcador
        marker.addListener("dragend", (event: any) => {
          const newLat = event.latLng.lat()
          const newLng = event.latLng.lng()
          setLatitud(newLat.toFixed(6))
          setLongitud(newLng.toFixed(6))
          geocodePosition(newLat, newLng)
        })

        // Evento de clic en el mapa
        mapInstance.addListener("click", (event: any) => {
          const newLat = event.latLng.lat()
          const newLng = event.latLng.lng()
          marker.setPosition(event.latLng)
          setLatitud(newLat.toFixed(6))
          setLongitud(newLng.toFixed(6))
          geocodePosition(newLat, newLng)
        })

        console.log("Editor de ubicación creado exitosamente")
        setIsLoading(false)
        setError(null)
      } catch (err) {
        console.error("Error creando editor:", err)
        setError(`Error al crear el editor: ${err instanceof Error ? err.message : "Error desconocido"}`)
        setIsLoading(false)
      }
    }

    const loadGoogleMaps = () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

      if (!apiKey) {
        setError("API key de Google Maps no configurada")
        setIsLoading(false)
        return
      }

      if (window.google && window.google.maps) {
        setTimeout(initMap, 0)
        return
      }

      if (window.initUbicacionEditor) {
        delete window.initUbicacionEditor
      }

      window.initUbicacionEditor = () => {
        requestAnimationFrame(() => {
          setTimeout(initMap, 100)
        })
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        setTimeout(initMap, 100)
        return
      }

      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initUbicacionEditor`
      script.async = true
      script.defer = true

      script.onload = () => {
        console.log("Google Maps cargado para editor")
      }

      script.onerror = () => {
        setError("Error al cargar Google Maps")
        setIsLoading(false)
      }

      document.head.appendChild(script)
    }

    requestAnimationFrame(() => {
      loadGoogleMaps()
    })

    return () => {
      if (window.initUbicacionEditor) {
        delete window.initUbicacionEditor
      }
    }
  }, [isClient, latitudActual, longitudActual, matricula])

  // Función para obtener dirección desde coordenadas
  const geocodePosition = async (lat: number, lng: number) => {
    if (!window.google || !window.google.maps) return

    const geocoder = new window.google.maps.Geocoder()
    try {
      const response = await geocoder.geocode({ location: { lat, lng } })
      if (response.results && response.results[0]) {
        setDireccion(response.results[0].formatted_address)
      }
    } catch (error) {
      console.error("Error en geocoding:", error)
    }
  }

  // Obtener ubicación actual del usuario
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "La geolocalización no está soportada en este navegador",
        variant: "destructive",
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        setLatitud(lat.toFixed(6))
        setLongitud(lng.toFixed(6))

        if (mapInstanceRef.current && markerRef.current) {
          const newPosition = { lat, lng }
          mapInstanceRef.current.setCenter(newPosition)
          mapInstanceRef.current.setZoom(15)
          markerRef.current.setPosition(newPosition)
          geocodePosition(lat, lng)
        }

        toast({
          title: "Ubicación obtenida",
          description: "Se ha establecido tu ubicación actual",
        })
      },
      (error) => {
        console.error("Error obteniendo ubicación:", error)
        toast({
          title: "Error",
          description: "No se pudo obtener la ubicación actual",
          variant: "destructive",
        })
      },
    )
  }

  // Guardar ubicación
  const handleSave = async () => {
    if (!latitud || !longitud) {
      toast({
        title: "Error",
        description: "Debes establecer una ubicación válida",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch(`/api/coches/${matricula}/ubicacion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitud: Number.parseFloat(latitud),
          longitud: Number.parseFloat(longitud),
          direccion_actual: direccion,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al guardar la ubicación")
      }

      toast({
        title: "Ubicación guardada",
        description: "La ubicación del vehículo se ha actualizado correctamente",
      })

      if (onUbicacionGuardada) {
        onUbicacionGuardada()
      }
    } catch (error) {
      console.error("Error guardando ubicación:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la ubicación",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // No renderizar nada hasta que estemos en el cliente
  if (!isClient) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Editor de Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Inicializando editor...</p>
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
            Editor de Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
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
        {/* Controles */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGetCurrentLocation} disabled={isLoading}>
            <Navigation className="h-4 w-4 mr-2" />
            Mi Ubicación
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving || !latitud || !longitud}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Ubicación
          </Button>
        </div>

        {/* Mapa */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Cargando mapa...</p>
            </div>
          </div>
        ) : (
          <div
            ref={mapRef}
            className="w-full h-64 rounded-lg border shadow-sm bg-gray-100"
            style={{ minHeight: "300px" }}
          />
        )}

        {/* Instrucciones */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Instrucciones:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Haz clic en el mapa para establecer la ubicación</li>
            <li>• Arrastra el marcador rojo para ajustar la posición</li>
            <li>• Usa "Mi Ubicación" para obtener tu posición actual</li>
            <li>• Los campos se actualizan automáticamente</li>
          </ul>
        </div>

        {/* Campos de coordenadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="latitud">Latitud</Label>
            <Input
              id="latitud"
              type="number"
              step="any"
              value={latitud}
              onChange={(e) => setLatitud(e.target.value)}
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
              onChange={(e) => setLongitud(e.target.value)}
              placeholder="Ej: -3.703790"
            />
          </div>
        </div>

        {/* Campo de dirección */}
        <div>
          <Label htmlFor="direccion">Dirección (se obtiene automáticamente)</Label>
          <Input
            id="direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="La dirección se obtendrá automáticamente..."
          />
        </div>
      </CardContent>
    </Card>
  )
}
