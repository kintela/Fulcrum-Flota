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
  asignadoa?: string
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
    const empleadoId = formData.get("empleado_id") as string
    const empleadoIdNum = empleadoId && empleadoId !== "0" ? Number.parseInt(empleadoId) : null

    const cocheData: CocheData = {
      matricula: (formData.get("matricula") as string).toUpperCase(),
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
      asignadoa: empleadoIdNum ? empleadoIdNum.toString() : null,
      alquiler: formData.get("alquiler") === "on",
      preciocompra: formData.get("preciocompra") ? Number.parseFloat(formData.get("preciocompra") as string) : null,
      empleado_id: empleadoIdNum,
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

    // Verificar si la matrícula ya existe
    const { data: cocheExistente, error: errorVerificacion } = await supabase
      .from("coches")
      .select("matricula")
      .eq("matricula", cocheData.matricula)
      .single()

    if (cocheExistente) {
      return {
        success: false,
        error: `Ya existe un coche con la matrícula ${cocheData.matricula}`,
      }
    }

    if (errorVerificacion && errorVerificacion.code !== "PGRST116") {
      console.error("Error al verificar matrícula:", errorVerificacion)
      return {
        success: false,
        error: "Error al verificar la matrícula",
      }
    }

    // Crear el coche en Supabase
    const { data, error } = await supabase.from("coches").insert([cocheData]).select()

    if (error) {
      console.error("Error al crear coche:", error)
      return {
        success: false,
        error: `Error al crear el coche: ${error.message}`,
      }
    }

    // Gestionar datos del alquiler si es un vehículo de alquiler
    if (cocheData.alquiler) {
      const fechaInicio = formData.get("fecha_inicio") as string
      const fechaFin = formData.get("fecha_fin") as string
      const importeAnual = formData.get("importe_anual") as string
      const compania = formData.get("compania") as string
      const kmsAnuales = formData.get("kms_anuales") as string

      const datosAlquiler = {
        matricula: cocheData.matricula,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        importe_anual: importeAnual && importeAnual.trim() !== "" ? Number.parseFloat(importeAnual) : null,
        compania: compania && compania.trim() !== "" ? compania : null,
        kms_anuales: kmsAnuales && kmsAnuales.trim() !== "" ? Number.parseInt(kmsAnuales) : null,
      }

      const { error: errorAlquiler } = await supabase.from("alquileres").insert([datosAlquiler])

      if (errorAlquiler) {
        console.error("Error al crear datos de alquiler:", errorAlquiler)
        // No retornamos error aquí para no bloquear la creación del coche
      }
    }

    // Revalidar las páginas relevantes
    revalidatePath("/coches")
    revalidatePath("/")

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
