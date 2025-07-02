"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

interface Coche {
  id: number
  matricula: string
  marca: string
  modelo: string
  color: string
  combustible: string
  fecha_matriculacion: string
  kms: number
  precio_compra: number
  fecha_compra: string
  observaciones?: string
  vehiculo_alquiler: boolean
  empleado_id?: number
  fecha_inicio?: string
  fecha_fin?: string
  importe_anual?: number
  compania?: string
  kms_anuales?: number
}

export async function obtenerCoche(id: string): Promise<Coche | null> {
  try {
    const { data: coche, error: cocheError } = await supabase.from("coches").select("*").eq("id", id).single()

    if (cocheError) {
      console.error("Error al obtener coche:", cocheError)
      return null
    }

    // Si es vehículo de alquiler, obtener también los datos del alquiler
    if (coche.vehiculo_alquiler) {
      const { data: alquiler, error: alquilerError } = await supabase
        .from("alquileres")
        .select("*")
        .eq("matricula", coche.matricula)
        .single()

      if (!alquilerError && alquiler) {
        return {
          ...coche,
          fecha_inicio: alquiler.fecha_inicio,
          fecha_fin: alquiler.fecha_fin,
          importe_anual: alquiler.importe_anual,
          compania: alquiler.compania,
          kms_anuales: alquiler.kms_anuales,
        }
      }
    }

    return coche
  } catch (error) {
    console.error("Error:", error)
    return null
  }
}

