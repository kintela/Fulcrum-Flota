"use server"

import { createClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function editarCoche(formData: FormData) {
  const supabase = createClient()

  const matricula = formData.get("matricula") as string
  const marca = formData.get("marca") as string
  const modelo = formData.get("modelo") as string
  const año = Number.parseInt(formData.get("año") as string)
  const color = formData.get("color") as string
  const combustible = formData.get("combustible") as string
  const kilometraje = formData.get("kilometraje") as string
  const asignadoa = formData.get("asignadoa") as string
  const extras = formData.get("extras") as string
  const donante = formData.get("donante") === "on"

  try {
    const updateData: any = {
      marca,
      modelo,
      año,
      color: color || null,
      combustible: combustible || null,
      kilometraje: kilometraje ? Number.parseInt(kilometraje) : null,
      asignadoa: asignadoa ? Number.parseInt(asignadoa) : null,
      extras: extras || null,
      donante,
    }

    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      console.error("Error actualizando coche:", error)
      throw new Error("Error al actualizar el vehículo")
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
  } catch (error) {
    console.error("Error en editarCoche:", error)
    throw error
  }

  redirect(`/coches/detalle/${matricula}`)
}
