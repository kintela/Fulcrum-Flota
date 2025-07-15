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
  const kilometraje = formData.get("kilometraje") as string
  const combustible = formData.get("combustible") as string
  const asignadoa = formData.get("asignadoa") as string
  const observaciones = formData.get("observaciones") as string

  // Validar datos requeridos
  if (!matricula || !marca || !modelo || !año) {
    throw new Error("Faltan datos requeridos")
  }

  try {
    const updateData: any = {
      marca,
      modelo,
      año,
      color: color || null,
      combustible: combustible || null,
      observaciones: observaciones || null,
    }

    // Manejar kilometraje
    if (kilometraje && !isNaN(Number.parseInt(kilometraje))) {
      updateData.kilometraje = Number.parseInt(kilometraje)
    }

    // Manejar asignación
    if (asignadoa && !isNaN(Number.parseInt(asignadoa))) {
      updateData.asignadoa = Number.parseInt(asignadoa)
    } else {
      updateData.asignadoa = null
    }

    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      console.error("Error actualizando coche:", error)
      throw new Error("Error al actualizar el vehículo")
    }

    // Revalidar las páginas relacionadas
    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)
  } catch (error) {
    console.error("Error en editarCoche:", error)
    throw error
  }

  // Redirigir a la página de detalle
  redirect(`/coches/detalle/${matricula}`)
}
