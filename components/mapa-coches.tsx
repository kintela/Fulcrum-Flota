"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, RefreshCw, Navigation, AlertCircle, Car, UserCheck, UserX, Calendar, Ban } from "lucide-react"
import { liberarCoche } from "@/app/actions/reservas"
import { actualizarUbicacionCoche } from "@/app/actions/ubicacion"
import { verificarDisponibilidad } from "@/app/actions/reservas-temporales"
import { ReservaModal } from "@/components/reserva-modal"
import { supabase } from "@/lib/supabase"

interface Coche {
  matricula: string
  marca: string
  modelo: string
  primeraFoto?: string | null
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
  miCocheMatricula?: string // Nueva prop para identificar el coche del usuario actual
  misReservas?: Array<{ matricula: string; id: number; estado: string }> // Reservas temporales del usuario
  onFunctionsReady?: (functions: {
    zoomToVehicle: (matricula: string) => void
    activateLocationMode: (matricula: string) => void
    cancelLocationMode: () => void
  }) => void
  onReservaCreada?: () => void
  locationOverrides?: Record<string, { latitud: number; longitud: number; direccion_actual?: string }>
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

export function MapaCoches({ coches, empleados = [], userRole, userEmail, miCocheMatricula, misReservas = [], onFunctionsReady, onReservaCreada, locationOverrides = {} }: MapaCochesProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markers = useRef<any[]>([])
  const isLocationModeRef = useRef(false)
  const vehicleToLocateRef = useRef<string | null>(null)
  const { isLoaded, error, isGoogleMapsReady } = useGoogleMaps()

  const [isInitializing, setIsInitializing] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [selectedMatricula, setSelectedMatricula] = useState<string>("all")
  const [vehicleMessage, setVehicleMessage] = useState<string>("")
const [isReserving, setIsReserving] = useState(false)
const [reservationMessage, setReservationMessage] = useState<string>("")
const [isReleasing, setIsReleasing] = useState(false)
const selectedMatriculaRef = useRef<string>("all")
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; matricula: string | null }>({
    visible: false,
    x: 0,
    y: 0,
    matricula: null,
  })
  const [isLocationMode, setIsLocationMode] = useState(false)
  const [vehicleToLocate, setVehicleToLocate] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<"all" | "available" | "assigned" | "reserved" | "with-location" | "no-location">("all")
  const [selectKey, setSelectKey] = useState(0) // Clave para forzar re-renderizado del select
  const [showReservaModal, setShowReservaModal] = useState(false)
  const [selectedVehicleForReservation, setSelectedVehicleForReservation] = useState<{
    matricula: string
    marcaModelo: string
  } | null>(null)
  // Mapa: matricula -> { enCurso: boolean; vencida: boolean; programada: boolean; proximaInicio?: string; proximaFin?: string }
  const [reservasActivas, setReservasActivas] = useState<
    Map<
      string,
      {
        enCurso: boolean
        vencida: boolean
        programada: boolean
        bloquea: boolean
        bloqueoDesde?: string
        proximaInicio?: string
        proximaFin?: string
        empleadoId?: number | null
      }
    >
  >(new Map())

  const isAdmin = userRole === 'administrador' || userRole === 'admin'

  const cochesVisibles = useMemo(() => {
    const base = isAdmin ? coches : coches.filter((coche) => !coche.asignadoa && !coche.donante)
    return base.map((coche) => {
      const override = locationOverrides[coche.matricula]
      if (!override) return coche
      return {
        ...coche,
        latitud: override.latitud,
        longitud: override.longitud,
        direccion_actual: override.direccion_actual ?? coche.direccion_actual
      }
    })
  }, [coches, isAdmin, locationOverrides])

  // Crear mapa de empleados (memoizado para evitar recrear marcadores en cada render)
  const empleadosMap = useMemo(() => {
    const map = new Map()
    empleados.forEach((empleado) => {
      map.set(empleado.id, empleado)
    })
    return map
  }, [empleados])

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

