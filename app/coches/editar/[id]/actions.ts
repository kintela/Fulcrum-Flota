"use server"

import { supabase } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function editarCoche(formData: FormData) {
  try {
    const matriculaOriginal = (formData.get("matricula_original") as string)?.toUpperCase()
    const matriculaNueva = (formData.get("matricula") as string)?.toUpperCase()
    const marca = formData.get("marca") as string
    const modelo = formData.get("modelo") as string
    const color = formData.get("color") as string
    const kmsRaw = formData.get("kms") as string
    const combustible = formData.get("combustible") as string
    const asignadoa = formData.get("asignadoa") as string
    const extras = formData.get("extras") as string
    const donante = formData.get("donante") === "on"

    // Validaciones básicas
    if (!matriculaOriginal || !matriculaNueva || !marca || !modelo) {
      throw new Error("Matrícula, marca y modelo son campos obligatorios")
    }

    // Preparar datos para actualizar
    const updateData: Record<string, any> = {
      marca,
      modelo,
      color: color || null,
      combustible: combustible || null,
      extras: extras || null,
      donante,
    }

    // Kilómetros (null si vacío o NaN)
    const kms = kmsRaw && kmsRaw.toString().trim() !== "" ? Number.parseInt(kmsRaw.toString(), 10) : null
    updateData.kms = Number.isNaN(kms) ? null : kms

    // Solo actualizar matrícula si cambió (evita toques innecesarios al PK)
    if (matriculaNueva !== matriculaOriginal) {
      updateData.matricula = matriculaNueva
    }

    // Asignación de empleado (null si es "0" o vacío)
    const asignadoId = asignadoa && asignadoa !== "0" ? Number.parseInt(asignadoa, 10) : null
    updateData.asignadoa = Number.isNaN(asignadoId) ? null : asignadoId

    // Actualizar en la base de datos
    const { error } = await supabase.from("coches").update(updateData).eq("matricula", matriculaOriginal)

    if (error) {
      console.error("Error updating coche:", error)
      throw new Error(`Error al actualizar el vehículo: ${error.message}`)
    }

    // Revalidar las páginas relacionadas
    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matriculaNueva}`)
    revalidatePath("/")

    // Redirigir a la página de detalle
    redirect(`/coches/detalle/${matriculaNueva}`)
  } catch (error) {
    console.error("Error in editarCoche:", error)
    throw error
  }
}
