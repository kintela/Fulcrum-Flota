"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function editarCoche(id: string, formData: FormData) {
  try {
    // Extraer datos del formulario
    const cocheData = {
      matricula: formData.get("matricula") as string,
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
      asignadoa: (formData.get("asignadoa") as string) || null,
      alquiler: formData.get("alquiler") === "on",
      preciocompra: formData.get("preciocompra") ? Number.parseFloat(formData.get("preciocompra") as string) : null,
    }

    // Validaciones básicas
    if (!cocheData.matricula || !cocheData.marca || !cocheData.modelo) {
      return {
        success: false,
        error: "Los campos matrícula, marca y modelo son obligatorios",
      }
    }

    // Actualizar en Supabase usando matricula como clave primaria
    const { data, error } = await supabase.from("coches").update(cocheData).eq("matricula", id).select()

    if (error) {
      console.error("Error al actualizar coche:", error)
      return {
        success: false,
        error: `Error al actualizar el coche: ${error.message}`,
      }
    }

    console.log("Coche actualizado exitosamente:", data)

    // Revalidar las páginas relevantes
    revalidatePath("/coches")
    revalidatePath(`/coches/${id}`)

    return {
      success: true,
      data: data[0],
    }
  } catch (error) {
    console.error("Error en editarCoche:", error)
    return {
      success: false,
      error: "Error inesperado al actualizar el coche",
    }
  }
}

export async function obtenerCoche(id: string) {
  if (!id || id === "undefined") {
    return null
  }

  try {
    // Usar matricula como clave primaria
    const { data, error } = await supabase.from("coches").select("*").eq("matricula", id).single()

    if (error) {
      console.error("Error al obtener coche:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error en obtenerCoche:", error)
    return null
  }
}
