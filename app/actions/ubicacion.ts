"use server"

import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

const supabaseAdmin =
  process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null

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

    const client = supabaseAdmin ?? supabase
    const { error: updateError } = await client
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

export async function ubicarCocheEnSede(matricula: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { success: false, error: "No autorizado" }
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return { success: false, error: "API key de Google Maps no configurada" }
    }

    const direccionSede = "Aldapa 13, Leioa, 48940, Bizkaia, España"
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(direccionSede)}&key=${apiKey}&language=es`
    const geocodeResponse = await fetch(geocodeUrl)
    const geocodeData = await geocodeResponse.json()

    if (geocodeData.status !== "OK" || !geocodeData.results?.length) {
      return { success: false, error: "No se pudo geocodificar la dirección de la sede" }
    }

    const location = geocodeData.results[0].geometry.location
    const latitud = location.lat
    const longitud = location.lng
    const direccionActual = geocodeData.results[0].formatted_address

    const client = supabaseAdmin ?? supabase
    const { error: updateError } = await client
      .from("coches")
      .update({
        latitud,
        longitud,
        direccion_actual: direccionActual,
        ultima_ubicacion: new Date().toISOString(),
      })
      .eq("matricula", matricula)

    if (updateError) {
      console.error("Error updating vehicle location:", updateError)
      return { success: false, error: "Error al actualizar la ubicación del vehículo" }
    }

    return {
      success: true,
      message: `Ubicación inicial asignada en sede Fulcrum`,
      ubicacion: { latitud, longitud, direccion_actual: direccionActual },
    }
  } catch (error) {
    console.error("Error in ubicarCocheEnSede:", error)
    return { success: false, error: "Error inesperado al ubicar el vehículo" }
  }
}
