"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, RefreshCw, Navigation, AlertCircle, Car, UserCheck, UserX } from "lucide-react"
import { reservarCoche, liberarCoche } from "@/app/actions/reservas"
import { actualizarUbicacionCoche } from "@/app/actions/ubicacion"

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
  userRole?: string
  userEmail?: string
  onFunctionsReady?: (functions: {
    zoomToVehicle: (matricula: string) => void
    activateLocationMode: (matricula: string) => void
    cancelLocationMode: () => void
  }) => void
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
        //console.log("🗺️ Callback de Google Maps ejecutado")

        // Verificar que todo esté disponible
        let checkAttempts = 0
        const verifyComplete = () => {
          if (isGoogleMapsReady()) {
            //console.log("✅ Google Maps completamente cargado")
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

      //console.log("🔄 Cargando Google Maps...")
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

export function MapaCoches({ coches, empleados = [], userRole, userEmail, onFunctionsReady }: MapaCochesProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markers = useRef<any[]>([])
  const { isLoaded, error, isGoogleMapsReady } = useGoogleMaps()

  const [isInitializing, setIsInitializing] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [selectedMatricula, setSelectedMatricula] = useState<string>("all")
  const [vehicleMessage, setVehicleMessage] = useState<string>("")
  const [isReserving, setIsReserving] = useState(false)
  const [reservationMessage, setReservationMessage] = useState<string>("")
  const [isReleasing, setIsReleasing] = useState(false)
  const [isLocationMode, setIsLocationMode] = useState(false)
  const [vehicleToLocate, setVehicleToLocate] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<"all" | "available" | "assigned" | "with-location" | "no-location">("all")
  const [selectKey, setSelectKey] = useState(0) // Clave para forzar re-renderizado del select

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
    markers.current.forEach((markerObj) => {
      if (markerObj && markerObj.marker && typeof markerObj.marker.setMap === "function") {
        try {
          markerObj.marker.setMap(null)
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

      //console.log(`📍 Agregando ${cochesConUbicacion.length} marcadores`)

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
          
          // Determinar si es un vehículo del usuario actual
          const isUserVehicle = userRole === 'usuario' && userEmail && empleadoInfo && empleadoInfo.email === userEmail

          // Determinar el color del marcador
          let fillColor = "#3b82f6" // Azul por defecto (disponible)
          if (isUserVehicle) {
            fillColor = "#dc2626" // Rojo para vehículos del usuario
          } else if (isAssigned) {
            fillColor = "#10b981" // Verde para asignados a otros
          }

          // Crear marcador
          const marker = new window.google.maps.Marker({
            position,
            map,
            title: `${coche.matricula} - ${coche.marca} ${coche.modelo}`,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: fillColor,
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

          // Almacenar el marcador con información adicional para poder identificarlo
          markers.current.push({ marker, matricula: coche.matricula })
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
      //console.log("🗺️ Inicializando mapa...")

      // Crear el mapa en modo satélite por defecto con zoom más alto
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center: { lat: 43.2627, lng: -2.9253 }, // Bilbao como centro por defecto
        mapTypeId: window.google.maps.MapTypeId.SATELLITE,
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
      //console.log("✅ Mapa creado exitosamente")

      // Esperar a que el mapa esté listo y agregar marcadores
      window.google.maps.event.addListenerOnce(map, "idle", () => {
        console.log("🎯 Mapa completamente listo")
        addMarkers(map)
        setIsInitializing(false)
      })

      // Agregar listener para clics en el mapa (para modo de ubicación)
      map.addListener("click", (event: any) => {
        if (isLocationMode && vehicleToLocate) {
          const lat = event.latLng.lat()
          const lng = event.latLng.lng()
          updateVehicleLocation(vehicleToLocate, lat, lng)
        }
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

  const isLoading = !isLoaded || isInitializing
  const displayError = error || mapError

  // Calcular estadísticas
  const cochesConUbicacion = coches.filter((c) => c.latitud && c.longitud && !c.donante)
  const cochesSinUbicacion = coches.filter((c) => (!c.latitud || !c.longitud) && !c.donante)
  
  // Calcular asignados y disponibles de TODOS los coches (no solo los que tienen ubicación)
  const todosLosCoches = coches.filter((c) => !c.donante)
  const cochesAsignados = todosLosCoches.filter((c) => getEmpleadoInfo(c) || c.asignadoa)
  const cochesDisponibles = todosLosCoches.filter((c) => !getEmpleadoInfo(c) && !c.asignadoa)

  const zoomToVehicles = useCallback(
    (filterType: "all" | "assigned" | "available" | "with-location" | "no-location") => {
      if (!mapInstance.current || !isGoogleMapsReady()) return

      // Actualizar el filtro del desplegable y limpiar mensajes
      setFilterMode(filterType)
      setSelectedMatricula("all")
      setVehicleMessage("")
      setReservationMessage("")

      let targetCoches: Coche[] = []

      switch (filterType) {
        case "all":
          targetCoches = cochesConUbicacion
          break
        case "assigned":
          // Para el zoom, solo incluir asignados que tengan ubicación
          targetCoches = cochesAsignados.filter((c) => c.latitud && c.longitud)
          break
        case "available":
          // Para el zoom, solo incluir disponibles que tengan ubicación
          targetCoches = cochesDisponibles.filter((c) => c.latitud && c.longitud)
          break
        case "with-location":
          targetCoches = cochesConUbicacion
          break
        case "no-location":
          // Para vehículos sin ubicación, no hacer zoom pero sí filtrar desplegable
          return
      }

      if (targetCoches.length === 0) return

      try {
        const bounds = new window.google.maps.LatLngBounds()
        targetCoches.forEach((coche) => {
          bounds.extend({ lat: Number(coche.latitud), lng: Number(coche.longitud) })
        })

        mapInstance.current.fitBounds(bounds)

        setTimeout(() => {
          if (targetCoches.length === 1) {
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

  // Función para hacer zoom a un vehículo específico
  const zoomToVehicle = useCallback(
    (matricula: string) => {
      if (!mapInstance.current || !isGoogleMapsReady()) return

      const coche = coches.find((c) => c.matricula === matricula)
      if (!coche || !coche.latitud || !coche.longitud) return

      try {
        const position = { lat: Number(coche.latitud), lng: Number(coche.longitud) }
        mapInstance.current.setCenter(position)
        mapInstance.current.setZoom(18)

        // Seleccionar el vehículo en el dropdown
        setSelectedMatricula(matricula)

        // Simular click en el marcador para abrir el InfoWindow
        setTimeout(() => {
          const targetMarker = markers.current.find((m: any) => 
            m.matricula === matricula
          )
          if (targetMarker && targetMarker.marker && window.google?.maps?.event) {
            window.google.maps.event.trigger(targetMarker.marker, "click")
          }
        }, 500)
      } catch (error) {
        console.error("Error zooming to vehicle:", error)
      }
    },
    [coches, isGoogleMapsReady],
  )

  // Función para manejar la reserva de un vehículo
  const handleReservar = useCallback(async () => {
    if (!selectedMatricula || selectedMatricula === "all") return

    setIsReserving(true)
    setReservationMessage("")

    try {
      const resultado = await reservarCoche(selectedMatricula)
      
      if (resultado.success) {
        setReservationMessage(`✅ ${resultado.message}`)
        // Refresh para actualizar la información
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setReservationMessage(`❌ ${resultado.error}`)
      }
    } catch (error) {
      console.error("Error reservando coche:", error)
      setReservationMessage("❌ Error inesperado al reservar el vehículo")
    } finally {
      setIsReserving(false)
    }
  }, [selectedMatricula])

  // Función para manejar la liberación de un vehículo
  const handleLiberar = useCallback(async () => {
    if (!selectedMatricula || selectedMatricula === "all") return

    setIsReleasing(true)
    setReservationMessage("")

    try {
      const resultado = await liberarCoche(selectedMatricula)
      
      if (resultado.success) {
        setReservationMessage(`✅ ${resultado.message}`)
        // Refresh para actualizar la información
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setReservationMessage(`❌ ${resultado.error}`)
      }
    } catch (error) {
      console.error("Error liberando coche:", error)
      setReservationMessage("❌ Error inesperado al liberar el vehículo")
    } finally {
      setIsReleasing(false)
    }
  }, [selectedMatricula])

  // Función para verificar si se puede mostrar el botón de liberar
  const shouldShowReleaseButton = useCallback(() => {
    if (!selectedMatricula || selectedMatricula === "all") return false
    if (!userEmail) return false
    
    const coche = coches.find((c) => c.matricula === selectedMatricula)
    if (!coche) return false
    
    // Solo mostrar si el coche está asignado y no es donante
    if (!coche.asignadoa || coche.donante) return false
    
    // Si es administrador, puede liberar cualquier vehículo
    if (userRole === 'administrador') return true
    
    // Si es usuario regular, solo puede liberar sus propios vehículos
    const empleadoInfo = getEmpleadoInfo(coche)
    return empleadoInfo && empleadoInfo.email === userEmail
  }, [selectedMatricula, userEmail, userRole, coches, getEmpleadoInfo])

  // Función para activar el modo de ubicación
  const activateLocationMode = useCallback((matricula: string) => {
    setIsLocationMode(true)
    setVehicleToLocate(matricula)
    setVehicleMessage(`📍 Haz clic en el mapa para ubicar el vehículo ${matricula}`)
  }, [])

  // Función para cancelar el modo de ubicación
  const cancelLocationMode = useCallback(() => {
    setIsLocationMode(false)
    setVehicleToLocate(null)
    setVehicleMessage("")
  }, [])

  // Función para actualizar la ubicación de un vehículo
  const updateVehicleLocation = useCallback(async (matricula: string, lat: number, lng: number) => {
    try {
      const resultado = await actualizarUbicacionCoche(matricula, lat, lng)
      
      if (resultado.success) {
        setVehicleMessage(`✅ ${resultado.message}`)
        setIsLocationMode(false)
        setVehicleToLocate(null)
        
        // Refresh para mostrar la nueva ubicación
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setVehicleMessage(`❌ ${resultado.error}`)
        setIsLocationMode(false)
        setVehicleToLocate(null)
      }
    } catch (error) {
      console.error("Error actualizando ubicación:", error)
      setVehicleMessage(`❌ Error al actualizar la ubicación del vehículo ${matricula}`)
      setIsLocationMode(false)
      setVehicleToLocate(null)
    }
  }, [])

  // Función para verificar si se puede mostrar el botón de reserva
  const shouldShowReserveButton = useCallback(() => {
    if (!selectedMatricula || selectedMatricula === "all") return false
    if (!userEmail) return false
    
    const coche = coches.find((c) => c.matricula === selectedMatricula)
    if (!coche) return false
    
    // Solo mostrar si el coche no está asignado y no es donante
    return !coche.asignadoa && !coche.donante
  }, [selectedMatricula, userEmail, coches])

  // Función para manejar la selección de vehículo con select nativo
  const handleVehicleSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const matricula = event.target.value
      console.log("🚗 Seleccionando vehículo:", matricula)

      setSelectedMatricula(matricula)
      setVehicleMessage("")

      if (!matricula || matricula === "all") {
        // Mostrar todos los vehículos según el filtro actual
        if (mapInstance.current && isLoaded && isGoogleMapsReady()) {
          if (filterMode === "no-location") {
            // Para vehículos sin ubicación, no hacer zoom
            setVehicleMessage(`ℹ️ Filtro activo: resaltando ${cochesSinUbicacion.length} vehículos sin ubicación en el desplegable`)
            return
          }
          
          if (filterMode !== "all") {
            let count = 0
            switch (filterMode) {
              case "available": count = cochesDisponibles.length; break
              case "assigned": count = cochesAsignados.length; break
              case "with-location": count = cochesConUbicacion.length; break
            }
            setVehicleMessage(`ℹ️ Filtro activo: resaltando ${count} vehículos en el desplegable`)
          }
          
          const cochesConUbicacionLocal = coches.filter((c) => c.latitud && c.longitud && !c.donante)
          if (cochesConUbicacionLocal.length > 0) {
            const bounds = new window.google.maps.LatLngBounds()
            cochesConUbicacionLocal.forEach((coche) => {
              bounds.extend({ lat: Number(coche.latitud), lng: Number(coche.longitud) })
            })
            mapInstance.current.fitBounds(bounds)
            setTimeout(() => {
              if (mapInstance.current.getZoom() > 16) {
                mapInstance.current.setZoom(16)
              }
            }, 200)
          }
        }
        return
      }

      const coche = coches.find((c) => c.matricula === matricula)
      if (!coche) {
        setVehicleMessage("❌ Vehículo no encontrado")
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
          `⚠️ ${coche.matricula} (${coche.marca} ${coche.modelo}) está ${status} pero no tiene ubicación registrada${
            coche.donante ? " (vehículo donante)" : ""
          }`,
        )
        return
      }

      // Tiene ubicación, centrar en el mapa
      if (mapInstance.current && isGoogleMapsReady()) {
        try {
          const position = { lat: Number(coche.latitud), lng: Number(coche.longitud) }

          // Centrar y hacer zoom máximo
          mapInstance.current.setCenter(position)
          mapInstance.current.setZoom(20)

          // Buscar y activar el marcador
          setTimeout(() => {
            const targetMarker = markers.current.find((marker) => {
              const title = marker.getTitle()
              return title && title.includes(matricula)
            })
            if (targetMarker) {
              console.log("🎯 Activando marcador para:", matricula)
              window.google.maps.event.trigger(targetMarker, "click")
            } else {
              console.log("⚠️ No se encontró marcador para:", matricula)
            }
          }, 500)

          const empleadoInfo = getEmpleadoInfo(coche)
          const status = empleadoInfo
            ? `asignado a ${empleadoInfo.nombre} ${empleadoInfo.apellidos || ""}`
            : coche.asignadoa
              ? `asignado a ${coche.asignadoa}`
              : "disponible"

          setVehicleMessage(
            `✅ ${coche.matricula} (${coche.marca} ${coche.modelo}) está ${status} y ubicado en el mapa`,
          )
        } catch (error) {
          console.error("Error centrando en vehículo:", error)
          setVehicleMessage("❌ Error al mostrar la ubicación del vehículo")
        }
      }
    },
    [coches, getEmpleadoInfo, isGoogleMapsReady, isLoaded, filterMode],
  )

  // Effect para pasar las funciones al componente padre
  useEffect(() => {
    if (onFunctionsReady && isLoaded) {
      onFunctionsReady({
        zoomToVehicle,
        activateLocationMode,
        cancelLocationMode,
      })
    }
  }, [onFunctionsReady, isLoaded, zoomToVehicle, activateLocationMode, cancelLocationMode])

  // Obtener todas las matrículas ordenadas alfabéticamente
  const matriculasOrdenadas = coches
    .map((c) => c.matricula)
    .sort((a, b) => a.localeCompare(b))
    .filter((matricula, index, array) => array.indexOf(matricula) === index)

  // Función para obtener las matrículas filtradas según el modo actual
  const getFilteredMatriculas = useCallback(() => {
    // Siempre mostrar todas las matrículas en el desplegable
    return matriculasOrdenadas
  }, [matriculasOrdenadas])

  // Función para obtener el color de una matrícula según su estado y el filtro activo
  const getMatriculaColor = useCallback((matricula: string) => {
    const coche = coches.find((c) => c.matricula === matricula)
    if (!coche) return "#000000" // Negro por defecto

    // Si NO hay filtro activo (filterMode === "all"), todas las matrículas en negro
    if (filterMode === "all") {
      return "#000000" // Negro para todas las matrículas sin filtro
    }

    const hasLocation = coche.latitud && coche.longitud && !coche.donante
    const isAssigned = getEmpleadoInfo(coche) || coche.asignadoa

    // Si hay un filtro activo, colorear solo los que coinciden con el filtro
    let matchesFilter = false
    
    switch (filterMode) {
      case "available":
        matchesFilter = !isAssigned
        break
      case "assigned":
        matchesFilter = !!isAssigned
        break
      case "with-location":
        matchesFilter = !!hasLocation
        break
      case "no-location":
        matchesFilter = !hasLocation
        break
    }
    
    // Si coincide con el filtro, usar el color correspondiente al filtro
    if (matchesFilter) {
      switch (filterMode) {
        case "available":
          return "#3b82f6" // Azul para disponibles
        case "assigned":
          return "#10b981" // Verde para asignados
        case "with-location":
          return "#9333ea" // Púrpura para con ubicación
        case "no-location":
          return "#6b7280" // Gris para sin ubicación
      }
    } else {
      // Si no coincide con el filtro, usar gris claro
      return "#d1d5db"
    }

    // Fallback (no debería llegar aquí)
    return "#000000"
  }, [coches, getEmpleadoInfo, filterMode])

  // Función para obtener el texto descriptivo de filtro actual
  const getFilterDescription = useCallback(() => {
    switch (filterMode) {
      case "available":
        return `Resaltando ${cochesDisponibles.length} vehículos disponibles`
      case "assigned":
        return `Resaltando ${cochesAsignados.length} vehículos asignados`
      case "with-location":
        return `Resaltando ${cochesConUbicacion.length} vehículos con ubicación`
      case "no-location":
        return `Resaltando ${cochesSinUbicacion.length} vehículos sin ubicación`
      case "all":
      default:
        return "Mostrando todos los vehículos"
    }
  }, [filterMode, cochesDisponibles.length, cochesAsignados.length, cochesConUbicacion.length, cochesSinUbicacion.length])

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
          {/* Selector de vehículo - USANDO SELECT NATIVO */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Buscar vehículo:</span>
              </div>
              <div className="flex-1 max-w-xs">
                <select
                  key={selectKey} // Clave para forzar re-renderizado completo
                  value={selectedMatricula}
                  onChange={handleVehicleSelectChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  style={{ color: selectedMatricula !== "all" ? getMatriculaColor(selectedMatricula) : "#000000" }}
                >
                  <option value="all" style={{ color: "#000000" }}>
                    Mostrar todos
                  </option>
                  {getFilteredMatriculas().map((matricula) => {
                    const coche = coches.find((c) => c.matricula === matricula)
                    const hasLocation = coche?.latitud && coche?.longitud && !coche?.donante
                    const color = getMatriculaColor(matricula)
                    return (
                      <option 
                        key={matricula} 
                        value={matricula}
                        style={{ color: color }}
                      >
                        {matricula} {hasLocation ? "📍" : "❌"}
                      </option>
                    )
                  })}
                </select>
              </div>
              
              {/* Indicador de filtro activo */}
              {filterMode !== "all" && (
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    filterMode === "available" ? "bg-blue-500" :
                    filterMode === "assigned" ? "bg-green-500" :
                    filterMode === "with-location" ? "bg-purple-500" :
                    filterMode === "no-location" ? "bg-gray-500" : "bg-gray-400"
                  }`}></div>
                  <span className="text-xs text-gray-600">
                    {getFilterDescription()}
                  </span>
                  <button
                    onClick={() => {
                      setFilterMode("all")
                      setSelectedMatricula("all")
                      setVehicleMessage("")
                      setReservationMessage("")
                      setSelectKey(prev => prev + 1) // Incrementar clave para forzar re-renderizado
                      
                      // Restablecer vista del mapa a todos los vehículos con ubicación
                      if (mapInstance.current && isLoaded && isGoogleMapsReady()) {
                        const cochesConUbicacion = coches.filter((c) => c.latitud && c.longitud && !c.donante)
                        if (cochesConUbicacion.length > 0) {
                          const bounds = new window.google.maps.LatLngBounds()
                          cochesConUbicacion.forEach((coche) => {
                            bounds.extend({ lat: Number(coche.latitud), lng: Number(coche.longitud) })
                          })
                          mapInstance.current.fitBounds(bounds)
                          setTimeout(() => {
                            if (mapInstance.current.getZoom() > 16) {
                              mapInstance.current.setZoom(16)
                            } else if (mapInstance.current.getZoom() < 14) {
                              mapInstance.current.setZoom(14)
                            }
                          }, 200)
                        }
                      }
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 ml-1"
                    title="Limpiar filtro"
                  >
                    ✕
                  </button>
                </div>
              )}
              
              {/* Botón de Reservar */}
              {shouldShowReserveButton() && (
                <Button
                  onClick={handleReservar}
                  disabled={isReserving || isReleasing}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {isReserving ? "Reservando..." : "Reservar"}
                </Button>
              )}
              
              {/* Botón de Liberar */}
              {shouldShowReleaseButton() && (
                <Button
                  onClick={handleLiberar}
                  disabled={isReserving || isReleasing}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  {isReleasing ? "Liberando..." : "Liberar"}
                </Button>
              )}
            </div>
            
            {vehicleMessage && (
              <div className={`mt-3 p-3 rounded-md ${
                isLocationMode 
                  ? 'bg-orange-50 border border-orange-200' 
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <p className={`text-sm ${
                    isLocationMode ? 'text-orange-800' : 'text-blue-800'
                  }`}>
                    {vehicleMessage}
                  </p>
                  {isLocationMode && (
                    <Button
                      onClick={cancelLocationMode}
                      variant="outline"
                      size="sm"
                      className="ml-2"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {reservationMessage && (
              <div className={`mt-3 p-3 rounded-md ${
                reservationMessage.startsWith('✅') 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm ${
                  reservationMessage.startsWith('✅') 
                    ? 'text-green-800' 
                    : 'text-red-800'
                }`}>
                  {reservationMessage}
                </p>
              </div>
            )}
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            {/* Total sin ubicación */}
            <button
              onClick={() => {
                setFilterMode("no-location")
                setSelectedMatricula("all")
                setVehicleMessage("")
                setReservationMessage("")
              }}
              className={`text-center p-2 rounded-lg transition-colors cursor-pointer group ${
                filterMode === "no-location" 
                  ? "bg-gray-200 shadow-inner" 
                  : "hover:bg-gray-100"
              }`}
              disabled={cochesSinUbicacion.length === 0}
            >
              <div className={`text-2xl font-bold ${
                filterMode === "no-location" 
                  ? "text-gray-800" 
                  : "text-gray-600 group-hover:text-gray-700"
              }`}>
                {cochesSinUbicacion.length}
              </div>
              <div className={`text-sm ${
                filterMode === "no-location" 
                  ? "text-gray-700" 
                  : "text-gray-600 group-hover:text-gray-700"
              }`}>
                Total sin ubicación
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {filterMode === "no-location" ? "Filtro activo" : "Click para filtrar"}
              </div>
            </button>
            
            {/* Total con ubicación */}
            <button
              onClick={() => zoomToVehicles("with-location")}
              className={`text-center p-2 rounded-lg transition-colors cursor-pointer group ${
                filterMode === "with-location" 
                  ? "bg-purple-100 shadow-inner" 
                  : "hover:bg-purple-50"
              }`}
              disabled={cochesConUbicacion.length === 0}
            >
              <div className={`text-2xl font-bold ${
                filterMode === "with-location" 
                  ? "text-purple-800" 
                  : "text-purple-600 group-hover:text-purple-700"
              }`}>
                {cochesConUbicacion.length}
              </div>
              <div className={`text-sm ${
                filterMode === "with-location" 
                  ? "text-purple-700" 
                  : "text-gray-600 group-hover:text-gray-700"
              }`}>
                Total con ubicación
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {filterMode === "with-location" ? "Filtro activo" : "Click para ver en mapa"}
              </div>
            </button>
            
            {/* Asignados */}
            <button
              onClick={() => zoomToVehicles("assigned")}
              className={`text-center p-2 rounded-lg transition-colors cursor-pointer group ${
                filterMode === "assigned" 
                  ? "bg-green-100 shadow-inner" 
                  : "hover:bg-green-50"
              }`}
              disabled={cochesAsignados.length === 0}
            >
              <div className={`text-2xl font-bold ${
                filterMode === "assigned" 
                  ? "text-green-800" 
                  : "text-green-600 group-hover:text-green-700"
              }`}>
                {cochesAsignados.length}
              </div>
              <div className={`text-sm ${
                filterMode === "assigned" 
                  ? "text-green-700" 
                  : "text-gray-600 group-hover:text-gray-700"
              }`}>
                Asignados
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {filterMode === "assigned" ? "Filtro activo" : "Click para ver en mapa"}
              </div>
            </button>
            
            {/* Disponibles */}
            <button
              onClick={() => zoomToVehicles("available")}
              className={`text-center p-2 rounded-lg transition-colors cursor-pointer group ${
                filterMode === "available" 
                  ? "bg-blue-100 shadow-inner" 
                  : "hover:bg-blue-50"
              }`}
              disabled={cochesDisponibles.length === 0}
            >
              <div className={`text-2xl font-bold ${
                filterMode === "available" 
                  ? "text-blue-800" 
                  : "text-blue-500 group-hover:text-blue-600"
              }`}>
                {cochesDisponibles.length}
              </div>
              <div className={`text-sm ${
                filterMode === "available" 
                  ? "text-blue-700" 
                  : "text-gray-600 group-hover:text-gray-700"
              }`}>
                Disponibles
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {filterMode === "available" ? "Filtro activo" : "Click para ver en mapa"}
              </div>
            </button>
          </div>

          {/* Leyenda */}
          <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>Asignado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                <span>Con ubicación</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                <span>Sin ubicación</span>
              </div>
            </div>
            
            {/* Información de filtrado */}
            <div className="text-xs text-gray-400">
              {filterMode !== "all" 
                ? (() => {
                    let count = 0
                    switch (filterMode) {
                      case "available": count = cochesDisponibles.length; break
                      case "assigned": count = cochesAsignados.length; break
                      case "with-location": count = cochesConUbicacion.length; break
                      case "no-location": count = cochesSinUbicacion.length; break
                    }
                    return `${count} vehículos resaltados de ${matriculasOrdenadas.length} totales`
                  })()
                : `${matriculasOrdenadas.length} vehículos totales`
              }
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
