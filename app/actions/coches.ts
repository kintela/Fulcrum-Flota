"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export interface CocheFormData {
  matricula: string
  marca: string
  modelo: string
  color: string
  kms: number
  combustible: string
  asignado_a?: string
  es_donante: boolean
  es_alquiler: boolean
  estado: string
  fecha_seguro?: string
  fecha_itv?: string
}

export async function crearCoche(formData: FormData) {
  try {
    const data: CocheFormData = {
      matricula: formData.get("matricula") as string,
      marca: formData.get("marca") as string,
      modelo: formData.get("modelo") as string,
      color: formData.get("color") as string,
      kms: Number.parseInt(formData.get("kms") as string) || 0,
      combustible: formData.get("combustible") as string,
      asignado_a: (formData.get("asignado_a") as string) || null,
      es_donante: formData.get("es_donante") === "on",
      es_alquiler: formData.get("es_alquiler") === "on",
      estado: formData.get("estado") as string,
      fecha_seguro: (formData.get("fecha_seguro") as string) || null,
      fecha_itv: (formData.get("fecha_itv") as string) || null,
    }

    // Validaciones básicas
    if (!data.matricula || !data.marca || !data.modelo) {
      throw new Error("Los campos matrícula, marca y modelo son obligatorios")
    }

    await sql`
      INSERT INTO coches (
        matricula, marca, modelo, color, kms, combustible, 
        asignado_a, es_donante, es_alquiler, estado, fecha_seguro, fecha_itv
      ) VALUES (
        ${data.matricula}, ${data.marca}, ${data.modelo}, ${data.color}, 
        ${data.kms}, ${data.combustible}, ${data.asignado_a}, 
        ${data.es_donante}, ${data.es_alquiler}, ${data.estado},
        ${data.fecha_seguro}, ${data.fecha_itv}
      )
    `

    revalidatePath("/coches")
    redirect("/coches")
  } catch (error) {
    console.error("Error al crear coche:", error)
    throw new Error("Error al crear el coche. Verifique que la matrícula no esté duplicada.")
  }
}

export async function obtenerCoches() {
  try {
    const coches = await sql`
      SELECT * FROM coches 
      ORDER BY created_at DESC
    `
    return coches
  } catch (error) {
    console.error("Error al obtener coches:", error)
    return []
  }
}

export async function obtenerEmpleados() {
  try {
    const empleados = await sql`
      SELECT * FROM empleados 
      WHERE activo = true
      ORDER BY nombre
    `
    return empleados
  } catch (error) {
    console.error("Error al obtener empleados:", error)
    return []
  }
}
