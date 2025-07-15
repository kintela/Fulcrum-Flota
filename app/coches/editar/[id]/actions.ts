"use server"

import { createClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function editarCoche(formData: FormData) {
  const supabase = createClient()

  const matricula = formData.get("matricula") as string

  // Extraer todos los campos del formulario
  const updateData: any = {}

  // Campos de texto
  const textFields = [
    "marca",
    "modelo",
    "color",
    "combustible",
    "extras",
    "numero_bastidor",
    "numero_motor",
    "notas_mantenimiento",
    "direccion_actual",
  ]

  textFields.forEach((field) => {
    const value = formData.get(field) as string
    if (value !== null && value !== "") {
      updateData[field] = value
    }
  })

  // Campos numéricos
  const numberFields = [
    "año",
    "kilometraje",
    "precio",
    "km_ultimo_mantenimiento",
    "km_proximo_mantenimiento",
    "latitud",
    "longitud",
  ]

  numberFields.forEach((field) => {
    const value = formData.get(field) as string
    if (value !== null && value !== "") {
      const numValue = Number(value)
      if (!isNaN(numValue)) {
        updateData[field] = numValue
      }
    }
  })

  // Campos de fecha
  const dateFields = [
    "fecha_compra",
    "fecha_matriculacion",
    "ultimo_mantenimiento",
    "proximo_mantenimiento",
    "ultima_ubicacion",
  ]

  dateFields.forEach((field) => {
    const value = formData.get(field) as string
    if (value !== null && value !== "") {
      updateData[field] = value
    }
  })

  // Campo de asignación (puede ser número o null)
  const asignadoa = formData.get("asignadoa") as string
  if (asignadoa !== null) {
    if (asignadoa === "" || asignadoa === "null") {
      updateData.asignadoa = null
    } else {
      const numValue = Number(asignadoa)
      if (!isNaN(numValue)) {
        updateData.asignadoa = numValue
      }
    }
  }

  // Campo booleano
  const donante = formData.get("donante") === "on"
  updateData.donante = donante

  try {
    const { data, error } = await supabase.from("coches").update(updateData).eq("matricula", matricula).select()

    if (error) {
      console.error("Error actualizando coche:", error)
      throw new Error("Error al actualizar el vehículo")
    }

    if (!data || data.length === 0) {
      throw new Error("Vehículo no encontrado")
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
