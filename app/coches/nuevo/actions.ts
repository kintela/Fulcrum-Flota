"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

interface CocheData {
  matricula: string
  marca: string
  modelo: string
  color?: string
  fechamatriculacion?: string
  kms: number
  kw?: number
  cv?: number
  cc?: number
  combustible: string
  extras?: string
  donante: boolean
  alquiler: boolean
  preciocompra?: number
  empleado_id?: number
  fecha_asignacion?: string
  observaciones_asignacion?: string
  fecha_inicio?: string
  fecha_fin?: string
  importe_anual?: number
  compania?: string
  kms_anuales?: number
}

export async function crearCoche(formData: FormData) {
  try {
    const matricula = formData.get("matricula") as string
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
    const empleado_id = formData.get("empleado_id") ? Number.parseInt(formData.get("empleado_id") as string) : null
    const fecha_asignacion = formData.get("fecha_asignacion") as string
    const observaciones_asignacion = formData.get("observaciones_asignacion") as string

    // Verificar si la matrícula ya existe
    const { data: existingCoche, error: checkError } = await supabase
      .from("coches")
      .select("matricula")
      .eq("matricula", matricula.toUpperCase())
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error al verificar matrícula:", checkError)
      return { success: false, error: "Error al verificar la matrícula" }
    }

    if (existingCoche) {
      return { success: false, error: "Ya existe un coche con esta matrícula" }
    }

    // Crear el coche
    const cocheData: any = {
      matricula: matricula.toUpperCase(),
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
    }

    const { data: nuevoCoche, error: cocheError } = await supabase.from("coches").insert(cocheData).select().single()

    if (cocheError) {
      console.error("Error al crear coche:", cocheError)
      return { success: false, error: "Error al crear el coche" }
    }

    // Si es un vehículo de alquiler, crear registro en tabla alquileres
    if (alquiler) {
      const fechaInicio = formData.get("fecha_inicio") as string
      const fechaFin = formData.get("fecha_fin") as string
      const importeAnual = formData.get("importe_anual") as string
      const compania = formData.get("compania") as string
      const kmsAnuales = formData.get("kms_anuales") as string

      const alquilerData = {
        matricula: matricula.toUpperCase(),
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        importe_anual: importeAnual && importeAnual.trim() !== "" ? Number.parseFloat(importeAnual) : null,
        compania: compania || null,
        kms_anuales: kmsAnuales && kmsAnuales.trim() !== "" ? Number.parseInt(kmsAnuales) : null,
      }

      const { error: alquilerError } = await supabase.from("alquileres").insert(alquilerData)

      if (alquilerError) {
        console.error("Error al crear datos de alquiler:", alquilerError)
        // No fallar completamente, solo advertir
        return {
          success: true,
          warning: "Coche creado pero hubo un error al guardar los datos del alquiler",
        }
      }
    }

    revalidatePath("/coches")
    return { success: true, message: "Coche creado exitosamente" }
  } catch (error) {
    console.error("Error inesperado:", error)
    return { success: false, error: "Error inesperado al crear el coche" }
  }
}
