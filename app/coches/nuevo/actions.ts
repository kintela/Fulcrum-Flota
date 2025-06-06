"use server"

import { supabase } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function crearCoche(formData: FormData) {
  try {
    // Extraer datos del formulario según la estructura real de la tabla
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
