"use server"

import { supabase } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function editarCoche(formData: FormData) {
  try {
    const matricula = formData.get("matricula") as string
    const marca = formData.get("marca") as string
    const modelo = formData.get("modelo") as string
    const año = formData.get("año") as string
    const color = formData.get("color") as string
    const combustible = formData.get("combustible") as string
    const kilometraje = formData.get("kilometraje") as string
    const asignadoa = formData.get("asignadoa") as string
    const extras = formData.get("extras") as string
    const donante = formData.get("donante") === "on"

    console.log("Editando coche:", {
      matricula,
      marca,
      modelo,
      año,
      color,
      combustible,
      kilometraje,
      asignadoa,
      extras,
      donante,
    })

    // Validaciones básicas
    if (!matricula || !marca || !modelo) {
      throw new Error("Matrícula, marca y modelo son campos obligatorios")
    }

    // Preparar datos para actualizar
    const updateData: any = {
      marca: marca.trim(),
      modelo: modelo.trim(),
      color: color?.trim() || null,
      combustible: combustible || null,
      extras: extras?.trim() || null,
      donante,
    }

    // Agregar campos opcionales solo si tienen valor
    if (año && !isNaN(Number(año))) {
      updateData.año = Number(año)
    }

    if (kilometraje && !isNaN(Number(kilometraje))) {
      updateData.kilometraje = Number(kilometraje)
    }

    if (asignadoa && asignadoa !== "") {
      updateData.asignadoa = Number(asignadoa)
    } else {
      updateData.asignadoa = null
    }

    // Actualizar en la base de datos
    const { data, error } = await supabase.from("coches").update(updateData).eq("matricula", matricula).select()

    if (error) {
      console.error("Error actualizando coche:", error)
      throw new Error("Error al actualizar el vehículo")
    }

    if (!data || data.length === 0) {
      throw new Error("Vehículo no encontrado")
    }

    console.log("✅ Vehículo actualizado exitosamente:", matricula)
  } catch (error) {
    console.error("❌ Error en editarCoche:", error)
    throw error
  }

  // Redirigir a la página de detalle
  redirect(`/coches/detalle/${formData.get("matricula")}`)
}

export async function eliminarCoche(matricula: string) {
  try {
    console.log("Eliminando coche:", matricula)

    // Verificar que el coche existe
    const { data: cocheExistente, error: verificarError } = await supabase
      .from("coches")
      .select("matricula")
      .eq("matricula", matricula)
      .single()

    if (verificarError || !cocheExistente) {
      return {
        success: false,
        error: "El vehículo no existe",
      }
    }

    // Eliminar el coche
    const { error } = await supabase.from("coches").delete().eq("matricula", matricula)

    if (error) {
      console.error("Error eliminando coche:", error)
      return {
        success: false,
        error: "Error al eliminar el vehículo de la base de datos",
      }
    }

    console.log("Coche eliminado exitosamente:", matricula)

    // Revalidar las páginas relacionadas
    revalidatePath("/coches")
    revalidatePath("/") // Dashboard

    return {
      success: true,
      message: "Vehículo eliminado correctamente",
    }
  } catch (error) {
    console.error("Error en eliminarCoche:", error)
    return {
      success: false,
      error: "Error interno del servidor",
    }
  }
}
