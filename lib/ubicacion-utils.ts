/**
 * Utilidades para obtener la ubicación del dispositivo y actualizar vehículos
 */

export interface Ubicacion {
  latitud: number
  longitud: number
  precision?: number
  timestamp?: number
}

/**
 * Obtiene la ubicación actual del dispositivo usando el GPS
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
        let mensaje = 'Error al obtener la ubicación'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            mensaje = 'Permiso denegado para acceder a la ubicación'
            break
          case error.POSITION_UNAVAILABLE:
            mensaje = 'Ubicación no disponible'
            break
          case error.TIMEOUT:
            mensaje = 'Tiempo de espera agotado para obtener la ubicación'
            break
        }
        
        reject(new Error(mensaje))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
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
