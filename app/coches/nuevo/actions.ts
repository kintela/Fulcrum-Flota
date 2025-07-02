"use server"

import { createClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

interface CocheData {
  matricula: string
  marca: string
  modelo: string
  color?: string
  año?: number | null
  kilometros?: number | null
  combustible: string
  empleado_id?: number | null
  fecha_compra?: string
  precio_compra?: number | null
  observaciones?: string
  extras?: string
  alquiler?: boolean
  fecha_inicio_alquiler?: string
  fecha_fin_alquiler?: string
  importe_anual?: string
  compania?: string
  kms_anuales?: string
  viat_id?: number | null
  observaciones_viat?: string
}

export async function crearCoche(data: CocheData) {
  try {
    const supabase = createClient()

    // Verificar si la matrícula ya existe
    const { data: cocheExistente } = await supabase
      .from("coches")
      .select("matricula")
      .eq("matricula", data.matricula.toUpperCase())
      .single()

    if (cocheExistente) {
      return {
        success: false,
        error: "Ya existe un coche con esta matrícula",
      }
    }

    // Crear el coche
    const cocheData = {
      matricula: data.matricula.toUpperCase(),
      marca: data.marca,
      modelo: data.modelo,
      color: data.color || null,
      fechamatriculacion: data.año ? `${data.año}-01-01` : null,
      kms: data.kilometros || 0,
      combustible: data.combustible,
      empleado_id: data.empleado_id || null,
      fecha_compra: data.fecha_compra || null,
      preciocompra: data.precio_compra || null,
      observaciones: data.observaciones || null,
      extras: data.extras || null,
      alquiler: data.alquiler || false,
      donante: false,
      activo: true,
      fecha_asignacion: data.empleado_id ? new Date().toISOString().split("T")[0] : null,
      viat_id: data.viat_id || null,
      observaciones_viat: data.observaciones_viat || null,
    }

    const { data: nuevoCoche, error: errorCoche } = await supabase.from("coches").insert(cocheData).select().single()

    if (errorCoche) {
      console.error("Error al crear coche:", errorCoche)
      return {
        success: false,
        error: "Error al crear el coche en la base de datos",
      }
    }

    // Si es un vehículo de alquiler, crear los datos del alquiler
    if (
      data.alquiler &&
      (data.fecha_inicio_alquiler || data.fecha_fin_alquiler || data.importe_anual || data.compania || data.kms_anuales)
    ) {
      const kmsAnuales = data.kms_anuales as string
      const importeAnual = data.importe_anual as string

      const alquilerData = {
        matricula: data.matricula.toUpperCase(),
        fecha_inicio: data.fecha_inicio_alquiler || null,
        fecha_fin: data.fecha_fin_alquiler || null,
        importe_anual: importeAnual && importeAnual.trim() !== "" ? Number.parseFloat(importeAnual) : null,
        compania: data.compania || null,
        kms_anuales: kmsAnuales && kmsAnuales.trim() !== "" ? Number.parseInt(kmsAnuales) : null,
      }

      const { error: errorAlquiler } = await supabase.from("alquileres").insert(alquilerData)

      if (errorAlquiler) {
        console.error("Error al crear datos de alquiler:", errorAlquiler)
        // No fallar la creación del coche por esto, solo log del error
      }
    }

    revalidatePath("/coches")

    return {
      success: true,
      data: nuevoCoche,
    }
  } catch (error) {
    console.error("Error inesperado:", error)
    return {
      success: false,
      error: "Error inesperado al crear el coche",
    }
  }
}
