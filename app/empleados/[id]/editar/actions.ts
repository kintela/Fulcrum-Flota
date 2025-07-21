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

    // Extraer datos del formulario
    const empleadoData: any = {
      nombre: formData.get("nombre") as string,
      apellidos: formData.get("apellidos") as string,
      email: formData.get("email") as string,
      movil: (formData.get("movil") as string) || null,
      role: (formData.get("role") as string) || "usuario", // Añadir campo role
    }

    // Solo incluir contraseña si se proporciona una nueva
    const nuevaContraseña = formData.get("contraseña") as string
    if (nuevaContraseña && nuevaContraseña.trim() !== "") {
      if (nuevaContraseña.length < 6) {
        return {
          success: false,
          error: "La nueva contraseña debe tener al menos 6 caracteres",
        }
      }
      empleadoData.contraseña = nuevaContraseña
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
