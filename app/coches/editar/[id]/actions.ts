"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

interface EditarCocheResult {
  success: boolean
  error?: string
}

export async function obtenerCoche(matricula: string) {
  try {
    const { data, error } = await supabase.from("coches").select("*").eq("matricula", matricula).single()

    if (error) {
      console.error("Error obteniendo coche:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error inesperado obteniendo coche:", error)
    return null
  }
}

export async function editarCoche(matricula: string, formData: FormData): Promise<EditarCocheResult> {
  try {
    const marca = formData.get("marca") as string
    const modelo = formData.get("modelo") as string
    const color = formData.get("color") as string
    const fechamatriculacion = formData.get("fechamatriculacion") as string
    const kms = Number.parseInt(formData.get("kms") as string) || 0
    const kw = formData.get("kw") ? Number.parseInt(formData.get("kw") as string) : null
    const cv = formData.get("cv") ? Number.parseInt(formData.get("cv") as string) : null
    const cc = formData.get("cc") ? Number.parseInt(formData.get("cc") as string) : null
    const combustible = formData.get("combustible") as string
    const extras = formData.get("extras") as string
    const donante = formData.get("donante") === "on"
    const alquiler = formData.get("alquiler") === "on"
    const preciocompra = formData.get("preciocompra") ? Number.parseFloat(formData.get("preciocompra") as string) : null

    // Datos de alquiler
    const fecha_inicio = formData.get("fecha_inicio") as string
    const fecha_fin = formData.get("fecha_fin") as string
    const importe_anual = formData.get("importe_anual")
      ? Number.parseFloat(formData.get("importe_anual") as string)
      : null
    const compania = formData.get("compania") as string
    const kms_anuales = formData.get("kms_anuales") ? Number.parseInt(formData.get("kms_anuales") as string) : null

    // Datos de asignación
    const empleado_id = formData.get("empleado_id") ? Number.parseInt(formData.get("empleado_id") as string) : null
    const fecha_asignacion = formData.get("fecha_asignacion") as string
    const observaciones_asignacion = formData.get("observaciones_asignacion") as string

    const updateData: any = {
      marca,
      modelo,
      color: color || null,
      fechamatriculacion: fechamatriculacion || null,
      kms,
      kw,
      cv,
      cc,
      combustible,
      extras: extras || null,
      donante,
      alquiler,
      preciocompra,
      empleado_id: empleado_id === 0 ? null : empleado_id,
      fecha_asignacion: fecha_asignacion || null,
      observaciones_asignacion: observaciones_asignacion || null,
      updated_at: new Date().toISOString(),
    }

    // Solo agregar campos de alquiler si es un vehículo de alquiler
    if (alquiler) {
      updateData.fecha_inicio = fecha_inicio || null
      updateData.fecha_fin = fecha_fin || null
      updateData.importe_anual = importe_anual
      updateData.compania = compania || null
      updateData.kms_anuales = kms_anuales
    }

    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      console.error("Error actualizando coche:", error)
      return {
        success: false,
        error: `Error al actualizar el coche: ${error.message}`,
      }
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/editar/${matricula}`)
    revalidatePath(`/coches/detalle/${matricula}`)

    return { success: true }
  } catch (error) {
    console.error("Error inesperado editando coche:", error)
    return {
      success: false,
      error: "Error inesperado al actualizar el coche",
    }
  }
}

export async function guardarSeccionBasica(matricula: string, formData: FormData): Promise<EditarCocheResult> {
  try {
    const marca = formData.get("marca") as string
    const modelo = formData.get("modelo") as string
    const color = formData.get("color") as string
    const fechamatriculacion = formData.get("fechamatriculacion") as string
    const kms = Number.parseInt(formData.get("kms") as string) || 0
    const kw = formData.get("kw") ? Number.parseInt(formData.get("kw") as string) : null
    const cv = formData.get("cv") ? Number.parseInt(formData.get("cv") as string) : null
    const cc = formData.get("cc") ? Number.parseInt(formData.get("cc") as string) : null
    const combustible = formData.get("combustible") as string
    const extras = formData.get("extras") as string
    const donante = formData.get("donante") === "on"
    const alquiler = formData.get("alquiler") === "on"
    const preciocompra = formData.get("preciocompra") ? Number.parseFloat(formData.get("preciocompra") as string) : null

    const { error } = await supabase
      .from("coches")
      .update({
        marca,
        modelo,
        color: color || null,
        fechamatriculacion: fechamatriculacion || null,
        kms,
        kw,
        cv,
        cc,
        combustible,
        extras: extras || null,
        donante,
        alquiler,
        preciocompra,
        updated_at: new Date().toISOString(),
      })
      .eq("matricula", matricula)

    if (error) {
      console.error("Error guardando sección básica:", error)
      return {
        success: false,
        error: `Error al guardar información básica: ${error.message}`,
      }
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/editar/${matricula}`)

    return { success: true }
  } catch (error) {
    console.error("Error inesperado guardando sección básica:", error)
    return {
      success: false,
      error: "Error inesperado al guardar información básica",
    }
  }
}

