"use server"

import { supabaseServer as supabase } from "@/lib/supabase-server"
import { autorizarAdmin } from "@/lib/autorizacion"

export async function obtenerEmpleados() {
  // Spec 017: solo administradores.
  const acceso = await autorizarAdmin()
  if (!acceso.ok) return []

  try {
    const { data, error } = await supabase.from("empleados").select("*").order("nombre", { ascending: true })

    if (error) {
      console.error("Error al obtener empleados:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error en obtenerEmpleados:", error)
    return []
  }
}

export async function obtenerEmpleadoPorId(id: number) {
  // Spec 017: solo administradores.
  const acceso = await autorizarAdmin()
  if (!acceso.ok) return null

  try {
    const { data, error } = await supabase.from("empleados").select("*").eq("id", id).single()

    if (error) {
      console.error("Error al obtener empleado:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error en obtenerEmpleadoPorId:", error)
    return null
  }
}
