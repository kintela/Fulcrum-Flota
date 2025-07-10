"use server"

import { createClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function editarCoche(formData: FormData) {
  const matricula = formData.get("matricula") as string
  const marca = formData.get("marca") as string
  const modelo = formData.get("modelo") as string
  const año = Number.parseInt(formData.get("año") as string)
  const color = formData.get("color") as string
  const kilometraje = formData.get("kilometraje") as string
  const combustible = formData.get("combustible") as string
  const asignadoa = formData.get("asignadoa") as string
  const extras = formData.get("extras") as string

  try {
    const updateData: any = {
      marca,
      modelo,
      año,
      color: color || null,
      kilometraje: kilometraje ? Number.parseInt(kilometraje) : null,
      combustible: combustible || null,
      asignadoa: asignadoa ? Number.parseInt(asignadoa) : null,
      extras: extras || null,
    }

    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      console.error("Error updating coche:", error)
      throw new Error("Error al actualizar el vehículo")
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)
  } catch (error) {
    console.error("Error in editarCoche:", error)
    throw error
  }

  redirect(`/coches/detalle/${matricula}`)
}
