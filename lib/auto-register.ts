"use server"

import { supabaseServer as supabase } from "./supabase-server"
import { RolUsuario } from "./user-role"

/**
 * Registra automáticamente un usuario nuevo en la tabla empleados
 */
export async function registrarUsuarioAutomatico(email: string, nombre: string, apellidos?: string) {
  try {
    console.log(`� INICIANDO registrarUsuarioAutomatico con:`, { email, nombre, apellidos })
    
    // Verificar si ya existe
    console.log(`🔥 VERIFICANDO si existe usuario: ${email}`)
    const { data: existingUser, error: checkError } = await supabase
      .from("empleados")
      .select("id, email")
      .eq("email", email)
      .single()

    console.log(`🔥 RESULTADO verificación:`, { existingUser, checkError })

    if (checkError && checkError.code !== "PGRST116") {
      console.error("🔥 ERROR verificando usuario existente:", checkError)
      return { success: false, error: checkError.message }
    }

    if (existingUser) {
      console.log(`🔥 USUARIO YA EXISTE: ${email} con ID: ${existingUser.id}`)
      return { success: true, user: existingUser, wasCreated: false }
    }

    console.log(`🔥 USUARIO NO EXISTE, procediendo a crear...`)

    // Separar nombre y apellidos si vienen juntos
    let nombreFinal = nombre
    let apellidosFinal = apellidos || ""

    if (!apellidos && nombre && nombre.includes(" ")) {
      const partes = nombre.trim().split(" ")
      nombreFinal = partes[0]
      apellidosFinal = partes.slice(1).join(" ")
    }

    // Si aún no tenemos apellidos, usar una cadena vacía
    if (!apellidosFinal) {
      apellidosFinal = ""
    }

    console.log(`🔥 DATOS FINALES PARA INSERTAR:`, {
      nombre: nombreFinal,
      apellidos: apellidosFinal,
      email: email,
      role: RolUsuario.USUARIO
    })

    // Crear nuevo empleado con rol 'usuario' por defecto
    const nuevoEmpleado = {
      nombre: nombreFinal,
      apellidos: apellidosFinal,
      email: email,
      role: RolUsuario.USUARIO, // Rol por defecto
      movil: null // Se puede actualizar después
    }

    console.log(`🔥 INSERTANDO nuevo empleado...`)
    const { data, error } = await supabase
      .from("empleados")
      .insert([nuevoEmpleado])
      .select()
      .single()

    console.log(`🔥 RESULTADO INSERT:`, { data, error })

    if (error) {
      console.error("🔥 ERROR creando usuario automático:", error)
      return { success: false, error: error.message }
    }

    console.log(`🔥 USUARIO CREADO EXITOSAMENTE:`, data)
    return { success: true, user: data, wasCreated: true }

  } catch (error) {
    console.error("🔥 ERROR GENERAL en registrarUsuarioAutomatico:", error)
    return { success: false, error: "Error inesperado al registrar usuario" }
  }
}
