"use server"

import { supabase } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function editarCoche(formData: FormData) {
  try {
    const matricula = formData.get("matricula") as string
    const marca = formData.get("marca") as string
    const modelo = formData.get("modelo") as string
    const color = formData.get("color") as string
    const año = formData.get("año") as string
    const kilometros = formData.get("kilometros") as string
    const combustible = formData.get("combustible") as string
    const asignadoa = formData.get("asignadoa") as string
    const extras = formData.get("extras") as string
    const donante = formData.get("donante") === "on"

    // Validaciones básicas
    if (!matricula || !marca || !modelo) {
      throw new Error("Matrícula, marca y modelo son campos obligatorios")
    }

    // Preparar datos para actualizar
    const updateData: any = {
      marca,
      modelo,
      color: color || null,
      año: año ? Number.parseInt(año) : null,
      kilometros: kilometros ? Number.parseInt(kilometros) : null,
      combustible: combustible || null,
      asignadoa: asignadoa ? Number.parseInt(asignadoa) : null,
      extras: extras || null,
      donante,
    }

    // Actualizar en la base de datos
    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      console.error("Error updating coche:", error)
      throw new Error("Error al actualizar el vehículo")
    }

    // Revalidar las páginas relacionadas
    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath("/")

    // Redirigir a la página de detalle
    redirect(`/coches/detalle/${matricula}`)
  } catch (error) {
    console.error("Error in editarCoche:", error)
    throw error
  }
}
