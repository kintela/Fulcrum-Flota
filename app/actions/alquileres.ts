"use server"

import { revalidatePath } from "next/cache"
import { supabaseServer as supabase } from "@/lib/supabase-server"

function toUpperMatricula(value: FormDataEntryValue | null) {
  return (typeof value === "string" ? value : "").trim().toUpperCase()
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number.parseFloat(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

function parseOptionalInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number.parseInt(trimmed, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function parseRequiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : ""
}

function validateFechas(fechaInicio: string, fechaFin: string) {
  if (!fechaInicio || !fechaFin) {
    return "Las fechas de inicio y fin son obligatorias"
  }

  const inicio = new Date(fechaInicio)
  const fin = new Date(fechaFin)

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
    return "Las fechas no son válidas"
  }

  if (fin <= inicio) {
    return "La fecha fin debe ser posterior a la fecha inicio"
  }

  return null
}

function revalidateAlquilerPaths(matricula: string) {
  if (!matricula) return
  revalidatePath("/")
  revalidatePath("/coches")
  revalidatePath(`/coches/detalle/${matricula}`)
  revalidatePath(`/coches/editar/${matricula}`)
}

export async function obtenerAlquileresPorMatricula(matricula: string) {
  try {
    const matriculaNormalizada = matricula?.trim().toUpperCase()
    if (!matriculaNormalizada) {
      return { success: false as const, error: "Matrícula no válida" }
    }

    const { data, error } = await supabase
      .from("alquileres")
      .select("*")
      .eq("matricula", matriculaNormalizada)
      .order("activo", { ascending: false })
      .order("fecha_fin", { ascending: false })
      .order("id", { ascending: false })

    if (error) {
      console.error("Error al obtener alquileres:", error)
      return { success: false as const, error: error.message }
    }

    return { success: true as const, data: data || [] }
  } catch (error) {
    console.error("Error al obtener alquileres:", error)
    return { success: false as const, error: "Error interno del servidor" }
  }
}

export async function crearAlquiler(formData: FormData) {
  try {
    const matricula = toUpperMatricula(formData.get("matricula"))
    const fecha_inicio = parseRequiredText(formData.get("fecha_inicio"))
    const fecha_fin = parseRequiredText(formData.get("fecha_fin"))
    const compania = parseRequiredText(formData.get("compania"))
    const importe_anual = parseOptionalNumber(formData.get("importe_anual"))

    if (!matricula) {
      return { success: false as const, error: "Matrícula no válida" }
    }

    const errorFechas = validateFechas(fecha_inicio, fecha_fin)
    if (errorFechas) {
      return { success: false as const, error: errorFechas }
    }

    if (!compania) {
      return { success: false as const, error: "La compañía es obligatoria" }
    }

    if (importe_anual === null) {
      return { success: false as const, error: "El importe anual es obligatorio" }
    }

    const alquilerData = {
      matricula,
      fecha_inicio,
      fecha_fin,
      importe_anual,
      compania,
      kms_anuales: parseOptionalInteger(formData.get("kms_anuales")),
      numero_contrato: parseRequiredText(formData.get("numero_contrato")) || null,
      observaciones: parseRequiredText(formData.get("observaciones")) || null,
      activo: formData.get("activo") === "on",
    }

    const { data, error } = await supabase.from("alquileres").insert([alquilerData]).select().single()

    if (error) {
      console.error("Error al crear alquiler:", error)
      return { success: false as const, error: error.message }
    }

    revalidateAlquilerPaths(matricula)

    return { success: true as const, data }
  } catch (error) {
    console.error("Error al crear alquiler:", error)
    return { success: false as const, error: "Error interno del servidor" }
  }
}

export async function actualizarAlquiler(id: number, formData: FormData) {
  try {
    const fecha_inicio = parseRequiredText(formData.get("fecha_inicio"))
    const fecha_fin = parseRequiredText(formData.get("fecha_fin"))
    const compania = parseRequiredText(formData.get("compania"))
    const importe_anual = parseOptionalNumber(formData.get("importe_anual"))
    const matricula = toUpperMatricula(formData.get("matricula"))

    const errorFechas = validateFechas(fecha_inicio, fecha_fin)
    if (errorFechas) {
      return { success: false as const, error: errorFechas }
    }

    if (!compania) {
      return { success: false as const, error: "La compañía es obligatoria" }
    }

    if (importe_anual === null) {
      return { success: false as const, error: "El importe anual es obligatorio" }
    }

    const alquilerData = {
      fecha_inicio,
      fecha_fin,
      compania,
      importe_anual,
      kms_anuales: parseOptionalInteger(formData.get("kms_anuales")),
      numero_contrato: parseRequiredText(formData.get("numero_contrato")) || null,
      observaciones: parseRequiredText(formData.get("observaciones")) || null,
      activo: formData.get("activo") === "on",
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("alquileres").update(alquilerData).eq("id", id).select().single()

    if (error) {
      console.error("Error al actualizar alquiler:", error)
      return { success: false as const, error: error.message }
    }

    revalidateAlquilerPaths(matricula || data?.matricula || "")

    return { success: true as const, data }
  } catch (error) {
    console.error("Error al actualizar alquiler:", error)
    return { success: false as const, error: "Error interno del servidor" }
  }
}

export async function eliminarAlquiler(id: number, matricula?: string) {
  try {
    const { error } = await supabase.from("alquileres").delete().eq("id", id)

    if (error) {
      console.error("Error al eliminar alquiler:", error)
      return { success: false as const, error: error.message }
    }

    if (matricula) {
      revalidateAlquilerPaths(matricula.trim().toUpperCase())
    }

    return { success: true as const }
  } catch (error) {
    console.error("Error al eliminar alquiler:", error)
    return { success: false as const, error: "Error interno del servidor" }
  }
}
