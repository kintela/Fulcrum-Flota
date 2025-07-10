"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function obtenerCoche(matricula: string) {
  try {
    const { data, error } = await supabase.from("coches").select("*").eq("matricula", matricula).single()

    if (error) {
      console.error("Error fetching coche:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in obtenerCoche:", error)
    return null
  }
}

export async function editarCoche(matricula: string, formData: FormData) {
  try {
    const updateData: any = {
      marca: formData.get("marca"),
      modelo: formData.get("modelo"),
      color: formData.get("color") || null,
      fechamatriculacion: formData.get("fechamatriculacion") || null,
      kms: Number.parseInt(formData.get("kms") as string) || 0,
      kw: formData.get("kw") ? Number.parseInt(formData.get("kw") as string) : null,
      cv: formData.get("cv") ? Number.parseInt(formData.get("cv") as string) : null,
      cc: formData.get("cc") ? Number.parseInt(formData.get("cc") as string) : null,
      combustible: formData.get("combustible") || "Gasolina",
      extras: formData.get("extras") || null,
      donante: formData.get("donante") === "on",
      alquiler: formData.get("alquiler") === "on",
      preciocompra: formData.get("preciocompra") ? Number.parseFloat(formData.get("preciocompra") as string) : null,
      updated_at: new Date().toISOString(),
    }

    // Datos de alquiler
    if (updateData.alquiler) {
      updateData.fecha_inicio = formData.get("fecha_inicio") || null
      updateData.fecha_fin = formData.get("fecha_fin") || null
      updateData.importe_anual = formData.get("importe_anual")
        ? Number.parseFloat(formData.get("importe_anual") as string)
        : null
      updateData.compania = formData.get("compania") || null
      updateData.kms_anuales = formData.get("kms_anuales")
        ? Number.parseInt(formData.get("kms_anuales") as string)
        : null
    }

    // Datos de asignación
    const empleadoId = formData.get("empleado_id")
    updateData.empleado_id = empleadoId && empleadoId !== "0" ? Number.parseInt(empleadoId as string) : null
    updateData.asignadoa = updateData.empleado_id
    updateData.fecha_asignacion = formData.get("fecha_asignacion") || null
    updateData.observaciones_asignacion = formData.get("observaciones_asignacion") || null

    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      console.error("Error updating coche:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)

    return { success: true }
  } catch (error) {
    console.error("Error in editarCoche:", error)
    return { success: false, error: "Error inesperado al actualizar el coche" }
  }
}

export async function guardarSeccionBasica(matricula: string, formData: FormData) {
  try {
    const updateData = {
      marca: formData.get("marca"),
      modelo: formData.get("modelo"),
      color: formData.get("color") || null,
      fechamatriculacion: formData.get("fechamatriculacion") || null,
      kms: Number.parseInt(formData.get("kms") as string) || 0,
      kw: formData.get("kw") ? Number.parseInt(formData.get("kw") as string) : null,
      cv: formData.get("cv") ? Number.parseInt(formData.get("cv") as string) : null,
      cc: formData.get("cc") ? Number.parseInt(formData.get("cc") as string) : null,
      combustible: formData.get("combustible") || "Gasolina",
      extras: formData.get("extras") || null,
      donante: formData.get("donante") === "on",
      alquiler: formData.get("alquiler") === "on",
      preciocompra: formData.get("preciocompra") ? Number.parseFloat(formData.get("preciocompra") as string) : null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      console.error("Error updating basic info:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)

    return { success: true }
  } catch (error) {
    console.error("Error in guardarSeccionBasica:", error)
    return { success: false, error: "Error inesperado al guardar" }
  }
}

export async function guardarSeccionAlquiler(matricula: string, formData: FormData) {
  try {
    const updateData = {
      alquiler: formData.get("alquiler") === "on",
      fecha_inicio: formData.get("fecha_inicio") || null,
      fecha_fin: formData.get("fecha_fin") || null,
      importe_anual: formData.get("importe_anual") ? Number.parseFloat(formData.get("importe_anual") as string) : null,
      compania: formData.get("compania") || null,
      kms_anuales: formData.get("kms_anuales") ? Number.parseInt(formData.get("kms_anuales") as string) : null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      console.error("Error updating rental info:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)

    return { success: true }
  } catch (error) {
    console.error("Error in guardarSeccionAlquiler:", error)
    return { success: false, error: "Error inesperado al guardar" }
  }
}

export async function guardarSeccionAsignacion(matricula: string, formData: FormData) {
  try {
    const empleadoId = formData.get("empleado_id")
    const updateData = {
      empleado_id: empleadoId && empleadoId !== "0" ? Number.parseInt(empleadoId as string) : null,
      asignadoa: empleadoId && empleadoId !== "0" ? Number.parseInt(empleadoId as string) : null,
      fecha_asignacion: formData.get("fecha_asignacion") || null,
      observaciones_asignacion: formData.get("observaciones_asignacion") || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      console.error("Error updating assignment info:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)

    return { success: true }
  } catch (error) {
    console.error("Error in guardarSeccionAsignacion:", error)
    return { success: false, error: "Error inesperado al guardar" }
  }
}

export async function guardarUbicacion(
  matricula: string,
  ubicacion: {
    latitud: number
    longitud: number
    direccion_actual: string
  },
) {
  try {
    const updateData = {
      latitud: ubicacion.latitud,
      longitud: ubicacion.longitud,
      direccion_actual: ubicacion.direccion_actual,
      ultima_ubicacion: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      console.error("Error updating location:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)
    revalidatePath("/") // Dashboard

    return { success: true }
  } catch (error) {
    console.error("Error in guardarUbicacion:", error)
    return { success: false, error: "Error inesperado al guardar ubicación" }
  }
}

export async function eliminarUbicacion(matricula: string) {
  try {
    const updateData = {
      latitud: null,
      longitud: null,
      direccion_actual: null,
      ultima_ubicacion: null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      console.error("Error deleting location:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)
    revalidatePath("/") // Dashboard

    return { success: true }
  } catch (error) {
    console.error("Error in eliminarUbicacion:", error)
    return { success: false, error: "Error inesperado al eliminar ubicación" }
  }
}
