"use server"

import { supabaseServer as supabase } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

// Obtener seguro activo por matrícula
export async function obtenerSeguroActivo(matricula: string) {
  try {
    const { data, error } = await supabase
      .from("seguros")
      .select("*")
      .eq("matricula", matricula)
      .eq("activo", true)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 es "no rows found", que es lo esperado si no hay seguro
      console.error("Error al obtener seguro activo:", error)
      return {
        success: false,
        error: `Error al obtener el seguro: ${error.message}`,
      }
    }

    return {
      success: true,
      data: data || null,
    }
  } catch (error) {
    console.error("Error en obtenerSeguroActivo:", error)
    return {
      success: false,
      error: "Error inesperado al obtener el seguro",
    }
  }
}

// Obtener historial de seguros por matrícula
export async function obtenerHistorialSeguros(matricula: string) {
  try {
    const { data, error } = await supabase
      .from("seguros")
      .select("*")
      .eq("matricula", matricula)
      .order("fecha_contratacion", { ascending: false })

    if (error) {
      console.error("Error al obtener historial de seguros:", error)
      return {
        success: false,
        error: `Error al obtener el historial de seguros: ${error.message}`,
      }
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (error) {
    console.error("Error en obtenerHistorialSeguros:", error)
    return {
      success: false,
      error: "Error inesperado al obtener el historial de seguros",
    }
  }
}

// Crear nuevo seguro
export async function crearSeguro(formData: FormData) {
  try {
    const matricula = formData.get("matricula") as string
    const activo = formData.get("activo") === "on"

    // Si el nuevo seguro es activo, desactivar los seguros activos existentes
    if (activo) {
      await desactivarSegurosActivos(matricula)
    }

    const seguroData = {
      matricula,
      numero_poliza: formData.get("numero_poliza") as string,
      fecha_contratacion: formData.get("fecha_contratacion") as string,
      fecha_vencimiento: formData.get("fecha_vencimiento") as string,
      compania: formData.get("compania") as string,
      tipo: formData.get("tipo") as string,
      importe_anual: formData.get("importe_anual") ? Number.parseFloat(formData.get("importe_anual") as string) : null,
      telefono_asistencia1: formData.get("telefono_asistencia") as string,
      telefono_asistencia2: formData.get("telefono_asistencia2") as string,
      observaciones: formData.get("observaciones") as string,
      activo,
    }

    // Validaciones básicas
    if (
      !seguroData.numero_poliza ||
      !seguroData.fecha_contratacion ||
      !seguroData.fecha_vencimiento ||
      !seguroData.compania
    ) {
      return {
        success: false,
        error: "Los campos número de póliza, fecha de contratación, fecha de vencimiento y compañía son obligatorios",
      }
    }

    // Insertar en Supabase
    const { data, error } = await supabase.from("seguros").insert([seguroData]).select()

    if (error) {
      console.error("Error al crear seguro:", error)
      return {
        success: false,
        error: `Error al crear el seguro: ${error.message}`,
      }
    }

    // Revalidar las páginas relevantes
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)

    return {
      success: true,
      data: data[0],
    }
  } catch (error) {
    console.error("Error en crearSeguro:", error)
    return {
      success: false,
      error: "Error inesperado al crear el seguro",
    }
  }
}

// Actualizar seguro existente
export async function actualizarSeguro(id: number, formData: FormData) {
  try {
    const matricula = formData.get("matricula") as string
    const activo = formData.get("activo") === "on"

    // Si el seguro actualizado es activo, desactivar los demás seguros activos
    if (activo) {
      await desactivarSegurosActivos(matricula, id)
    }

    const seguroData = {
      numero_poliza: formData.get("numero_poliza") as string,
      fecha_contratacion: formData.get("fecha_contratacion") as string,
      fecha_vencimiento: formData.get("fecha_vencimiento") as string,
      compania: formData.get("compania") as string,
      tipo: formData.get("tipo") as string,
      importe_anual: formData.get("importe_anual") ? Number.parseFloat(formData.get("importe_anual") as string) : null,
      telefono_asistencia1: formData.get("telefono_asistencia") as string,
      telefono_asistencia2: formData.get("telefono_asistencia2") as string,
      observaciones: formData.get("observaciones") as string,
      activo,
    }

    // Validaciones básicas
    if (
      !seguroData.numero_poliza ||
      !seguroData.fecha_contratacion ||
      !seguroData.fecha_vencimiento ||
      !seguroData.compania
    ) {
      return {
        success: false,
        error: "Los campos número de póliza, fecha de contratación, fecha de vencimiento y compañía son obligatorios",
      }
    }

    // Actualizar en Supabase
    const { data, error } = await supabase.from("seguros").update(seguroData).eq("id", id).select()

    if (error) {
      console.error("Error al actualizar seguro:", error)
      return {
        success: false,
        error: `Error al actualizar el seguro: ${error.message}`,
      }
    }

    // Revalidar las páginas relevantes
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)

    return {
      success: true,
      data: data[0],
    }
  } catch (error) {
    console.error("Error en actualizarSeguro:", error)
    return {
      success: false,
      error: "Error inesperado al actualizar el seguro",
    }
  }
}

// Eliminar seguro
export async function eliminarSeguro(id: number, matricula: string) {
  try {
    const { error } = await supabase.from("seguros").delete().eq("id", id)

    if (error) {
      console.error("Error al eliminar seguro:", error)
      return {
        success: false,
        error: `Error al eliminar el seguro: ${error.message}`,
      }
    }

    // Revalidar las páginas relevantes
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error en eliminarSeguro:", error)
    return {
      success: false,
      error: "Error inesperado al eliminar el seguro",
    }
  }
}

// Función auxiliar para desactivar seguros activos
async function desactivarSegurosActivos(matricula: string, exceptoId?: number) {
  try {
    let query = supabase.from("seguros").update({ activo: false }).eq("matricula", matricula).eq("activo", true)

    if (exceptoId) {
      query = query.neq("id", exceptoId)
    }

    const { error } = await query

    if (error) {
      console.error("Error al desactivar seguros activos:", error)
    }
  } catch (error) {
    console.error("Error en desactivarSegurosActivos:", error)
  }
}
