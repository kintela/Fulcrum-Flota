"use server"

import { createClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function editarCoche(formData: FormData) {
  const supabase = createClient()

  const matricula = formData.get("matricula") as string
  const marca = formData.get("marca") as string
  const modelo = formData.get("modelo") as string
  const año = formData.get("año") as string
  const color = formData.get("color") as string
  const kilometraje = formData.get("kilometraje") as string
  const combustible = formData.get("combustible") as string
  const asignadoa = formData.get("asignadoa") as string
  const extras = formData.get("extras") as string
  const donante = formData.get("donante") === "on"

  try {
    const updateData: any = {
      marca,
      modelo,
      color,
      combustible,
      extras,
      donante,
    }

    // Solo agregar campos numéricos si tienen valor
    if (año) {
      updateData.año = Number.parseInt(año)
    }
    if (kilometraje) {
      updateData.kilometraje = Number.parseInt(kilometraje)
    }
    if (asignadoa) {
      updateData.asignadoa = Number.parseInt(asignadoa)
    } else {
      updateData.asignadoa = null
    }

    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      console.error("Error actualizando coche:", error)
      throw new Error("Error al actualizar el vehículo")
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)
  } catch (error) {
    console.error("Error en editarCoche:", error)
    throw error
  }

  redirect(`/coches/detalle/${matricula}`)
}
