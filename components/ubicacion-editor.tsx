"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Save, Trash2, Navigation } from "lucide-react"

interface UbicacionEditorProps {
  matricula: string
  latitud?: number
  longitud?: number
  direccion_actual?: string
  onSave: (ubicacion: { latitud: number; longitud: number; direccion_actual: string }) => Promise<void>
  onDelete: () => Promise<void>
}

declare global {
  interface Window {
    google: any
    initUbicacionMap?: () => void
  }
}

export function UbicacionEditor({
  matricula,
  latitud,
  longitud,
  direccion_actual,
  onSave,
  onDelete,
}: UbicacionEditorProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [marker, setMarker] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [currentLocation, setCurrentLocation] = useState({
    lat: latitud || 40.4168,
    lng: longitud || -3.7038,
    address: direccion_actual || "",
  })

  // Inicializar el mapa
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || !window.google) return

      try {
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          zoom: latitud && longitud ? 15 : 6,
          center: { lat: currentLocation.lat, lng: currentLocation.lng },
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        })

        setMap(mapInstance)

        // Crear marcador si ya hay ubicación
        if (latitud && longitud) {
          const markerInstance = new window.google.maps.Marker({
            position: { lat: latitud, lng: longitud },
            map: mapInstance,
            draggable: true,
            title: `Ubicación de ${matricula}`,
          })

          // Evento para arrastrar el marcador
          markerInstance.addListener("dragend", (event: any) => {
            const newLat = event.latLng.lat()
            const newLng = event.latLng.lng()
            setCurrentLocation((prev) => ({
              ...prev,
              lat: newLat,
              lng: newLng,
            }))
            reverseGeocode(newLat, newLng)
          })

          setMarker(markerInstance)
        }

        // Evento para hacer clic en el mapa
        mapInstance.addListener("click", (event: any) => {
          const newLat = event.latLng.lat()
          const newLng = event.latLng.lng()

          setCurrentLocation((prev) => ({
            ...prev,
            lat: newLat,
            lng: newLng,
          }))

          // Crear o mover marcador
          if (marker) {
            marker.setPosition({ lat: newLat, lng: newLng })
          } else {
            const newMarker = new window.google.maps.Marker({
              position: { lat: newLat, lng: newLng },
              map: mapInstance,
              draggable: true,
              title: `Ubicación de ${matricula}`,
            })

            newMarker.addListener("dragend", (dragEvent: any) => {
              const dragLat = dragEvent.latLng.lat()
              const dragLng = dragEvent.latLng.lng()
              setCurrentLocation((prev) => ({
                ...prev,
                lat: dragLat,
                lng: dragLng,
              }))
              reverseGeocode(dragLat, dragLng)
            })

            setMarker(newMarker)
          }

          reverseGeocode(newLat, newLng)
        })

        setIsLoading(false)
        setError(null)
      } catch (err) {
        console.error("Error creating map:", err)
        setError("Error al crear el mapa")
        setIsLoading(false)
      }
    }

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initMap()
        return
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        setError("API key de Google Maps no configurada")
        setIsLoading(false)
        return
      }

      window.initUbicacionMap = initMap

      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initUbicacionMap`
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
      if (window.initUbicacionMap) {
        delete window.initUbicacionMap
      }
    }
  }, [matricula, latitud, longitud])

  // Función para obtener dirección desde coordenadas
  const reverseGeocode = async (lat: number, lng: number) => {
    if (!window.google) return

    const geocoder = new window.google.maps.Geocoder()

    try {
      const response = await geocoder.geocode({ location: { lat, lng } })
      if (response.results && response.results[0]) {
        const address = response.results[0].formatted_address
        setCurrentLocation((prev) => ({
          ...prev,
          address,
        }))
      }
    } catch (err) {
      console.error("Error en geocoding:", err)
    }
  }

  // Obtener ubicación actual del usuario
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no está soportada en este navegador")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        setCurrentLocation((prev) => ({
          ...prev,
          lat,
          lng,
        }))

        if (map) {
          map.setCenter({ lat, lng })
          map.setZoom(15)

          if (marker) {
            marker.setPosition({ lat, lng })
          } else {
            const newMarker = new window.google.maps.Marker({
              position: { lat, lng },
              map,
              draggable: true,
              title: `Ubicación de ${matricula}`,
            })

            newMarker.addListener("dragend", (event: any) => {
              const newLat = event.latLng.lat()
              const newLng = event.latLng.lng()
              setCurrentLocation((prev) => ({
                ...prev,
                lat: newLat,
                lng: newLng,
              }))
              reverseGeocode(newLat, newLng)
            })

            setMarker(newMarker)
          }

          reverseGeocode(lat, lng)
        }
      },
      (error) => {
        console.error("Error obteniendo ubicación:", error)
        alert("No se pudo obtener la ubicación actual")
      },
    )
  }

  const handleSave = async () => {
    if (!currentLocation.lat || !currentLocation.lng) {
      alert("Por favor, selecciona una ubicación en el mapa")
      return
    }

    setSaving(true)
    try {
      await onSave({
        latitud: currentLocation.lat,
        longitud: currentLocation.lng,
        direccion_actual: currentLocation.address,
      })
    } catch (error) {
      console.error("Error guardando ubicación:", error)
      alert("Error al guardar la ubicación")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar la ubicación de este vehículo?")) {
      return
    }

    setSaving(true)
    try {
      await onDelete()

      // Limpiar mapa
      if (marker) {
        marker.setMap(null)
        setMarker(null)
      }

      setCurrentLocation({
        lat: 40.4168,
        lng: -3.7038,
        address: "",
      })
    } catch (error) {
      console.error("Error eliminando ubicación:", error)
      alert("Error al eliminar la ubicación")
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ubicación del Vehículo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-4 font-medium">{error}</p>
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
          Ubicación del Vehículo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando mapa...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Controles */}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation}>
                <Navigation className="h-4 w-4 mr-2" />
                Mi Ubicación
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !currentLocation.lat || !currentLocation.lng}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Guardando..." : "Guardar Ubicación"}
              </Button>
              {latitud && longitud && (
                <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Ubicación
                </Button>
              )}
            </div>

            {/* Información de ubicación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="latitud">Latitud</Label>
                <Input id="latitud" value={currentLocation.lat.toFixed(6)} readOnly className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="longitud">Longitud</Label>
                <Input id="longitud" value={currentLocation.lng.toFixed(6)} readOnly className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={currentLocation.address}
                  readOnly
                  className="bg-gray-50"
                  placeholder="Selecciona una ubicación"
                />
              </div>
            </div>

            {/* Mapa */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Haz clic en el mapa para establecer la ubicación del vehículo. También puedes arrastrar el marcador.
              </p>
              <div ref={mapRef} className="w-full h-64 rounded-lg border shadow-sm" style={{ minHeight: "300px" }} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
