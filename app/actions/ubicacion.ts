"use server"

import { supabase } from "@/lib/supabase"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function actualizarUbicacionCoche(matricula: string, latitud: number, longitud: number) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { success: false, error: "No autorizado" }
    }

    // Permitir reubicar si estás autenticado (ya sea admin o usuario con sesión).
    // Las políticas de Supabase controlan el acceso.

    // Intentar obtener la dirección usando Geocoding API de Google
    let direccionActual = null
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    if (apiKey) {
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitud},${longitud}&key=${apiKey}&language=es`
        const geocodeResponse = await fetch(geocodeUrl)
        const geocodeData = await geocodeResponse.json()
        
        if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
          direccionActual = geocodeData.results[0].formatted_address
        }
      } catch (geocodeError) {
        console.warn("Error obtaining address:", geocodeError)
        // Continuar sin dirección si falla el geocoding
      }
    }

    // Actualizar la ubicación del vehículo
    const updateData: any = { 
      latitud: latitud, 
      longitud: longitud,
      ultima_ubicacion: new Date().toISOString()
    }

    // Solo actualizar dirección si se obtuvo
    if (direccionActual) {
      updateData.direccion_actual = direccionActual
    }

    const { error: updateError } = await supabase
      .from("coches")
      .update(updateData)
      .eq('matricula', matricula)

    if (updateError) {
      console.error("Error updating vehicle location:", updateError)
      return { success: false, error: "Error al actualizar la ubicación del vehículo" }
    }

    return { 
      success: true, 
      message: `Ubicación del vehículo ${matricula} actualizada correctamente${direccionActual ? ` en ${direccionActual}` : ''}` 
    }

  } catch (error) {
    console.error("Error in actualizarUbicacionCoche:", error)
    return { 
      success: false, 
      error: "Error inesperado al actualizar la ubicación" 
    }
  }
}
