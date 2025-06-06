"use server"

import { supabase } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function crearCoche(formData: FormData) {
  try {
    // Extraer datos del formulario
    const cocheData = {
      matricula: formData.get("matricula") as string,
      marca: formData.get("marca") as string,
      modelo: formData.get("modelo") as string,
      color: (formData.get("color") as string) || null,
      anio: formData.get("anio") ? Number.parseInt(formData.get("anio") as string) : null,
      kilometros: formData.get("kilometros") ? Number.parseInt(formData.get("kilometros") as string) : 0,
      combustible: (formData.get("combustible") as string) || null,
      numero_bastidor: (formData.get("numero_bastidor") as string) || null,
      precio_compra: formData.get("precio_compra") ? Number.parseFloat(formData.get("precio_compra") as string) : null,
      fecha_compra: (formData.get("fecha_compra") as string) || null,
      fecha_seguro: (formData.get("fecha_seguro") as string) || null,
      fecha_itv: (formData.get("fecha_itv") as string) || null,
      fecha_revision: (formData.get("fecha_revision") as string) || null,
      es_donante: formData.get("es_donante") === "on",
      es_alquiler: formData.get("es_alquiler") === "on",
      observaciones: (formData.get("observaciones") as string) || null,
      estado: "disponible",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Validaciones básicas
    if (!cocheData.matricula || !cocheData.marca || !cocheData.modelo) {
      throw new Error("Los campos matrícula, marca y modelo son obligatorios")
    }

    // Insertar en Supabase
    const { data, error } = await supabase.from("coches").insert([cocheData]).select()

    if (error) {
      console.error("Error al crear coche:", error)
      throw new Error(`Error al crear el coche: ${error.message}`)
    }

    console.log("Coche creado exitosamente:", data)

    // Revalidar la página de coches para mostrar los nuevos datos
    revalidatePath("/coches")

    // Redirigir a la página de coches
    redirect("/coches")
  } catch (error) {
    console.error("Error en crearCoche:", error)
    throw error
  }
}
