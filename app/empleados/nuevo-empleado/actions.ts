"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function crearEmpleado(formData: FormData) {
  try {
    // Extraer datos del formulario
    const empleadoData = {
      nombre: formData.get("nombre") as string,
      apellidos: formData.get("apellidos") as string,
      email: formData.get("email") as string,
      movil: (formData.get("movil") as string) || null,
      contraseña: formData.get("contraseña") as string,
    }

    // Validaciones básicas
    if (!empleadoData.nombre || !empleadoData.apellidos || !empleadoData.email || !empleadoData.contraseña) {
      return {
        success: false,
        error: "Los campos nombre, apellidos, email y contraseña son obligatorios",
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

    // Validar longitud de contraseña
    if (empleadoData.contraseña.length < 6) {
      return {
        success: false,
        error: "La contraseña debe tener al menos 6 caracteres",
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
