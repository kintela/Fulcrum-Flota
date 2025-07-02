"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

interface CocheData {
  matricula: string
  marca: string
  modelo: string
  color: string
  combustible: string
  fecha_matriculacion: string
  kms: number
  precio_compra: number
  fecha_compra: string
  observaciones?: string
  vehiculo_alquiler: boolean
  fecha_inicio?: string
  fecha_fin?: string
  importe_anual?: number
  compania?: string
  kms_anuales?: number
}

export async function crearCoche(formData: FormData) {
  try {
    const vehiculoAlquiler = formData.get("vehiculo_alquiler") === "on"

    const cocheData: CocheData = {
      matricula: formData.get("matricula") as string,
      marca: formData.get("marca") as string,
      modelo: formData.get("modelo") as string,
      color: formData.get("color") as string,
      combustible: formData.get("combustible") as string,
      fecha_matriculacion: formData.get("fecha_matriculacion") as string,
      kms: Number.parseInt(formData.get("kms") as string),
      precio_compra: Number.parseFloat(formData.get("precio_compra") as string),
      fecha_compra: formData.get("fecha_compra") as string,
      observaciones: (formData.get("observaciones") as string) || "",
      vehiculo_alquiler: vehiculoAlquiler,
    }

    // Crear el coche
    const { data: coche, error: cocheError } = await supabase.from("coches").insert([cocheData]).select().single()

    if (cocheError) {
      console.error("Error al crear coche:", cocheError)
      throw new Error("Error al crear el coche")
    }

    // Si es vehículo de alquiler, crear los datos del alquiler
    if (vehiculoAlquiler) {
      const fechaInicio = formData.get("fecha_inicio") as string
      const fechaFin = formData.get("fecha_fin") as string
      const importeAnual = formData.get("importe_anual") as string
      const compania = formData.get("compania") as string
      const kmsAnuales = formData.get("kms_anuales") as string

      const alquilerData = {
        matricula: cocheData.matricula,
        fecha_inicio: fechaInicio && fechaInicio.trim() !== "" ? fechaInicio : null,
        fecha_fin: fechaFin && fechaFin.trim() !== "" ? fechaFin : null,
        importe_anual: importeAnual && importeAnual.trim() !== "" ? Number.parseFloat(importeAnual) : null,
        compania: compania && compania.trim() !== "" ? compania : null,
        kms_anuales: kmsAnuales && kmsAnuales.trim() !== "" ? Number.parseInt(kmsAnuales) : null,
      }

      const { error: alquilerError } = await supabase.from("alquileres").insert([alquilerData])

      if (alquilerError) {
        console.error("Error al crear datos de alquiler:", alquilerError)
        throw new Error("Error al crear los datos del alquiler")
      }
    }

    revalidatePath("/coches")
    return { success: true, message: "Coche creado exitosamente" }
  } catch (error) {
    console.error("Error:", error)
    return { success: false, message: "Error al crear el coche" }
  }
}
