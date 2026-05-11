"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from "lucide-react"
import { googleMapsLoader } from "@/lib/google-maps-loader"

interface CocheUbicacionMapaProps {
  matricula: string
  latitud?: number | null
  longitud?: number | null
  direccion?: string | null
}

export function CocheUbicacionMapa({
  matricula,
  latitud,
  longitud,
  direccion,
}: CocheUbicacionMapaProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!latitud || !longitud) return

    let cancelled = false

    const loadMap = async () => {
      try {
        await googleMapsLoader.load()
        if (cancelled || !mapRef.current || !window.google?.maps) return

        const position = { lat: Number(latitud), lng: Number(longitud) }

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: position,
            zoom: 17,
            mapTypeId: window.google.maps.MapTypeId.ROADMAP,
            streetViewControl: false,
            fullscreenControl: true,
            mapTypeControl: true,
          })
        } else {
          mapInstanceRef.current.setCenter(position)
        }

        if (!markerRef.current) {
          markerRef.current = new window.google.maps.Marker({
            position,
            map: mapInstanceRef.current,
            title: matricula,
          })
        } else {
          markerRef.current.setPosition(position)
          markerRef.current.setMap(mapInstanceRef.current)
        }
      } catch (mapError) {
        console.error("Error cargando mapa de detalle del coche:", mapError)
        setError("No se pudo cargar el mapa")
      }
    }

    loadMap()

    return () => {
      cancelled = true
    }
  }, [latitud, longitud, matricula])

  if (!latitud || !longitud) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Mapa de Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Este coche no tiene coordenadas guardadas todavía.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Mapa de Ubicación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {direccion && <p className="text-sm text-gray-600">{direccion}</p>}
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : (
          <div ref={mapRef} className="h-96 w-full rounded-lg border" />
        )}
      </CardContent>
    </Card>
  )
}
