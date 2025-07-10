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
  const extras = formData.get("extras") as string
  const donante = formData.get("donante") === "on"

  try {
    // Validaciones básicas
    if (!matricula || !marca || !modelo || !año) {
      throw new Error("Los campos matrícula, marca, modelo y año son obligatorios")
    }

    if (año < 1900 || año > 2030) {
      throw new Error("El año debe estar entre 1900 y 2030")
    }

    // Preparar datos para actualizar
    const updateData: any = {
      marca: marca.trim(),
      modelo: modelo.trim(),
      año,
      color: color?.trim() || null,
      combustible: combustible || null,
      observaciones: observaciones?.trim() || null,
      extras: extras?.trim() || null,
      donante,
    }

    // Manejar kilometraje
    if (kilometraje && kilometraje.trim() !== "") {
      const km = Number.parseInt(kilometraje)
      if (isNaN(km) || km < 0) {
        throw new Error("El kilometraje debe ser un número válido")
      }
      updateData.kilometraje = km
    } else {
      updateData.kilometraje = null
    }

    // Manejar asignación
    if (asignadoa && asignadoa.trim() !== "") {
      const empleadoId = Number.parseInt(asignadoa)
      if (isNaN(empleadoId)) {
        throw new Error("ID de empleado no válido")
      }

      // Verificar que el empleado existe
      const { data: empleado, error: empleadoError } = await supabase
        .from("empleados")
        .select("id")
        .eq("id", empleadoId)
        .single()

      if (empleadoError || !empleado) {
        throw new Error("El empleado seleccionado no existe")
      }

      updateData.asignadoa = empleadoId
    } else {
      updateData.asignadoa = null
    }

    // Actualizar el coche
    const { data, error } = await supabase.from("coches").update(updateData).eq("matricula", matricula).select()

    if (error) {
      console.error("Error actualizando coche:", error)
      throw new Error("Error al actualizar el vehículo")
    }

    if (!data || data.length === 0) {
      throw new Error("No se encontró el vehículo a actualizar")
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
