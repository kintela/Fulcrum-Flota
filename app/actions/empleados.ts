"use server"

import { supabase } from "@/lib/supabase"

export async function obtenerEmpleados() {
  try {
    const { data, error } = await supabase
      .from("empleados")
      .select("*")
      .eq("activo", true)
      .order("nombre", { ascending: true })

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
