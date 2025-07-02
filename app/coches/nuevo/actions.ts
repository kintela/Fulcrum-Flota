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
    const kw = formData.get("kw") as string
    const cv = formData.get("cv") as string
    const cc = formData.get("cc") as string
    const combustible = formData.get("combustible") as string
    const extras = formData.get("extras") as string
    const donante = formData.get("donante") === "on"
    const alquiler = formData.get("alquiler") === "on"
    const preciocompra = formData.get("preciocompra") as string
    const empleadoId = formData.get("empleado_id") as string
    const fechaAsignacion = formData.get("fecha_asignacion") as string
    const observacionesAsignacion = formData.get("observaciones_asignacion") as string

    // Verificar si la matrícula ya existe
    const { data: existingCoche } = await supabase
      .from("coches")
      .select("matricula")
      .eq("matricula", matricula.toUpperCase())
      .single()

    if (existingCoche) {
      return {
        success: false,
        error: "Ya existe un coche con esta matrícula",
      }
    }

    const cocheData: CocheData = {
      matricula: matricula.toUpperCase(),
      marca,
      modelo,
      color: color || null,
      fechamatriculacion: fechamatriculacion || null,
      kms,
      kw: kw && kw.trim() !== "" ? Number.parseInt(kw) : null,
      cv: cv && cv.trim() !== "" ? Number.parseInt(cv) : null,
      cc: cc && cc.trim() !== "" ? Number.parseInt(cc) : null,
      combustible,
      extras: extras || null,
      donante,
      alquiler,
      preciocompra: preciocompra && preciocompra.trim() !== "" ? Number.parseFloat(preciocompra) : null,
      empleado_id: empleadoId && empleadoId !== "0" ? Number.parseInt(empleadoId) : null,
      fecha_asignacion: fechaAsignacion || null,
      observaciones_asignacion: observacionesAsignacion || null,
    }

    // Crear el coche
    const { error: cocheError } = await supabase.from("coches").insert([cocheData])

    if (cocheError) {
      console.error("Error al crear coche:", cocheError)
      return {
        success: false,
        error: "Error al crear el coche: " + cocheError.message,
      }
    }

    // Si es un vehículo de alquiler, crear los datos del alquiler
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

      const { error: alquilerError } = await supabase.from("alquileres").insert([alquilerData])

      if (alquilerError) {
        console.error("Error al crear datos de alquiler:", alquilerError)
        // Eliminar el coche si falla la creación del alquiler
        await supabase.from("coches").delete().eq("matricula", matricula.toUpperCase())
        return {
          success: false,
          error: "Error al crear datos de alquiler: " + alquilerError.message,
        }
      }
    }

    revalidatePath("/coches")
    return {
      success: true,
      message: "Coche creado correctamente",
    }
  } catch (error) {
    console.error("Error inesperado:", error)
    return {
      success: false,
      error: "Error inesperado al crear el coche",
    }
  }
}
