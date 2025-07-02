"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { asignarTarjetaViat } from "@/app/actions/viats"

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
  viat_id?: number | null
  observaciones_viat?: string
  alquiler?: boolean
  fecha_inicio_alquiler?: string
  fecha_fin_alquiler?: string
  importe_anual?: string
  compania?: string
  kms_anuales?: string
}

export async function crearCoche(cocheData: CocheData) {
  try {
    // Validar campos obligatorios
    if (!cocheData.matricula || !cocheData.marca || !cocheData.modelo) {
      return {
        success: false,
        error: "Los campos matrícula, marca y modelo son obligatorios",
      }
    }

    // Verificar que la matrícula no exista ya
    const { data: cocheExistente, error: existeError } = await supabase
      .from("coches")
      .select("matricula")
      .eq("matricula", cocheData.matricula.toUpperCase())
      .single()

    if (existeError && existeError.code !== "PGRST116") {
      console.error("Error al verificar matrícula:", existeError)
      return {
        success: false,
        error: "Error al verificar la matrícula",
      }
    }

    if (cocheExistente) {
      return {
        success: false,
        error: "Ya existe un coche con esta matrícula",
      }
    }

    // Preparar datos para insertar
    const datosInsert = {
      matricula: cocheData.matricula.toUpperCase(),
      marca: cocheData.marca,
      modelo: cocheData.modelo,
      color: cocheData.color || null,
      año: cocheData.año || null,
      kilometros: cocheData.kilometros || null,
      combustible: cocheData.combustible,
      empleado_id: cocheData.empleado_id || null,
      fecha_compra: cocheData.fecha_compra || null,
      precio_compra: cocheData.precio_compra || null,
      observaciones: cocheData.observaciones || null,
      extras: cocheData.extras || null,
      alquiler: cocheData.alquiler || false,
      activo: true,
    }

    // Crear el coche
    const { data: nuevoCoche, error: errorCoche } = await supabase
      .from("coches")
      .insert([datosInsert])
      .select()
      .single()

    if (errorCoche) {
      console.error("Error al crear coche:", errorCoche)
      return {
        success: false,
        error: `Error al crear el coche: ${errorCoche.message}`,
      }
    }

    // Si es un vehículo de alquiler, insertar datos en la tabla alquileres
    if (
      cocheData.alquiler &&
      (cocheData.fecha_inicio_alquiler ||
        cocheData.fecha_fin_alquiler ||
        cocheData.importe_anual ||
        cocheData.compania ||
        cocheData.kms_anuales)
    ) {
      const datosAlquiler = {
        matricula: cocheData.matricula.toUpperCase(),
        fecha_inicio: cocheData.fecha_inicio_alquiler || null,
        fecha_fin: cocheData.fecha_fin_alquiler || null,
        importe_anual: cocheData.importe_anual ? Number.parseFloat(cocheData.importe_anual) : null,
        compania: cocheData.compania || null,
        kms_anuales: cocheData.kms_anuales ? Number.parseInt(cocheData.kms_anuales) : null,
      }

      const { error: errorAlquiler } = await supabase.from("alquileres").insert([datosAlquiler])

      if (errorAlquiler) {
        console.error("Error al crear datos de alquiler:", errorAlquiler)
        // No fallar la creación del coche por esto, solo advertir
        console.warn("El coche se creó pero no se pudieron guardar los datos del alquiler")
      }
    }

    // Si hay una tarjeta ViaT seleccionada y un empleado asignado, crear la relación
    if (cocheData.viat_id && cocheData.empleado_id) {
      const resultadoViat = await asignarTarjetaViat(
        cocheData.empleado_id,
        cocheData.viat_id,
        cocheData.observaciones_viat,
      )

      if (!resultadoViat.success) {
        console.warn("Error al asignar tarjeta ViaT:", resultadoViat.error)
        // No fallar la creación del coche por esto, solo advertir
      }
    }

    revalidatePath("/coches")
    return {
      success: true,
      data: nuevoCoche,
    }
  } catch (error) {
    console.error("Error en crearCoche:", error)
    return {
      success: false,
      error: "Error inesperado al crear el coche",
    }
  }
}