  // Función para verificar si un coche tiene reservas activas
  const verificarReservasActivas = useCallback(async (matriculas: string[]) => {
    const nuevasReservas = new Map<
      string,
      {
        enCurso: boolean
        vencida: boolean
        programada: boolean
        bloquea: boolean
        bloqueoDesde?: string
        proximaInicio?: string
        proximaFin?: string
        empleadoId?: number | null
      }
    >()

    const promesas = matriculas.map(async (matricula) => {
      try {
        const { data: reservas, error } = await supabase
          .from("reservas")
          .select("id, estado, fecha_inicio, fecha_fin, bloqueo_desde, margen_bloqueo, empleado_id")
          .eq("matricula", matricula)
          .in("estado", ["activa", "pendiente", "vencida"])

        if (error) {
          console.warn(`Error verificando reservas para ${matricula}:`, error)
          nuevasReservas.set(matricula, { enCurso: false, vencida: false, programada: false, bloquea: false, empleadoId: null })
          return
        }

        const ahora = new Date()
        let enCurso = false
        let vencida = false
        let programada = false
        let bloquea = false
        let proximaInicio: string | undefined
        let proximaFin: string | undefined
        let bloqueoDesde: string | undefined
        let empleadoId: number | null | undefined
        let empleadoPrioridad = -1

        reservas?.forEach((r) => {
          const inicio = new Date(r.fecha_inicio)
          const fin = new Date(r.fecha_fin)
          const bloqueo = r.bloqueo_desde ? new Date(r.bloqueo_desde) : null

          const enVentana = ahora >= inicio && ahora <= fin
          const vencidaLocal = ahora > fin
          const bloqueadoPorMargen = bloqueo ? ahora >= bloqueo && ahora <= fin : false
          const esProgramada = !enVentana && !vencidaLocal && inicio > ahora

          if (enVentana) {
            enCurso = true
            if (r.empleado_id && empleadoPrioridad < 3) {
              empleadoId = r.empleado_id
              empleadoPrioridad = 3
            }
          }
          if (vencidaLocal) {
            vencida = true
            if (r.empleado_id && empleadoPrioridad < 2) {
              empleadoId = r.empleado_id
              empleadoPrioridad = 2
            }
          }
          if (bloqueadoPorMargen) {
            bloquea = true
            bloqueoDesde = r.bloqueo_desde
            if (r.empleado_id && empleadoPrioridad < 1) {
              empleadoId = r.empleado_id
              empleadoPrioridad = 1
            }
          }
          if (esProgramada) {
            if (!proximaInicio || new Date(proximaInicio) > inicio) {
              proximaInicio = r.fecha_inicio
              proximaFin = r.fecha_fin
            }
          }
        })

        if (!enCurso && !vencida && proximaInicio) programada = true
        if (enCurso) bloquea = true

        nuevasReservas.set(matricula, { enCurso, vencida, programada, bloquea, bloqueoDesde, proximaInicio, proximaFin, empleadoId })
      } catch (error) {
        console.warn(`Error verificando reservas para ${matricula}:`, error)
        nuevasReservas.set(matricula, { enCurso: false, vencida: false, programada: false, bloquea: false, empleadoId: null })
      }
    })

    await Promise.all(promesas)
    setReservasActivas(nuevasReservas)
  }, [])

  // Función para determinar si un coche está disponible
  const isCocheDisponible = useCallback((coche: Coche) => {
    // Disponible si: no está asignado, no es donante, y no tiene reserva en curso, vencida o bloqueada por margen. Programada NO bloquea salvo que el margen haya empezado.
    const noEstaAsignado = !coche.asignadoa
    const estadoReserva = reservasActivas.get(coche.matricula)
    const sinReservaBloqueante = !(estadoReserva?.enCurso || estadoReserva?.vencida || estadoReserva?.bloquea)
    const noEsDonante = !coche.donante
    return noEstaAsignado && sinReservaBloqueante && noEsDonante
  }, [reservasActivas])

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

