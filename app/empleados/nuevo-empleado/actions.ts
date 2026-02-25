"use server"

import { supabaseServer as supabase } from "@/lib/supabase-server"
import { normalizarRolUsuario } from "@/lib/user-role"
import { revalidatePath } from "next/cache"

export async function crearEmpleado(formData: FormData) {
  try {
    const getValue = (key: string) => {
      const value = formData.get(key)
      return typeof value === "string" ? value.trim() : ""
    }

    // Extraer datos del formulario con trim para evitar falsos negativos
    const empleadoData = {
      nombre: getValue("nombre"),
      apellidos: getValue("apellidos"),
      email: getValue("email"),
      movil: getValue("movil") || null,
      role: normalizarRolUsuario(formData.get("role")),
    }

    // Validaciones básicas
    const missingFields = []
    if (!empleadoData.nombre) missingFields.push("nombre")
    if (!empleadoData.apellidos) missingFields.push("apellidos")
    if (!empleadoData.email) missingFields.push("email")

    if (missingFields.length > 0) {
      const lista = missingFields.join(", ")
      return {
        success: false,
        error: `Faltan los campos obligatorios: ${lista}`,
      }
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(empleadoData.email)) {
      return {
        success: false,
        error: "El formato del email no es válido",
      }
    }

    // Verificar que el email no esté duplicado
    const { data: existingEmpleado, error: checkError } = await supabase
      .from("empleados")
      .select("id")
      .eq("email", empleadoData.email)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 es "no rows found", que es lo que esperamos
      console.error("Error checking existing email:", checkError)
      return {
        success: false,
        error: "Error al verificar el email",
      }
    }

    if (existingEmpleado) {
      return {
        success: false,
        error: "Ya existe un empleado con este email",
      }
    }

    // Insertar en Supabase
    const { data, error } = await supabase.from("empleados").insert([empleadoData]).select()

    if (error) {
      console.error("Error al crear empleado:", error)
      return {
        success: false,
        error: `Error al crear el empleado: ${error.message}`,
      }
    }

    console.log("Empleado creado exitosamente:", data)

    // Revalidar la página de empleados para mostrar los nuevos datos
    revalidatePath("/empleados")

    return {
      success: true,
      data: data[0],
    }
  } catch (error) {
    console.error("Error en crearEmpleado:", error)
    return {
      success: false,
      error: "Error inesperado al crear el empleado",
    }
  }
}
