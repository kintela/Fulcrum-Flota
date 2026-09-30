/**
 * Utilidades para obtener la ubicación del dispositivo y actualizar vehículos
 */

export interface Ubicacion {
  latitud: number
  longitud: number
  precision?: number
  timestamp?: number
}

const OPCIONES_UBICACION: PositionOptions = {
  // La alta precisión obliga a muchos móviles a esperar una señal GPS. Una
  // posición de red/Wi-Fi es suficiente para situar el coche y llega mucho
  // antes; el navegador seguirá usando GPS si ya está disponible.
  enableHighAccuracy: false,
  timeout: 30000,
  maximumAge: 120000,
}

function mensajeErrorUbicacion(error: GeolocationPositionError) {
  // Se usan los códigos estándar porque algunos navegadores no exponen las
  // constantes PERMISSION_DENIED/POSITION_UNAVAILABLE/TIMEOUT en la instancia.
  switch (error.code) {
    case 1:
      return "No se ha permitido acceder a la ubicación. Activa el permiso de ubicación para este sitio e inténtalo de nuevo."
    case 2:
      return "No se puede determinar la ubicación. Comprueba que la ubicación del móvil esté activada e inténtalo de nuevo."
    case 3:
      return "La ubicación está tardando demasiado. Comprueba que la ubicación del móvil esté activada y vuelve a intentarlo."
    default:
      return "Error al obtener la ubicación"
  }
}

/**
 * Obtiene la ubicación actual del dispositivo.
 */
export async function obtenerUbicacionActual(): Promise<Ubicacion> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La geolocalización no está soportada en este dispositivo'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
          precision: position.coords.accuracy,
          timestamp: position.timestamp
        })
      },
      (error) => {
        reject(new Error(mensajeErrorUbicacion(error)))
      },
      OPCIONES_UBICACION,
    )
  })
}

/**
 * Actualiza la ubicación de un vehículo
 */
export async function actualizarUbicacionCoche(matricula: string, ubicacion: Ubicacion) {
  try {
    const response = await fetch('/api/coches/actualizar-ubicacion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matricula,
        latitud: ubicacion.latitud,
        longitud: ubicacion.longitud,
        precision: ubicacion.precision,
        timestamp: new Date().toISOString()
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Error al actualizar la ubicación del vehículo')
    }

    return await response.json()
  } catch (error) {
    console.error('Error actualizando ubicación del coche:', error)
    throw error
  }
}

/**
 * Obtiene la ubicación actual y la asigna automáticamente a un vehículo
 */
export async function capturarYAsignarUbicacion(matricula: string): Promise<{ success: boolean; mensaje: string; ubicacion?: Ubicacion }> {
  try {
    const ubicacion = await obtenerUbicacionActual()
    await actualizarUbicacionCoche(matricula, ubicacion)
    
    return {
      success: true,  
      mensaje: `Ubicación actualizada correctamente para ${matricula}`,
      ubicacion
    }
  } catch (error) {
    return {
      success: false,
      mensaje: error instanceof Error ? error.message : 'Error desconocido al capturar la ubicación'
    }
  }
}
