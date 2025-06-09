"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function crearCoche(formData: FormData) {
  try {
    // Extraer datos del formulario según la estructura real de la tabla
    const cocheData = {
      matricula: formData.get("matricula") as string,
      marca: formData.get("marca") as string,
      modelo: formData.get("modelo") as string,
      color: (formData.get("color") as string) || null,
      fechamatriculacion: (formData.get("fechamatriculacion") as string) || null,
      kms: formData.get("kms") ? Number.parseInt(formData.get("kms") as string) : 0,
      kw: formData.get("kw") ? Number.parseInt(formData.get("kw") as string) : null,
      cv: formData.get("cv") ? Number.parseInt(formData.get("cv") as string) : null,
      cc: formData.get("cc") ? Number.parseInt(formData.get("cc") as string) : null,
      combustible: (formData.get("combustible") as string) || "Gasolina",
      extras: (formData.get("extras") as string) || null,
      donante: formData.get("donante") === "on",
      asignadoa: (formData.get("asignadoa") as string) || null,
      alquiler: formData.get("alquiler") === "on",
      preciocompra: formData.get("preciocompra") ? Number.parseFloat(formData.get("preciocompra") as string) : null,
      // Nuevos campos para la relación con empleados
      empleado_id: formData.get("empleado_id") ? Number.parseInt(formData.get("empleado_id") as string) : null,
      fecha_asignacion: (formData.get("fecha_asignacion") as string) || null,
      observaciones_asignacion: (formData.get("observaciones_asignacion") as string) || null,
    }

    // Validaciones básicas
    if (!cocheData.matricula || !cocheData.marca || !cocheData.modelo) {
      return {
        success: false,
        error: "Los campos matrícula, marca y modelo son obligatorios",
      }
    }

    // Verificar si ya existe un coche con la misma matrícula
    const { data: cocheExistente, error: errorBusqueda } = await supabase
      .from("coches")
      .select("matricula")
      .eq("matricula", cocheData.matricula)
      .single()

    if (errorBusqueda && errorBusqueda.code !== "PGRST116") {
      // PGRST116 es "no rows found", que es lo que esperamos
      console.error("Error al verificar matrícula duplicada:", errorBusqueda)
      return {
        success: false,
        error: "Error al verificar la matrícula",
      }
    }

    if (cocheExistente) {
      return {
        success: false,
        error: `Ya existe un coche con la matrícula ${cocheData.matricula}`,
      }
    }

    // Si no es alquiler y se asigna a empleado, validar que existe el empleado
    if (!cocheData.alquiler && cocheData.empleado_id) {
      const { data: empleado, error: empleadoError } = await supabase
        .from("empleados")
        .select("id")
        .eq("id", cocheData.empleado_id)
        .single()

      if (empleadoError || !empleado) {
        return {
          success: false,
          error: "El empleado seleccionado no existe",
        }
      }
    }

    // Si es alquiler, limpiar campos de empleado
    if (cocheData.alquiler) {
      cocheData.empleado_id = null
      cocheData.fecha_asignacion = null
      cocheData.observaciones_asignacion = null
    }

    // Insertar en Supabase
    const { data, error } = await supabase.from("coches").insert([cocheData]).select()

    if (error) {
      console.error("Error al crear coche:", error)
      return {
        success: false,
        error: `Error al crear el coche: ${error.message}`,
      }
    }

    console.log("Coche creado exitosamente:", data)

    // Revalidar la página de coches para mostrar los nuevos datos
    revalidatePath("/coches")

    return {
      success: true,
      data: data[0],
    }
  } catch (error) {
    console.error("Error en crearCoche:", error)
    return {
      success: false,
      error: "Error inesperado al crear el coche",
    }
  }
}