      const cochesConUbicacion = cochesVisibles.filter(
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
          // 1. Por asignación permanente: verificar si está asignado a su email
          // 2. Por reserva temporal: verificar si tiene una reserva activa de este coche
          const isUserVehicle = userEmail && empleadoInfo && empleadoInfo.email === userEmail
          const tieneReservaActiva = misReservas?.some(reserva => 
            reserva.matricula === coche.matricula && reserva.estado === 'activa'
          )
          
          // Es "mi coche" si está asignado permanentemente O tengo una reserva activa
          const esMiCoche = isUserVehicle || tieneReservaActiva
          
          //console.log(`🎯 ${coche.matricula} - isUserVehicle:`, isUserVehicle, 'tieneReservaActiva:', tieneReservaActiva, 'esMiCoche:', esMiCoche)

          // Determinar el color del marcador
          let fillColor = "#3b82f6" // Azul por defecto (disponible)
          
          // Si es el coche del usuario actual (cancelando reserva), siempre rojo
          if (miCocheMatricula && coche.matricula === miCocheMatricula) {
            fillColor = "#dc2626" // Rojo para el coche del usuario actual
          } else if (esMiCoche) {
            fillColor = "#dc2626" // Rojo para vehículos del usuario (asignación permanente O reserva temporal)
          } else if (isAssigned) {
            fillColor = "#10b981" // Verde para asignados a otros
          }

          // Determinar si el usuario puede reubicar este vehículo
          // Administradores: pueden reubicar cualquier vehículo
          // Usuarios: solo pueden reubicar sus vehículos asignados
          const canRelocate = isAdmin || (userRole === 'usuario' && esMiCoche)

          // Crear marcador con tamaño especial para "mis coches"
          const markerSize = esMiCoche || (miCocheMatricula && coche.matricula === miCocheMatricula) ? 14 : 10
          
          const marker = new window.google.maps.Marker({
            position,
            map,
            title: `${coche.matricula} - ${coche.marca} ${coche.modelo}`,
            draggable: canRelocate, // Hacer arrastrable si el usuario tiene permisos
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: markerSize, // Tamaño dinámico: 14 para mis coches, 10 para otros
              fillColor: fillColor,
              fillOpacity: 0.8,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          })

          // Crear ventana de información
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
            <div style="padding: 12px; font-family: Arial, sans-serif; max-width: 520px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start;">
                <div>
                  ${
                    coche.primeraFoto
                      ? `<img src="${coche.primeraFoto}" alt="Foto ${coche.matricula}" style="width:100%; border-radius:8px; object-fit:cover; max-height:140px;" />`
                      : `<div style="width:100%; height:140px; border-radius:8px; background:#f3f4f6; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-size:32px;">🚗</div>`
                  }
                </div>
                <div>
                  <h3 style="margin: 0 0 8px 0; color: #1f2937;">${coche.matricula}</h3>
                  <p style="margin: 4px 0; color: #6b7280;"><strong>Vehículo:</strong> ${coche.marca} ${coche.modelo}</p>
                  <p style="margin: 4px 0; color: #6b7280;"><strong>Estado:</strong> 
                    <span style="color: ${isAssigned ? "#059669" : "#2563eb"};">
                      ${isAssigned ? "Asignado" : "Disponible"}
                    </span>
                  </p>
                  ${empleadoInfo ? `<p style="margin: 4px 0; color: #6b7280;"><strong>Asignado a:</strong> ${empleadoInfo.nombre} ${empleadoInfo.apellidos || ""}</p>` : ""}
                  ${coche.direccion_actual ? `<p style="margin: 4px 0; color: #6b7280;"><strong>Ubicación:</strong> ${coche.direccion_actual}</p>` : ""}
                  ${canRelocate ? `<p style="margin: 6px 0; color: #10b981; font-size: 12px;"><strong>💡 Tip:</strong> Mantén pulsado el marcador y arrástralo para reubicar</p>` : ""}
                  ${isAdmin ? `
                    <div style="margin-top: 8px;">
                      <a href="/coches/detalle/${coche.matricula}" 
                         style="background-color: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; text-decoration: none; font-size: 12px;">
                        Ver detalles
                      </a>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          `,
          })

          marker.addListener("click", () => {
            infoWindow.open(map, marker)
          })

