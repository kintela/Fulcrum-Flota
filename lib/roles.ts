import { supabaseServer as supabase } from "./supabase-server"
import { Session } from "next-auth"

// Tipos de roles disponibles
export type UserRole = 'administrador' | 'usuario'

// Interface para el empleado con rol
export interface EmpleadoConRol {
  id: number
  nombre: string
  apellidos: string
  email: string
  movil?: string
  role: UserRole
  created_at?: string
}

/**
 * Obtiene el rol del usuario autenticado basado en su email
 */
export async function obtenerRolUsuario(email: string): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from("empleados")
      .select("role")
      .eq("email", email)
      .single()

    if (error || !data) {
      console.error("Error al obtener rol del usuario:", error)
      return null
    }

    return data.role as UserRole
  } catch (error) {
    console.error("Error en obtenerRolUsuario:", error)
    return null
  }
}

/**
 * Obtiene los datos completos del empleado por email
 */
export async function obtenerEmpleadoPorEmail(email: string): Promise<EmpleadoConRol | null> {
  try {
    const { data, error } = await supabase
      .from("empleados")
      .select("*")
      .eq("email", email)
      .single()

    if (error || !data) {
      console.error("Error al obtener empleado por email:", error)
      return null
    }

    return data as EmpleadoConRol
  } catch (error) {
    console.error("Error en obtenerEmpleadoPorEmail:", error)
    return null
  }
}

/**
 * Verifica si un usuario tiene rol de administrador
 */
export function esAdministrador(role: UserRole | null): boolean {
  return role === 'administrador'
}

/**
 * Verifica si un usuario es administrador basado en la sesión
 */
export async function esAdministradorPorSesion(session: Session | null): Promise<boolean> {
  if (!session?.user?.email) {
    return false
  }

  const role = await obtenerRolUsuario(session.user.email)
  return esAdministrador(role)
}

/**
 * Hook para verificar permisos en componentes del lado del cliente
 */
export function verificarPermiso(userRole: UserRole | null, requiredRole: UserRole): boolean {
  if (!userRole) return false
  
  // Los administradores tienen acceso a todo
  if (userRole === 'administrador') return true
  
  // Verificar si el rol del usuario cumple con el requerido
  return userRole === requiredRole
}

/**
 * Actualizar el rol de un empleado
 */
export async function actualizarRolEmpleado(empleadoId: number, nuevoRol: UserRole): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { error } = await supabase
      .from("empleados")
      .update({ role: nuevoRol })
      .eq("id", empleadoId)

    if (error) {
      console.error("Error al actualizar rol:", error)
      return {
        success: false,
        error: `Error al actualizar el rol: ${error.message}`
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error en actualizarRolEmpleado:", error)
    return {
      success: false,
      error: "Error inesperado al actualizar el rol"
    }
  }
}
