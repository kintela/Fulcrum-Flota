"use server"

import { createClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function editarCoche(formData: FormData) {
  try {
    const matricula = formData.get("matricula") as string
    const marca = formData.get("marca") as string
    const modelo = formData.get("modelo") as string
    const año = formData.get("año") as string
    const color = formData.get("color") as string
    const kilometraje = formData.get("kilometraje") as string
    const combustible = formData.get("combustible") as string
    const asignadoa = formData.get("asignadoa") as string
    const observaciones = formData.get("observaciones") as string

    // Validaciones básicas
    if (!matricula || !marca || !modelo) {
      throw new Error("Matrícula, marca y modelo son campos obligatorios")
    }

    // Preparar datos para actualizar
    const updateData: any = {
      marca: marca.trim(),
      modelo: modelo.trim(),
      año: año ? Number.parseInt(año) : null,
      color: color?.trim() || null,
      kilometraje: kilometraje ? Number.parseInt(kilometraje) : null,
      combustible: combustible || null,
      asignadoa: asignadoa ? Number.parseInt(asignadoa) : null,
      observaciones: observaciones?.trim() || null,
    }

    // Actualizar en la base de datos
    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      console.error("Error actualizando coche:", error)
      throw new Error("Error al actualizar el vehículo")
    }

    // Revalidar las páginas relacionadas
    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)

    // Redirigir a la página de detalles
    redirect(`/coches/detalle/${matricula}`)
  } catch (error) {
    console.error("Error en editarCoche:", error)
    throw error
  }
}