export async function guardarSeccionAlquiler(matricula: string, formData: FormData): Promise<EditarCocheResult> {
  try {
    const alquiler = formData.get("alquiler") === "on"
    const fecha_inicio = formData.get("fecha_inicio") as string
    const fecha_fin = formData.get("fecha_fin") as string
    const importe_anual = formData.get("importe_anual")
      ? Number.parseFloat(formData.get("importe_anual") as string)
      : null
    const compania = formData.get("compania") as string
    const kms_anuales = formData.get("kms_anuales") ? Number.parseInt(formData.get("kms_anuales") as string) : null

    const { error } = await supabase
      .from("coches")
      .update({
        alquiler,
        fecha_inicio: fecha_inicio || null,
        fecha_fin: fecha_fin || null,
        importe_anual,
        compania: compania || null,
        kms_anuales,
        updated_at: new Date().toISOString(),
      })
      .eq("matricula", matricula)

    if (error) {
      console.error("Error guardando sección alquiler:", error)
      return {
        success: false,
        error: `Error al guardar datos del alquiler: ${error.message}`,
      }
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/editar/${matricula}`)

    return { success: true }
  } catch (error) {
    console.error("Error inesperado guardando sección alquiler:", error)
    return {
      success: false,
      error: "Error inesperado al guardar datos del alquiler",
    }
  }
}

export async function guardarSeccionAsignacion(matricula: string, formData: FormData): Promise<EditarCocheResult> {
  try {
    const empleado_id = formData.get("empleado_id") ? Number.parseInt(formData.get("empleado_id") as string) : null
    const fecha_asignacion = formData.get("fecha_asignacion") as string
    const observaciones_asignacion = formData.get("observaciones_asignacion") as string

    const { error } = await supabase
      .from("coches")
      .update({
        empleado_id: empleado_id === 0 ? null : empleado_id,
        fecha_asignacion: fecha_asignacion || null,
        observaciones_asignacion: observaciones_asignacion || null,
        updated_at: new Date().toISOString(),
      })
      .eq("matricula", matricula)

    if (error) {
      console.error("Error guardando sección asignación:", error)
      return {
        success: false,
        error: `Error al guardar asignación: ${error.message}`,
      }
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/editar/${matricula}`)

    return { success: true }
  } catch (error) {
    console.error("Error inesperado guardando sección asignación:", error)
    return {
      success: false,
      error: "Error inesperado al guardar asignación",
    }
  }
}

export async function guardarUbicacion(
  matricula: string,
  ubicacion: { latitud: number; longitud: number; direccion_actual: string },
): Promise<EditarCocheResult> {
  try {
    const { error } = await supabase
      .from("coches")
      .update({
        latitud: ubicacion.latitud,
        longitud: ubicacion.longitud,
        direccion_actual: ubicacion.direccion_actual,
        ultima_ubicacion: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("matricula", matricula)

    if (error) {
      console.error("Error guardando ubicación:", error)
      return {
        success: false,
        error: `Error al guardar ubicación: ${error.message}`,
      }
    }

    revalidatePath("/")
    revalidatePath("/coches")
    revalidatePath(`/coches/editar/${matricula}`)

    return { success: true }
  } catch (error) {
    console.error("Error inesperado guardando ubicación:", error)
    return {
      success: false,
      error: "Error inesperado al guardar ubicación",
    }
  }
}

export async function eliminarUbicacion(matricula: string): Promise<EditarCocheResult> {
  try {
    const { error } = await supabase
      .from("coches")
      .update({
        latitud: null,
        longitud: null,
        direccion_actual: null,
        ultima_ubicacion: null,
        updated_at: new Date().toISOString(),
      })
      .eq("matricula", matricula)

    if (error) {
      console.error("Error eliminando ubicación:", error)
      return {
        success: false,
        error: `Error al eliminar ubicación: ${error.message}`,
      }
    }

    revalidatePath("/")
    revalidatePath("/coches")
    revalidatePath(`/coches/editar/${matricula}`)

    return { success: true }
  } catch (error) {
    console.error("Error inesperado eliminando ubicación:", error)
    return {
      success: false,
      error: "Error inesperado al eliminar ubicación",
    }
  }
}