export async function editarCoche(formData: FormData) {
  try {
    const id = formData.get("id") as string
    const vehiculoAlquiler = formData.get("vehiculo_alquiler") === "on"

    const cocheData = {
      matricula: formData.get("matricula") as string,
      marca: formData.get("marca") as string,
      modelo: formData.get("modelo") as string,
      color: formData.get("color") as string,
      combustible: formData.get("combustible") as string,
      fecha_matriculacion: formData.get("fecha_matriculacion") as string,
      kms: Number.parseInt(formData.get("kms") as string),
      precio_compra: Number.parseFloat(formData.get("precio_compra") as string),
      fecha_compra: formData.get("fecha_compra") as string,
      observaciones: (formData.get("observaciones") as string) || "",
      vehiculo_alquiler: vehiculoAlquiler,
      empleado_id: formData.get("empleado_id") ? Number.parseInt(formData.get("empleado_id") as string) : null,
    }

    // Actualizar el coche
    const { error: cocheError } = await supabase.from("coches").update(cocheData).eq("id", id)

    if (cocheError) {
      console.error("Error al actualizar coche:", cocheError)
      throw new Error("Error al actualizar el coche")
    }

    // Manejar datos del alquiler
    if (vehiculoAlquiler) {
      const fechaInicio = formData.get("fecha_inicio") as string
      const fechaFin = formData.get("fecha_fin") as string
      const importeAnual = formData.get("importe_anual") as string
      const compania = formData.get("compania") as string
      const kmsAnuales = formData.get("kms_anuales") as string

      const alquilerData = {
        matricula: cocheData.matricula,
        fecha_inicio: fechaInicio && fechaInicio.trim() !== "" ? fechaInicio : null,
        fecha_fin: fechaFin && fechaFin.trim() !== "" ? fechaFin : null,
        importe_anual: importeAnual && importeAnual.trim() !== "" ? Number.parseFloat(importeAnual) : null,
        compania: compania && compania.trim() !== "" ? compania : null,
        kms_anuales: kmsAnuales && kmsAnuales.trim() !== "" ? Number.parseInt(kmsAnuales) : null,
      }

      // Verificar si ya existe un registro de alquiler
      const { data: existingAlquiler } = await supabase
        .from("alquileres")
        .select("*")
        .eq("matricula", cocheData.matricula)
        .single()

      if (existingAlquiler) {
        // Actualizar registro existente
        const { error: alquilerError } = await supabase
          .from("alquileres")
          .update(alquilerData)
          .eq("matricula", cocheData.matricula)

        if (alquilerError) {
          console.error("Error al actualizar datos de alquiler:", alquilerError)
          throw new Error("Error al actualizar los datos del alquiler")
        }
      } else {
        // Crear nuevo registro
        const { error: alquilerError } = await supabase.from("alquileres").insert([alquilerData])

        if (alquilerError) {
          console.error("Error al crear datos de alquiler:", alquilerError)
          throw new Error("Error al crear los datos del alquiler")
        }
      }
    } else {
      // Si ya no es vehículo de alquiler, eliminar datos del alquiler
      await supabase.from("alquileres").delete().eq("matricula", cocheData.matricula)
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/editar/${id}`)
    return { success: true, message: "Coche actualizado exitosamente" }
  } catch (error) {
    console.error("Error:", error)
    return { success: false, message: "Error al actualizar el coche" }
  }
}

export async function guardarSeccionBasica(formData: FormData) {
  try {
    const id = formData.get("id") as string

    const cocheData = {
      matricula: formData.get("matricula") as string,
      marca: formData.get("marca") as string,
      modelo: formData.get("modelo") as string,
      color: formData.get("color") as string,
      combustible: formData.get("combustible") as string,
      fecha_matriculacion: formData.get("fecha_matriculacion") as string,
      kms: Number.parseInt(formData.get("kms") as string),
      precio_compra: Number.parseFloat(formData.get("precio_compra") as string),
      fecha_compra: formData.get("fecha_compra") as string,
      observaciones: (formData.get("observaciones") as string) || "",
    }

    const { error } = await supabase.from("coches").update(cocheData).eq("id", id)

    if (error) {
      console.error("Error al guardar sección básica:", error)
      throw new Error("Error al guardar la información básica")
    }

    revalidatePath(`/coches/editar/${id}`)
    return { success: true, message: "Información básica guardada exitosamente" }
  } catch (error) {
    console.error("Error:", error)
    return { success: false, message: "Error al guardar la información básica" }
  }
}

export async function guardarSeccionAlquiler(formData: FormData) {
  try {
    const id = formData.get("id") as string
    const vehiculoAlquiler = formData.get("vehiculo_alquiler") === "on"
    const matricula = formData.get("matricula") as string

    // Actualizar el campo vehiculo_alquiler en la tabla coches
    const { error: cocheError } = await supabase
      .from("coches")
      .update({ vehiculo_alquiler: vehiculoAlquiler })
      .eq("id", id)

    if (cocheError) {
      console.error("Error al actualizar vehículo alquiler:", cocheError)
      throw new Error("Error al actualizar el estado del alquiler")
    }

    if (vehiculoAlquiler) {
      const fechaInicio = formData.get("fecha_inicio") as string
      const fechaFin = formData.get("fecha_fin") as string
      const importeAnual = formData.get("importe_anual") as string
      const compania = formData.get("compania") as string
      const kmsAnuales = formData.get("kms_anuales") as string

      const alquilerData = {
        matricula: matricula,
        fecha_inicio: fechaInicio && fechaInicio.trim() !== "" ? fechaInicio : null,
        fecha_fin: fechaFin && fechaFin.trim() !== "" ? fechaFin : null,
        importe_anual: importeAnual && importeAnual.trim() !== "" ? Number.parseFloat(importeAnual) : null,
        compania: compania && compania.trim() !== "" ? compania : null,
        kms_anuales: kmsAnuales && kmsAnuales.trim() !== "" ? Number.parseInt(kmsAnuales) : null,
      }

      // Verificar si ya existe un registro de alquiler
      const { data: existingAlquiler } = await supabase
        .from("alquileres")
        .select("*")
        .eq("matricula", matricula)
        .single()

      if (existingAlquiler) {
        // Actualizar registro existente
        const { error: alquilerError } = await supabase
          .from("alquileres")
          .update(alquilerData)
          .eq("matricula", matricula)

        if (alquilerError) {
          console.error("Error al actualizar datos de alquiler:", alquilerError)
          throw new Error("Error al actualizar los datos del alquiler")
        }
      } else {
        // Crear nuevo registro
        const { error: alquilerError } = await supabase.from("alquileres").insert([alquilerData])

        if (alquilerError) {
          console.error("Error al crear datos de alquiler:", alquilerError)
          throw new Error("Error al crear los datos del alquiler")
        }
      }
    } else {
      // Si ya no es vehículo de alquiler, eliminar datos del alquiler
      await supabase.from("alquileres").delete().eq("matricula", matricula)
    }

    revalidatePath(`/coches/editar/${id}`)
    return { success: true, message: "Datos del alquiler guardados exitosamente" }
  } catch (error) {
    console.error("Error:", error)
    return { success: false, message: "Error al guardar los datos del alquiler" }
  }
}

export async function guardarSeccionAsignacion(formData: FormData) {
  try {
    const id = formData.get("id") as string
    const empleadoId = formData.get("empleado_id") ? Number.parseInt(formData.get("empleado_id") as string) : null

    const { error } = await supabase.from("coches").update({ empleado_id: empleadoId }).eq("id", id)

    if (error) {
      console.error("Error al guardar asignación:", error)
      throw new Error("Error al guardar la asignación")
    }

    revalidatePath(`/coches/editar/${id}`)
    return { success: true, message: "Asignación guardada exitosamente" }
  } catch (error) {
    console.error("Error:", error)
    return { success: false, message: "Error al guardar la asignación" }
  }
}
