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
  const kilometros = formData.get("kilometros") as string
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
      updated_at: new Date().toISOString(),
    }

    // Solo agregar campos numéricos si tienen valor
    if (año && año.trim() !== "") {
      updateData.año = Number.parseInt(año)
    }

    if (kilometros && kilometros.trim() !== "") {
      updateData.kilometros = Number.parseInt(kilometros)
    }

    // Manejar asignación de empleado
    if (asignadoa && asignadoa.trim() !== "") {
      updateData.asignadoa = Number.parseInt(asignadoa)
    } else {
      updateData.asignadoa = null
    }

    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      throw error
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)
  } catch (error) {
    console.error("Error actualizando coche:", error)
    throw new Error("Error al actualizar el vehículo")
  }

  redirect(`/coches/detalle/${matricula}`)
}
