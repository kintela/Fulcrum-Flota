"use server"

import { supabaseServer as supabase } from "@/lib/supabase-server"
import { autorizarAdmin, autorizarLecturaCoche } from "@/lib/autorizacion"

export async function obtenerMantenimientosPorMatricula(matricula: string) {
  // Spec 017: administrador o usuario relacionado con el coche.
  const acceso = await autorizarLecturaCoche(matricula)
  if (!acceso.ok) return { success: false, error: acceso.error }

  try {
    const { data, error } = await supabase
      .from("mantenimientos")
      .select("*")
      .eq("matricula", matricula)
      .order("fecha_mantenimiento", { ascending: false })

    if (error) {
      console.error("Error al obtener mantenimientos:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error al obtener mantenimientos:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

export async function crearMantenimiento(formData: FormData) {
  // Spec 017: solo administradores.
  const acceso = await autorizarAdmin()
  if (!acceso.ok) return { success: false, error: acceso.error }

  try {
    const matricula = (formData.get("matricula") as string) || ""
    const fecha_mantenimiento = (formData.get("fecha_mantenimiento") as string) || ""
    const fecha_proximo = (formData.get("fecha_proximo") as string) || ""
    const kms_proximo_raw = (formData.get("kms_proximo") as string) || ""

    if (!matricula || !fecha_mantenimiento || !fecha_proximo || !kms_proximo_raw) {
      return { success: false, error: "Faltan campos obligatorios" }
    }

    const mantenimientoData: any = {
      matricula,
      fecha_mantenimiento,
      fecha_proximo,
      kms_proximo: Number.parseInt(kms_proximo_raw, 10),
    }

    const importe = formData.get("importe") as string
    if (importe) {
      mantenimientoData.importe = Number.parseFloat(importe)
    }

    const kms_mantenimiento = formData.get("kms_mantenimiento") as string
    if (kms_mantenimiento) {
      mantenimientoData.kms_mantenimiento = Number.parseInt(kms_mantenimiento, 10)
    }

    const taller = formData.get("taller") as string
    if (taller) {
      mantenimientoData.taller = taller
    }

    const observaciones = formData.get("observaciones") as string
    if (observaciones) {
      mantenimientoData.observaciones = observaciones
    }

    const { data, error } = await supabase.from("mantenimientos").insert([mantenimientoData]).select()

    if (error) {
      console.error("Error al crear mantenimiento:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data[0] }
  } catch (error) {
    console.error("Error al crear mantenimiento:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

export async function actualizarMantenimiento(id: number, formData: FormData) {
  // Spec 017: solo administradores.
  const acceso = await autorizarAdmin()
  if (!acceso.ok) return { success: false, error: acceso.error }

  try {
    const fecha_mantenimiento = (formData.get("fecha_mantenimiento") as string) || ""
    const fecha_proximo = (formData.get("fecha_proximo") as string) || ""
    const kms_proximo_raw = (formData.get("kms_proximo") as string) || ""

    if (!fecha_mantenimiento || !fecha_proximo || !kms_proximo_raw) {
      return { success: false, error: "Faltan campos obligatorios" }
    }

    const mantenimientoData: any = {
      fecha_mantenimiento,
      fecha_proximo,
      kms_proximo: Number.parseInt(kms_proximo_raw, 10),
    }

    const importe = formData.get("importe") as string
    mantenimientoData.importe = importe ? Number.parseFloat(importe) : null

    const kms_mantenimiento = formData.get("kms_mantenimiento") as string
    mantenimientoData.kms_mantenimiento = kms_mantenimiento ? Number.parseInt(kms_mantenimiento, 10) : null

    const taller = formData.get("taller") as string
    mantenimientoData.taller = taller ? taller : null

    const observaciones = formData.get("observaciones") as string
    mantenimientoData.observaciones = observaciones ? observaciones : null

    const { data, error } = await supabase.from("mantenimientos").update(mantenimientoData).eq("id", id).select()

    if (error) {
      console.error("Error al actualizar mantenimiento:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data[0] }
  } catch (error) {
    console.error("Error al actualizar mantenimiento:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

export async function eliminarMantenimiento(id: number) {
  // Spec 017: solo administradores.
  const acceso = await autorizarAdmin()
  if (!acceso.ok) return { success: false, error: acceso.error }

  try {
    const { error } = await supabase.from("mantenimientos").delete().eq("id", id)

    if (error) {
      console.error("Error al eliminar mantenimiento:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error al eliminar mantenimiento:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}
