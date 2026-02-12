"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function editarEmpleado(id: number, formData: FormData) {
  try {
    // Validar que el ID sea un número válido
    if (isNaN(id)) {
      return {
        success: false,
        error: "ID de empleado no válido",
      }
    }

    // Obtener rol actual del empleado para no perderlo si no viene en el formulario
    const { data: empleadoActual, error: empleadoActualError } = await supabase
      .from("empleados")
      .select("role")
      .eq("id", id)
      .single()

    if (empleadoActualError || !empleadoActual) {
      console.error("Error obteniendo rol actual:", empleadoActualError)
      return {
        success: false,
        error: "No se pudo obtener el rol actual del empleado",
      }
    }

    const roleFromForm = (formData.get("role") as string) || empleadoActual.role || "usuario"
    const allowedRoles = ["usuario", "administrador", "admin"]
    const roleFinal = allowedRoles.includes(roleFromForm) ? roleFromForm : "usuario"

    // Extraer datos del formulario
    const empleadoData: any = {
      nombre: formData.get("nombre") as string,
      apellidos: formData.get("apellidos") as string,
      email: formData.get("email") as string,
      movil: (formData.get("movil") as string) || null,
      role: roleFinal,
      baneado: roleFinal === "administrador" || roleFinal === "admin"
        ? false
        : formData.get("baneado") === "on",
    }

    // Validaciones básicas
    if (!empleadoData.nombre || !empleadoData.apellidos || !empleadoData.email) {
      return {
        success: false,
        error: "Los campos nombre, apellidos y email son obligatorios",
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

    // Verificar que el email no esté duplicado (excluyendo el empleado actual)
    const { data: existingEmpleado, error: checkError } = await supabase
      .from("empleados")
      .select("id")
      .eq("email", empleadoData.email)
      .neq("id", id)
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
        error: "Ya existe otro empleado con este email",
      }
    }

    // Actualizar en Supabase
    const { data, error } = await supabase.from("empleados").update(empleadoData).eq("id", id).select()

    if (error) {
      console.error("Error al actualizar empleado:", error)
      return {
        success: false,
        error: `Error al actualizar el empleado: ${error.message}`,
      }
    }

    console.log("Empleado actualizado exitosamente:", data)

    // Revalidar las páginas relevantes
    revalidatePath("/empleados")
    revalidatePath(`/empleados/${id}`)

    return {
      success: true,
      data: data[0],
    }
  } catch (error) {
    console.error("Error en editarEmpleado:", error)
    return {
      success: false,
      error: "Error inesperado al actualizar el empleado",
    }
  }
}

export async function obtenerEmpleado(id: number) {
  if (isNaN(id)) {
    return null
  }

  try {
    const { data, error } = await supabase.from("empleados").select("*").eq("id", id).single()

    if (error) {
      console.error("Error al obtener empleado:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error en obtenerEmpleado:", error)
    return null
  }
}