          // Agregar listeners para reubicación si el marcador es arrastrable
          if (canRelocate) {
            let isDragging = false
            let originalPosition = position

            // Cuando empieza a arrastrar
            marker.addListener("dragstart", () => {
              isDragging = true
              originalPosition = marker.getPosition()?.toJSON() || position
              console.log(`🎯 Iniciando reubicación de ${coche.matricula}`)
            })

            // Durante el arrastre
            marker.addListener("drag", () => {
              const currentPos = marker.getPosition()
              if (currentPos) {
                console.log(`🔄 Arrastrando ${coche.matricula} a:`, currentPos.toJSON())
              }
            })

            // Cuando termina de arrastrar
            marker.addListener("dragend", async (event: any) => {
              isDragging = false
              const pos = event?.latLng || marker.getPosition()
              if (!pos) {
                setVehicleMessage(`❌ No se pudo leer la nueva posición de ${coche.matricula}`)
                marker.setPosition(originalPosition)
                return
              }
              const newLat = pos.lat()
              const newLng = pos.lng()
              if (!Number.isFinite(newLat) || !Number.isFinite(newLng)) {
                setVehicleMessage(`❌ Coordenadas inválidas para ${coche.matricula}`)
                marker.setPosition(originalPosition)
                return
              }
              
              console.log(`🎯 Finalizando reubicación de ${coche.matricula} en:`, { lat: newLat, lng: newLng })
              
              try {
                const resultado = await actualizarUbicacionCoche(coche.matricula, newLat, newLng)
                
                if (resultado.success) {
                  // Mantener el marcador en la nueva posición sin recargar
                  marker.setPosition({ lat: newLat, lng: newLng })
                } else {
                  setVehicleMessage(`❌ ${resultado.error}`)
                  // Volver a la posición original si hay error
                  marker.setPosition(originalPosition)
                }
              } catch (error) {
                console.error("Error reubicando vehículo:", error)
                setVehicleMessage(`❌ Error al reubicar ${coche.matricula}`)
                // Volver a la posición original si hay error
                marker.setPosition(originalPosition)
              }
            })

            // Personalizar el cursor para indicar que es arrastrable
            marker.addListener("mouseover", () => {
              if (!isDragging) {
                map.setOptions({ draggableCursor: 'move' })
              }
            })

            marker.addListener("mouseout", () => {
              if (!isDragging) {
                map.setOptions({ draggableCursor: null })
              }
            })
            // Mejorar la UX: mostrar cursor de arrastre al pulsar y soltar
            marker.addListener("mousedown", () => {
              map.setOptions({ draggableCursor: "grabbing" })
            })
            marker.addListener("mouseup", () => {
              if (!isDragging) {
                map.setOptions({ draggableCursor: null })
              }
            })
          }

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
    [cochesVisibles, getEmpleadoInfo, clearMarkers, isGoogleMapsReady, userRole, userEmail, miCocheMatricula, misReservas, isAdmin],
  )

  // Función para actualizar la ubicación de un vehículo
  const updateVehicleLocation = useCallback(async (matricula: string, lat: number, lng: number) => {
    console.log(`🎯 Actualizando ubicación de ${matricula} en:`, { lat, lng })
    setVehicleMessage(`📍 Guardando nueva ubicación para ${matricula}...`)

    try {
      const resultado = await actualizarUbicacionCoche(matricula, lat, lng)
      
      if (resultado.success) {
        setVehicleMessage(`✅ ${resultado.message}`)
      } else {
        setVehicleMessage(`❌ ${resultado.error}`)
      }
    } catch (error) {
      console.error("Error actualizando ubicación:", error)
      setVehicleMessage(`❌ Error al actualizar la ubicación del vehículo ${matricula}`)
    } finally {
      setIsLocationMode(false)
      setVehicleToLocate(null)
      isLocationModeRef.current = false
      vehicleToLocateRef.current = null
    }
  }, [isGoogleMapsReady])

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
        //console.log("🎯 Mapa completamente listo")
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
  }, [isLoaded, addMarkers, isInitializing, isGoogleMapsReady, isLocationMode, vehicleToLocate, updateVehicleLocation])

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
  }, [cochesVisibles, empleados, addMarkers, isLoaded, isGoogleMapsReady])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      clearMarkers()
      if (mapInstance.current) {
        mapInstance.current = null
      }
    }
  }, [clearMarkers])

  // Effect para cargar / refrescar reservas activas cuando cambian los coches O las reservas del usuario (crear/cancelar/completar)
  useEffect(() => {
    if (cochesVisibles.length > 0) {
      const matriculas = cochesVisibles
        .filter(coche => !coche.donante)
        .map(coche => coche.matricula)
      if (matriculas.length > 0) {
        verificarReservasActivas(matriculas)
      }
    }
  }, [cochesVisibles, misReservas, verificarReservasActivas])

  const handleRefresh = useCallback(() => {
    window.location.reload()
  }, [])

  const handleCenter = useCallback(() => {
    if (mapInstance.current && cochesVisibles.length > 0 && isGoogleMapsReady()) {
      const cochesConUbicacion = cochesVisibles.filter((c) => c.latitud && c.longitud && !c.donante)
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
  }, [cochesVisibles, isGoogleMapsReady])

  const isLoading = !isLoaded || isInitializing
  const displayError = error || mapError

  // Calcular estadísticas
  const cochesConUbicacion = cochesVisibles.filter((c) => c.latitud && c.longitud && !c.donante)
  const cochesSinUbicacion = cochesVisibles.filter((c) => (!c.latitud || !c.longitud) && !c.donante)
  
  // Calcular asignados y disponibles de TODOS los coches (no solo los que tienen ubicación)
  const todosLosCoches = cochesVisibles.filter((c) => !c.donante)
  const cochesAsignados = todosLosCoches.filter((c) => getEmpleadoInfo(c) || c.asignadoa)
  const cochesReservados = todosLosCoches.filter((c) => {
    const estadoReserva = reservasActivas.get(c.matricula)
    const tieneReserva = !!(estadoReserva?.enCurso || estadoReserva?.vencida || estadoReserva?.bloquea) // programada no cuenta salvo margen activo
    return !c.asignadoa && tieneReserva
  })
  const cochesDisponibles = todosLosCoches.filter((c) => isCocheDisponible(c))

  const zoomToVehicles = useCallback(
    (filterType: "all" | "assigned" | "reserved" | "available" | "with-location" | "no-location") => {
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
        case "reserved":
          // Para el zoom, solo incluir reservados que tengan ubicación
          targetCoches = cochesReservados.filter((c) => c.latitud && c.longitud)
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
    [cochesConUbicacion, cochesAsignados, cochesReservados, cochesDisponibles, isGoogleMapsReady],
  )

  // Función para hacer zoom a un vehículo específico
  const zoomToVehicle = useCallback(
    (matricula: string) => {
      if (!mapInstance.current || !isGoogleMapsReady()) return

      const coche = cochesVisibles.find((c) => c.matricula === matricula)
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
    [cochesVisibles, isGoogleMapsReady],
  )

  // Función para abrir el modal de reserva temporal
  const handleAbrirReservaTemporal = useCallback(() => {
    if (!selectedMatricula || selectedMatricula === "all") return
    
    const coche = cochesVisibles.find(c => c.matricula === selectedMatricula)
    if (!coche) return
    const estadoReserva = reservasActivas.get(selectedMatricula)
    if (estadoReserva?.vencida) {
      setReservationMessage("❌ Este vehículo tiene una reserva vencida pendiente de completar. Debes completarla antes de crear una nueva.")
      return
    }

    setSelectedVehicleForReservation({
      matricula: coche.matricula,
      marcaModelo: `${coche.marca} ${coche.modelo}`
    })
    setShowReservaModal(true)
  }, [selectedMatricula, cochesVisibles, reservasActivas])

  // Función para cerrar el modal y limpiar estados
  const handleCerrarReservaTemporal = useCallback(() => {
    setShowReservaModal(false)
    setSelectedVehicleForReservation(null)
  }, [])

  // Función para manejar cuando se crea una reserva exitosamente
  const handleReservaCreada = useCallback((mensaje: string) => {
    if (isAdmin) {
      setReservationMessage(`✅ ${mensaje}`)
    } else {
      setReservationMessage("")
      setVehicleMessage("")
    }
    onReservaCreada?.()
  }, [isAdmin, onReservaCreada])


  // Función para manejar la liberación de un vehículo
  const handleLiberar = useCallback(async () => {
    if (!selectedMatricula || selectedMatricula === "all") return

    setIsReleasing(true)
    setReservationMessage("")

    try {
      const resultado = await liberarCoche(selectedMatricula)
      
      if (resultado.success) {
        setReservationMessage(`✅ ${resultado.message}`)
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
    
    const coche = cochesVisibles.find((c) => c.matricula === selectedMatricula)
    if (!coche) return false
    
    // Solo mostrar si el coche está asignado y no es donante
    if (!coche.asignadoa || coche.donante) return false
    
    // Si es administrador, puede liberar cualquier vehículo
    if (userRole === 'administrador') return true
    
    // Si es usuario regular, solo puede liberar sus propios vehículos
    const empleadoInfo = getEmpleadoInfo(coche)
    return empleadoInfo && empleadoInfo.email === userEmail
  }, [selectedMatricula, userEmail, userRole, cochesVisibles, getEmpleadoInfo])

  // Función para activar el modo de ubicación
  const activateLocationMode = useCallback((matricula: string) => {
    console.log("🎯 Activando modo ubicación para:", matricula)
    setIsLocationMode(true)
    setVehicleToLocate(matricula)
    isLocationModeRef.current = true
    vehicleToLocateRef.current = matricula
    setVehicleMessage(`📍 Haz clic en el mapa para ubicar el vehículo ${matricula}. El sistema guardará las coordenadas y la dirección automáticamente.`)
  }, [])

  // Función para cancelar el modo de ubicación
  const cancelLocationMode = useCallback(() => {
    setIsLocationMode(false)
    setVehicleToLocate(null)
    isLocationModeRef.current = false
    vehicleToLocateRef.current = null
    setVehicleMessage("")
  }, [])

  // Función para manejar la selección de vehículo con select nativo
  const handleVehicleSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const matricula = event.target.value
      selectedMatriculaRef.current = matricula
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
              case "reserved": count = cochesReservados.length; break
              case "with-location": count = cochesConUbicacion.length; break
            }
            setVehicleMessage(`ℹ️ Filtro activo: resaltando ${count} vehículos en el desplegable`)
          }
          
          const cochesConUbicacionLocal = cochesVisibles.filter((c) => c.latitud && c.longitud && !c.donante)
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

      const coche = cochesVisibles.find((c) => c.matricula === matricula)
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
            // Filtrar solo marcadores válidos
            const validMarkers = markers.current.filter(markerObj => markerObj && markerObj.marker && typeof markerObj.marker.getTitle === 'function')
            
            const targetMarkerObj = validMarkers.find((markerObj) => {
              try {
                // Buscar directamente por matrícula almacenada
                return markerObj.matricula === matricula
              } catch (error) {
                console.warn("Error identificando marcador:", error)
                return false
              }
            })
            if (targetMarkerObj) {
              ;(window as any).google.maps.event.trigger(targetMarkerObj.marker, "click")
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
    [cochesVisibles, getEmpleadoInfo, isGoogleMapsReady, isLoaded, filterMode],
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
  const matriculasOrdenadas = cochesVisibles
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
    const coche = cochesVisibles.find((c) => c.matricula === matricula)
    if (!coche) return "#000000" // Negro por defecto

    const isDisponible = isCocheDisponible(coche)
    
    // Si NO hay filtro activo (filterMode === "all"), aplicar nueva lógica:
    // - Gris claro para no disponibles
    // - Negro para disponibles
    if (filterMode === "all") {
      return isDisponible ? "#000000" : "#d1d5db" // Negro para disponibles, gris claro para no disponibles
    }

    const hasLocation = coche.latitud && coche.longitud && !coche.donante
    const isAssigned = getEmpleadoInfo(coche) || coche.asignadoa
  const estadoReserva = reservasActivas.get(coche.matricula)
  const isReserved = !coche.asignadoa && (estadoReserva?.enCurso || estadoReserva?.vencida || estadoReserva?.bloquea) // programada no

    // Si hay un filtro activo, colorear solo los que coinciden con el filtro
    let matchesFilter = false
    
    switch (filterMode) {
      case "available":
        matchesFilter = isDisponible // Usar la nueva lógica de disponibilidad
        break
      case "assigned":
        matchesFilter = !!isAssigned
        break
      case "reserved":
        matchesFilter = !!isReserved
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
        case "reserved":
          return "#f59e0b" // Ámbar para reservados
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
  }, [cochesVisibles, getEmpleadoInfo, filterMode, isCocheDisponible])

  // Función para obtener el texto descriptivo de filtro actual
  const getFilterDescription = useCallback(() => {
    switch (filterMode) {
      case "available":
        return `Resaltando ${cochesDisponibles.length} vehículos disponibles`
      case "assigned":
        return `Resaltando ${cochesAsignados.length} vehículos asignados`
      case "reserved":
        return `Resaltando ${cochesReservados.length} vehículos reservados`
      case "with-location":
        return `Resaltando ${cochesConUbicacion.length} vehículos con ubicación`
      case "no-location":
        return `Resaltando ${cochesSinUbicacion.length} vehículos sin ubicación`
      case "all":
      default:
        return "Mostrando todos los vehículos"
    }
  }, [filterMode, cochesDisponibles.length, cochesAsignados.length, cochesReservados.length, cochesConUbicacion.length, cochesSinUbicacion.length])

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
                    const coche = cochesVisibles.find((c) => c.matricula === matricula)
                    const hasLocation = coche?.latitud && coche?.longitud && !coche?.donante
                    const isDisponible = coche ? isCocheDisponible(coche) : false
                    const color = getMatriculaColor(matricula)
                    const estadoReserva = reservasActivas.get(matricula)
                    const empleadoInfo = getEmpleadoInfo(coche || { asignadoa: undefined } as any)
                    const reservaEmpleadoInfo = estadoReserva?.empleadoId ? empleadosMap.get(estadoReserva.empleadoId) : null
                    const empleadoNombre = empleadoInfo ? `${empleadoInfo.nombre} ${empleadoInfo.apellidos || ""}`.trim() : ""
                    const reservaEmpleadoNombre = reservaEmpleadoInfo
                      ? `${reservaEmpleadoInfo.nombre} ${reservaEmpleadoInfo.apellidos || ""}`.trim()
                      : estadoReserva?.empleadoId
                        ? `ID: ${estadoReserva.empleadoId}`
                        : ""
                    const reservaActiva = !!(estadoReserva?.enCurso || estadoReserva?.vencida || estadoReserva?.bloquea)
                    const personaEtiqueta = (!isDisponible && empleadoNombre) ? empleadoNombre : reservaActiva ? reservaEmpleadoNombre : ""
                    
                    // Lógica para el icono diferenciando estados
                    let icono = ""
                    if (estadoReserva?.vencida) {
                      icono = "⚠️" // vencida no completada
                    } else if (estadoReserva?.enCurso) {
                      icono = "⏳" // en curso
                    } else if (!isDisponible) {
                      icono = "👤" // asignado permanente u otra causa
                    } else if (estadoReserva?.programada) {
                      icono = "⏰" // próxima reserva programada (emoji más compatible)
                    } else if (hasLocation) {
                      icono = "📍"
                    } else {
                      icono = "🌐" // disponible pero sin ubicación
                    }
                    
                    return (
                      <option 
                        key={matricula} 
                        value={matricula}
                        style={{ color: color }}
                      >
                        {matricula} {icono || '[Prog]'}{estadoReserva?.vencida ? ' (vencida)' : estadoReserva?.enCurso ? ' (reservada)' : ''}{personaEtiqueta ? ` · ${personaEtiqueta}` : ''}
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
                    filterMode === "reserved" ? "bg-amber-500" :
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
                        const cochesConUbicacion = cochesVisibles.filter((c) => c.latitud && c.longitud && !c.donante)
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

              {/* Botón de Reserva Temporal */}
              {selectedMatricula && 
               selectedMatricula !== "all" && 
               (() => {
                 const cocheSeleccionado = cochesVisibles.find(c => c.matricula === selectedMatricula)
                 if (!cocheSeleccionado || cocheSeleccionado.donante || cocheSeleccionado.asignadoa) {
                   return null
                 }
                 const estadoReserva = reservasActivas.get(selectedMatricula)
                 const bloqueadaPorVencida = !!estadoReserva?.vencida
                 return (
                  <Button
                    onClick={handleAbrirReservaTemporal}
                    disabled={isReserving || isReleasing || bloqueadaPorVencida}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                    title={bloqueadaPorVencida ? "Reserva vencida pendiente de completar" : "Crear reserva temporal"}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Reserva Temporal
                  </Button>
                 )
               })()}

              {/* Mensaje informativo sobre disponibilidad */}
              {selectedMatricula &&
               selectedMatricula !== "all" &&
               (() => {
                 const cocheSeleccionado = cochesVisibles.find(c => c.matricula === selectedMatricula)
                 if (!cocheSeleccionado || cocheSeleccionado.donante) return false
                 const estadoReserva = reservasActivas.get(selectedMatricula)
                 const bloqueadoPorReserva = !!(estadoReserva?.enCurso || estadoReserva?.vencida || estadoReserva?.bloquea)
                 const asignado = !!cocheSeleccionado.asignadoa
                 return asignado || bloqueadoPorReserva
               })() && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Ban className="h-4 w-4" />
                    <span className="text-sm">Este vehículo tiene restricciones</span>
                  </div>
                  {(() => {
                    const cocheSeleccionado = cochesVisibles.find(c => c.matricula === selectedMatricula)
                    if (!cocheSeleccionado) return null
                    const estadoReserva = reservasActivas.get(selectedMatricula)
                    const bloqueadoPorReserva = !!(estadoReserva?.enCurso || estadoReserva?.vencida || estadoReserva?.bloquea)
                    const asignado = !!cocheSeleccionado.asignadoa
                    if (asignado) {
                      return (
                        <p className="text-xs text-gray-500 mt-1">
                          Este vehículo está asignado permanentemente y no se puede reservar.
                        </p>
                      )
                    }
                    if (estadoReserva?.vencida) {
                      return (
                        <p className="text-xs text-gray-500 mt-1">
                          Tiene una reserva vencida pendiente de completar. No se puede reservar hasta que se complete.
                        </p>
                      )
                    }
                    if (bloqueadoPorReserva) {
                      return (
                        <p className="text-xs text-gray-500 mt-1">
                          Tiene reservas en curso o bloqueos. Puedes abrir el calendario y elegir fechas libres.
                        </p>
                      )
                    }
                    return null
                  })()}
                </div>
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
            
            {vehicleMessage && (isAdmin || vehicleMessage.startsWith('❌')) && (
              <div 
                className={`mt-3 p-3 rounded-md ${
                  isLocationMode 
                    ? 'bg-orange-50 border border-orange-200' 
                    : 'bg-blue-50 border border-blue-200'
                }`}
              >
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
            
            {reservationMessage && (isAdmin || reservationMessage.startsWith('❌')) && (
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
          {isAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg">
            {/* Total sin ubicación */}
            <button
              onClick={() => {
                setFilterMode("no-location")
                setSelectedMatricula("all")
                setVehicleMessage("")
                setReservationMessage("")
              }}
              className={`text-center p-1.5 rounded-lg transition-colors cursor-pointer group ${
                filterMode === "no-location" 
                  ? "bg-gray-200 shadow-inner" 
                  : "hover:bg-gray-100"
              }`}
              disabled={cochesSinUbicacion.length === 0}
            >
              <div className={`text-xl font-bold ${
                filterMode === "no-location" 
                  ? "text-gray-800" 
                  : "text-gray-600 group-hover:text-gray-700"
              }`}>
                {cochesSinUbicacion.length}
              </div>
              <div className={`text-xs ${
                filterMode === "no-location" 
                  ? "text-gray-700" 
                  : "text-gray-600 group-hover:text-gray-700"
              }`}>
                Total sin ubicación
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {filterMode === "no-location" ? "Filtro activo" : "Click para filtrar"}
              </div>
            </button>
            
            {/* Total con ubicación */}
            <button
              onClick={() => zoomToVehicles("with-location")}
              className={`text-center p-1.5 rounded-lg transition-colors cursor-pointer group ${
                filterMode === "with-location" 
                  ? "bg-purple-100 shadow-inner" 
                  : "hover:bg-purple-50"
              }`}
              disabled={cochesConUbicacion.length === 0}
            >
              <div className={`text-xl font-bold ${
                filterMode === "with-location" 
                  ? "text-purple-800" 
                  : "text-purple-600 group-hover:text-purple-700"
              }`}>
                {cochesConUbicacion.length}
              </div>
              <div className={`text-xs ${
                filterMode === "with-location" 
                  ? "text-purple-700" 
                  : "text-gray-600 group-hover:text-gray-700"
              }`}>
                Total con ubicación
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {filterMode === "with-location" ? "Filtro activo" : "Click para ver en mapa"}
              </div>
            </button>
            
            {/* Asignados */}
            <button
              onClick={() => zoomToVehicles("assigned")}
              className={`text-center p-1.5 rounded-lg transition-colors cursor-pointer group ${
                filterMode === "assigned" 
                  ? "bg-green-100 shadow-inner" 
                  : "hover:bg-green-50"
              }`}
              disabled={cochesAsignados.length === 0}
            >
              <div className={`text-xl font-bold ${
                filterMode === "assigned" 
                  ? "text-green-800" 
                  : "text-green-600 group-hover:text-green-700"
              }`}>
                {cochesAsignados.length}
              </div>
              <div className={`text-xs ${
                filterMode === "assigned" 
                  ? "text-green-700" 
                  : "text-gray-600 group-hover:text-gray-700"
              }`}>
                Asignados
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {filterMode === "assigned" ? "Filtro activo" : "Click para ver en mapa"}
              </div>
            </button>
            
            {/* Reservados */}
            <button
              onClick={() => zoomToVehicles("reserved")}
              className={`text-center p-1.5 rounded-lg transition-colors cursor-pointer group ${
                filterMode === "reserved" 
                  ? "bg-amber-100 shadow-inner" 
                  : "hover:bg-amber-50"
              }`}
              disabled={cochesReservados.length === 0}
            >
              <div className={`text-xl font-bold ${
                filterMode === "reserved" 
                  ? "text-amber-800" 
                  : "text-amber-600 group-hover:text-amber-700"
              }`}>
                {cochesReservados.length}
              </div>
              <div className={`text-xs ${
                filterMode === "reserved" 
                  ? "text-amber-700" 
                  : "text-gray-600 group-hover:text-gray-700"
              }`}>
                Reservados
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {filterMode === "reserved" ? "Filtro activo" : "Click para ver en mapa"}
              </div>
            </button>
            
            {/* Disponibles */}
            <button
              onClick={() => zoomToVehicles("available")}
              className={`text-center p-1.5 rounded-lg transition-colors cursor-pointer group ${
                filterMode === "available" 
                  ? "bg-blue-100 shadow-inner" 
                  : "hover:bg-blue-50"
              }`}
              disabled={cochesDisponibles.length === 0}
            >
              <div className={`text-xl font-bold ${
                filterMode === "available" 
                  ? "text-blue-800" 
                  : "text-blue-500 group-hover:text-blue-600"
              }`}>
                {cochesDisponibles.length}
              </div>
              <div className={`text-xs ${
                filterMode === "available" 
                  ? "text-blue-700" 
                  : "text-gray-600 group-hover:text-gray-700"
              }`}>
                Disponibles
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {filterMode === "available" ? "Filtro activo" : "Click para ver en mapa"}
              </div>
            </button>
          </div>
          )}

          {/* Leyenda */}
          {isAdmin && (
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
                <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
                <span>Reservado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                <span>Con ubicación</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                <span>Sin ubicación</span>
              </div>
              {userRole && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-600">🖱️</span>
                  <span className="text-green-600">
                    {userRole === 'administrador' 
                      ? 'Puedes reubicar cualquier vehículo arrastrándolo' 
                      : 'Puedes reubicar tus vehículos asignados o con reservas activas'}
                  </span>
                </div>
              )}
            </div>
            
            {/* Información de filtrado */}
            <div className="text-xs text-gray-400">
              {filterMode !== "all" 
                ? (() => {
                    let count = 0
                    switch (filterMode) {
                      case "available": count = cochesDisponibles.length; break
                      case "assigned": count = cochesAsignados.length; break
                      case "reserved": count = cochesReservados.length; break
                      case "with-location": count = cochesConUbicacion.length; break
                      case "no-location": count = cochesSinUbicacion.length; break
                    }
                    return `${count} vehículos resaltados de ${matriculasOrdenadas.length} totales`
                  })()
                : `${matriculasOrdenadas.length} vehículos totales`
              }
            </div>
          </div>
          )}

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
                      Total coches: {cochesVisibles.length} | Con ubicación: {cochesConUbicacion.length}
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

              {/* Menú contextual para reubicar */}
              {contextMenu.visible && (
                <div
                  style={{
                    position: "fixed",
                    top: contextMenu.y,
                    left: contextMenu.x,
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                    zIndex: 9999,
                    minWidth: "180px",
                  }}
                >
                  <div style={{ padding: "10px", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>
                      {contextMenu.matricula}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      Selecciona "Reubicar" y luego haz clic en el mapa
                    </div>
                  </div>
                  <button
                    onClick={handleContextRelocate}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "none",
                      background: "#10b981",
                      color: "white",
                      fontWeight: 600,
                      cursor: "pointer",
                      borderBottom: "1px solid #0ea472",
                    }}
                  >
                    Reubicar
                  </button>
                  <button
                    onClick={handleContextCancel}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "none",
                      background: "white",
                      color: "#6b7280",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
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

      {/* Modal de Reserva Temporal */}
      {selectedVehicleForReservation && (
        <ReservaModal
          isOpen={showReservaModal}
          onClose={handleCerrarReservaTemporal}
          matricula={selectedVehicleForReservation.matricula}
          marcaModelo={selectedVehicleForReservation.marcaModelo}
          onReservaCreada={handleReservaCreada}
        />
      )}
    </Card>
  )
}
