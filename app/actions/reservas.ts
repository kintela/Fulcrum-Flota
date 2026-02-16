"use server"

import { supabaseServer as supabase } from "@/lib/supabase-server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function reservarCoche(matricula: string) {
  try {
    // Obtener información del usuario logueado
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Usuario no autenticado"
      }
    }

    // Buscar el empleado por email
    const { data: empleado, error: empleadoError } = await supabase
      .from("empleados")
      .select("id, nombre, apellidos")
      .eq('email', session.user.email)
      .single()
    
    if (empleadoError || !empleado) {
      return {
        success: false,
        error: "No se encontró el empleado asociado a este usuario"
      }
    }

    // Verificar que el coche existe y está disponible
    const { data: coche, error: cocheError } = await supabase
      .from("coches")
      .select("matricula, marca, modelo, asignadoa, donante")
      .eq('matricula', matricula)
      .single()
    
    if (cocheError || !coche) {
      return {
        success: false,
        error: "Vehículo no encontrado"
      }
    }

    // Verificar que no sea un vehículo donante
    if (coche.donante) {
      return {
        success: false,
        error: "No se pueden reservar vehículos donantes"
      }
    }

    // Verificar que esté disponible (sin asignar)
    if (coche.asignadoa) {
      return {
        success: false,
        error: "Este vehículo ya está asignado a otro empleado"
      }
    }

    // Asignar el coche al empleado
    const { error: updateError } = await supabase
      .from("coches")
      .update({
        asignadoa: empleado.id
      })
      .eq('matricula', matricula)
    
    if (updateError) {
      console.error("Error actualizando coche:", updateError)
      return {
        success: false,
        error: "Error al reservar el vehículo"
      }
    }

    return {
      success: true,
      message: `Vehículo ${matricula} (${coche.marca} ${coche.modelo}) reservado exitosamente para ${empleado.nombre} ${empleado.apellidos}`
    }

  } catch (error) {
    console.error("Error en reservarCoche:", error)
    return {
      success: false,
      error: "Error inesperado al reservar el vehículo"
    }
  }
}

export async function liberarCoche(matricula: string) {
  try {
    // Obtener información del usuario logueado
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Usuario no autenticado"
      }
    }

    // Buscar el empleado por email para verificar rol
    const { data: empleado, error: empleadoError } = await supabase
      .from("empleados")
      .select("id, nombre, apellidos, role")
      .eq('email', session.user.email)
      .single()
    
    if (empleadoError || !empleado) {
      return {
        success: false,
        error: "No se encontró el empleado asociado a este usuario"
      }
    }

    // Verificar que el coche existe
    const { data: coche, error: cocheError } = await supabase
      .from("coches")
      .select("matricula, marca, modelo, asignadoa, donante")
      .eq('matricula', matricula)
      .single()
    
    if (cocheError || !coche) {
      return {
        success: false,
        error: "Vehículo no encontrado"
      }
    }

    // Verificar que no sea un vehículo donante
    if (coche.donante) {
      return {
        success: false,
        error: "No se pueden liberar vehículos donantes"
      }
    }

    // Verificar que el coche esté asignado
    if (!coche.asignadoa) {
      return {
        success: false,
        error: "Este vehículo no está asignado a ningún empleado"
      }
    }

    // Los administradores pueden liberar cualquier coche, 
    // los empleados solo pueden liberar sus propios coches
    const roleValue = String(empleado.role || "").toLowerCase()
    const isAdmin = roleValue === "admin" || roleValue === "administrador"
    
    if (!isAdmin && Number(coche.asignadoa) !== empleado.id) {
      return {
        success: false,
        error: "No tienes permisos para liberar este vehículo"
      }
    }

    // Liberar el coche (quitar la asignación)
    const { error: updateError, data: updateData } = await supabase
      .from("coches")
      .update({
        asignadoa: null
      })
      .eq('matricula', matricula)
      .select()
    
    if (updateError) {
      return {
        success: false,
        error: "Error al liberar el vehículo"
      }
    }

    return {
      success: true,
      message: `Vehículo ${matricula} (${coche.marca} ${coche.modelo}) liberado exitosamente`
    }

  } catch (error) {
    console.error("Error en liberarCoche:", error)
    return {
      success: false,
      error: "Error inesperado al liberar el vehículo"
    }
  }
}
