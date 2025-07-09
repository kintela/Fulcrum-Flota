"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, RefreshCw } from "lucide-react"
import { google } from "google-maps"

interface Coche {
  matricula: string
  marca: string
  modelo: string
  latitud?: number
  longitud?: number
  ultima_ubicacion?: string
  asignadoa?: string
  donante?: boolean
}

interface MapaCochesProps {
  coches: Coche[]
}

export function MapaCoches({ coches }: MapaCochesProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Inicializar el mapa
  useEffect(() => {
    const initMap = async () => {
      try {
        // En v0.dev, puedes usar directamente la API de Google Maps
        // sin necesidad de instalar @googlemaps/js-api-loader
        if (!window.google) {
          // Cargar Google Maps API dinámicamente
          const script = document.createElement("script")
          script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
          script.async = true
          script.defer = true

          script.onload = () => {
            createMap()
          }

          script.onerror = () => {
            setError("Error al cargar Google Maps")
            setIsLoading(false)
          }

          document.head.appendChild(script)
        } else {
          createMap()
        }
      } catch (err) {
        setError("Error al inicializar el mapa")
        setIsLoading(false)
      }
    }

    const createMap = () => {
      if (!mapRef.current) return

      // Crear el mapa centrado en España
      const mapInstance = new google.maps.Map(mapRef.current, {
        zoom: 6,
        center: { lat: 40.4168, lng: -3.7038 }, // Madrid
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      })

      setMap(mapInstance)
      setIsLoading(false)
    }

    initMap()
  }, [])

  // Agregar marcadores cuando el mapa esté listo
  useEffect(() => {
    if (!map || !coches.length) return

    // Limpiar marcadores existentes
    // (En una implementación real, mantendrías una referencia a los marcadores)

    const bounds = new google.maps.LatLngBounds()
    let hasValidLocations = false

    coches.forEach((coche) => {
      if (coche.latitud && coche.longitud && !coche.donante) {
        const position = { lat: coche.latitud, lng: coche.longitud }

        // Crear marcador
        const marker = new google.maps.Marker({
          position,
          map,
          title: `${coche.matricula} - ${coche.marca} ${coche.modelo}`,
          icon: {
            url:
              "data:image/svg+xml;charset=UTF-8," +
              encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="${coche.asignadoa ? "#10b981" : "#3b82f6"}" stroke="white" strokeWidth="2"/>
                <text x="16" y="20" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">🚗</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
          },
        })

        // Crear ventana de información
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; color: #1f2937;">${coche.matricula}</h3>
              <p style="margin: 4px 0; color: #6b7280;"><strong>Vehículo:</strong> ${coche.marca} ${coche.modelo}</p>
              <p style="margin: 4px 0; color: #6b7280;"><strong>Estado:</strong> ${coche.asignadoa ? "Asignado" : "Disponible"}</p>
              ${coche.asignadoa ? `<p style="margin: 4px 0; color: #6b7280;"><strong>Asignado a:</strong> ${coche.asignadoa}</p>` : ""}
              ${coche.ultima_ubicacion ? `<p style="margin: 4px 0; color: #6b7280; font-size: 12px;"><strong>Última actualización:</strong> ${new Date(coche.ultima_ubicacion).toLocaleString("es-ES")}</p>` : ""}
            </div>
          `,
        })

        // Agregar evento click al marcador
        marker.addListener("click", () => {
          infoWindow.open(map, marker)
        })

        bounds.extend(position)
        hasValidLocations = true
      }
    })

    // Ajustar el mapa para mostrar todos los marcadores
    if (hasValidLocations) {
      map.fitBounds(bounds)

      // Evitar zoom excesivo si solo hay un marcador
      google.maps.event.addListenerOnce(map, "bounds_changed", () => {
        if (map.getZoom() && map.getZoom()! > 15) {
          map.setZoom(15)
        }
      })
    }
  }, [map, coches])

  const handleRefresh = () => {
    // Aquí podrías implementar la lógica para refrescar las ubicaciones
    window.location.reload()
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
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-gray-500 text-sm">
              Asegúrate de que la API key de Google Maps esté configurada correctamente.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Vehículos
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Cargando mapa...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>Asignado</span>
              </div>
            </div>
            <div ref={mapRef} className="w-full h-96 rounded-lg border" style={{ minHeight: "400px" }} />
            <p className="text-xs text-gray-500 text-center">
              Mostrando {coches.filter((c) => c.latitud && c.longitud && !c.donante).length} vehículos con ubicación
              conocida
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
