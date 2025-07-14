"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function editarCocheAction(formData: FormData) {
  try {
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

    // Validaciones básicas
    if (!matricula || !marca || !modelo) {
      throw new Error("Matrícula, marca y modelo son campos obligatorios")
    }

    // Preparar datos para actualizar
    const updateData: any = {
      marca: marca.trim(),
      modelo: modelo.trim(),
      donante,
    }

    // Campos opcionales
    if (año) updateData.año = Number.parseInt(año)
    if (color) updateData.color = color.trim()
    if (kilometraje) updateData.kilometraje = Number.parseInt(kilometraje)
    if (combustible) updateData.combustible = combustible
    if (asignadoa && asignadoa !== "0") updateData.asignadoa = Number.parseInt(asignadoa)
    else updateData.asignadoa = null
    if (extras) updateData.extras = extras.trim()

    // Actualizar en la base de datos
    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matricula)

    if (error) {
      console.error("Error actualizando coche:", error)
      throw new Error("Error al actualizar el vehículo")
    }

    // Revalidar y redirigir
    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)
  } catch (error) {
    console.error("Error en editarCocheAction:", error)
    throw error
  }

  redirect(`/coches/detalle/${formData.get("matricula")}`)
}
