"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Trash2, Navigation, Save } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface UbicacionEditorProps {
  matricula: string
  ubicacionActual?: {
    latitud?: number
    longitud?: number
    direccion_actual?: string
  }
  onSave: (ubicacion: { latitud: number; longitud: number; direccion_actual: string }) => Promise<void>
  onDelete: () => Promise<void>
}

declare global {
  interface Window {
    google: any
    initUbicacionEditor?: () => void
  }
}

export function UbicacionEditor({ matricula, ubicacionActual, onSave, onDelete }: UbicacionEditorProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const [ubicacion, setUbicacion] = useState({
    latitud: ubicacionActual?.latitud || 40.4168,
    longitud: ubicacionActual?.longitud || -3.7038,
    direccion_actual: ubicacionActual?.direccion_actual || "",
  })

  // Marcar componente como montado
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Inicializar el mapa
  useEffect(() => {
    if (!isMounted) return

    let retryCount = 0
    const maxRetries = 10

    const initMap = () => {
      console.log(`UbicacionEditor - Intento ${retryCount + 1} de inicializar mapa...`)

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
          setError("Error: Contenedor del mapa no encontrado")
          setIsLoading(false)
          return
        }
      }

      if (!window.google || !window.google.maps) {
        setError("Error: Google Maps no cargado")
        setIsLoading(false)
        return
      }

      try {
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          zoom: 15,
          center: { lat: ubicacion.latitud, lng: ubicacion.longitud },
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        })

        mapInstanceRef.current = mapInstance

        // Crear marcador
        const marker = new window.google.maps.Marker({
          position: { lat: ubicacion.latitud, lng: ubicacion.longitud },
          map: mapInstance,
          draggable: true,
          title: `Ubicación de ${matricula}`,
        })

        markerRef.current = marker

        // Evento de arrastre del marcador
        marker.addListener("dragend", (event: any) => {
          const lat = event.latLng.lat()
          const lng = event.latLng.lng()

          setUbicacion((prev) => ({
            ...prev,
            latitud: lat,
            longitud: lng,
          }))

          // Geocoding inverso para obtener dirección
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            if (status === "OK" && results[0]) {
              setUbicacion((prev) => ({
                ...prev,
                direccion_actual: results[0].formatted_address,
              }))
            }
          })
        })

        // Evento de clic en el mapa
        mapInstance.addListener("click", (event: any) => {
          const lat = event.latLng.lat()
          const lng = event.latLng.lng()

          marker.setPosition({ lat, lng })

          setUbicacion((prev) => ({
            ...prev,
            latitud: lat,
            longitud: lng,
          }))

          // Geocoding inverso
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            if (status === "OK" && results[0]) {
              setUbicacion((prev) => ({
                ...prev,
                direccion_actual: results[0].formatted_address,
              }))
            }
          })
        })

        // Esperar a que el mapa esté completamente listo
        window.google.maps.event.addListenerOnce(mapInstance, "tilesloaded", () => {
          setIsLoading(false)
          setError(null)
        })

        // Fallback
        setTimeout(() => {
          if (isLoading) {
            setIsLoading(false)
            setError(null)
          }
        }, 2000)
      } catch (err) {
        console.error("Error creando mapa:", err)
        setError("Error al crear el mapa")
        setIsLoading(false)
      }
    }

    const loadGoogleMaps = () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        setError("API key no configurada")
        setIsLoading(false)
        return
      }

      if (window.google && window.google.maps) {
        setTimeout(initMap, 100)
        return
      }

      // Limpiar callback anterior
      if (window.initUbicacionEditor) {
        delete window.initUbicacionEditor
      }

      window.initUbicacionEditor = () => {
        setTimeout(initMap, 200)
      }

      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initUbicacionEditor`
      script.async = true
      script.defer = true

      script.onerror = () => {
        setError("Error al cargar Google Maps")
        setIsLoading(false)
      }

      document.head.appendChild(script)
    }

    loadGoogleMaps()

    return () => {
      if (window.initUbicacionEditor) {
        delete window.initUbicacionEditor
      }
    }
  }, [matricula, isMounted])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(ubicacion)
      toast({
        title: "Ubicación guardada",
        description: "La ubicación se ha actualizado correctamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al guardar la ubicación",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar la ubicación de este vehículo?")) {
      return
    }

    setIsSaving(true)
    try {
      await onDelete()

      setUbicacion({
        latitud: 40.4168,
        longitud: -3.7038,
        direccion_actual: "",
      })

      if (markerRef.current) {
        markerRef.current.setPosition({ lat: 40.4168, lng: -3.7038 })
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter({ lat: 40.4168, lng: -3.7038 })
      }

      toast({
        title: "Ubicación eliminada",
        description: "La ubicación se ha eliminado correctamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar la ubicación",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude

          setUbicacion((prev) => ({
            ...prev,
            latitud: lat,
            longitud: lng,
          }))

          if (markerRef.current) {
            markerRef.current.setPosition({ lat, lng })
          }
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat, lng })
          }

          // Geocoding inverso
          if (window.google) {
            const geocoder = new window.google.maps.Geocoder()
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
              if (status === "OK" && results[0]) {
                setUbicacion((prev) => ({
                  ...prev,
                  direccion_actual: results[0].formatted_address,
                }))
              }
            })
          }
        },
        (error) => {
          toast({
            title: "Error de ubicación",
            description: "No se pudo obtener tu ubicación actual",
            variant: "destructive",
          })
        },
      )
    } else {
      toast({
        title: "Geolocalización no disponible",
        description: "Tu navegador no soporta geolocalización",
        variant: "destructive",
      })
    }
  }

  const updateMapFromInputs = (lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng })
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat, lng })
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Editor de Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-600 mb-2">{error}</p>
            <p className="text-sm text-gray-500">Verifica que la API key esté configurada correctamente</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Editor de Ubicación - {matricula}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando mapa...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Mapa */}
            <div ref={mapRef} className="w-full h-64 rounded border bg-gray-100" id={`ubicacion-editor-${matricula}`} />

            {/* Controles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitud">Latitud</Label>
                <Input
                  id="latitud"
                  type="number"
                  step="0.000001"
                  value={ubicacion.latitud}
                  onChange={(e) => {
                    const lat = Number.parseFloat(e.target.value)
                    if (!isNaN(lat)) {
                      setUbicacion((prev) => ({ ...prev, latitud: lat }))
                      updateMapFromInputs(lat, ubicacion.longitud)
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="longitud">Longitud</Label>
                <Input
                  id="longitud"
                  type="number"
                  step="0.000001"
                  value={ubicacion.longitud}
                  onChange={(e) => {
                    const lng = Number.parseFloat(e.target.value)
                    if (!isNaN(lng)) {
                      setUbicacion((prev) => ({ ...prev, longitud: lng }))
                      updateMapFromInputs(ubicacion.latitud, lng)
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={ubicacion.direccion_actual}
                onChange={(e) => setUbicacion((prev) => ({ ...prev, direccion_actual: e.target.value }))}
                placeholder="Dirección actual"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleMyLocation} variant="outline" size="sm">
                <Navigation className="h-4 w-4 mr-2" />
                Mi Ubicación
              </Button>
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Guardando..." : "Guardar Ubicación"}
              </Button>
              <Button onClick={handleDelete} variant="destructive" disabled={isSaving} size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Ubicación
              </Button>
            </div>

            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <strong>Instrucciones:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Haz clic en el mapa para establecer la ubicación</li>
                <li>• Arrastra el marcador para ajustar la posición</li>
                <li>• Usa "Mi Ubicación" para usar tu GPS actual</li>
                <li>• Los campos se actualizan automáticamente</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
