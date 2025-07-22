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

    // Verificar que es un usuario válido
    const userRole = session.user.role || 'usuario'
    
    // Solo usuarios regulares pueden actualizar ubicaciones de sus propios vehículos
    // Los administradores podrían actualizar cualquier vehículo
    if (userRole === 'usuario') {
      // Verificar que el vehículo está asignado al usuario
      const { data: empleado } = await supabase
        .from("empleados")
        .select("id")
        .eq('email', session.user.email)
        .single()

      if (!empleado) {
        return { success: false, error: "Empleado no encontrado" }
      }

      // Verificar que el vehículo está asignado al usuario
      const { data: coche } = await supabase
        .from("coches")
        .select("asignadoa")
        .eq('matricula', matricula)
        .single()

      if (!coche || coche.asignadoa !== empleado.id) {
        return { success: false, error: "No tienes permisos para actualizar la ubicación de este vehículo" }
      }
    }

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
