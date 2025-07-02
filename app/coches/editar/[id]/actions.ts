"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function obtenerCoche(id: string) {
  try {
    // Obtener datos del coche
    const { data: coche, error: cocheError } = await supabase.from("coches").select("*").eq("id", id).single()

    if (cocheError) {
      console.error("Error al obtener coche:", cocheError)
      return null
    }

    // Obtener datos del alquiler si existe
    const { data: alquiler, error: alquilerError } = await supabase
      .from("alquileres")
      .select("*")
      .eq("matricula", coche.matricula)
      .single()

    // Combinar datos (no es error si no hay datos de alquiler)
    const cocheCompleto = {
      ...coche,
      fecha_inicio: alquiler?.fecha_inicio || null,
      fecha_fin: alquiler?.fecha_fin || null,
      importe_anual: alquiler?.importe_anual || null,
      compania: alquiler?.compania || null,
      kms_anuales: alquiler?.kms_anuales || null,
    }

    return cocheCompleto
  } catch (error) {
    console.error("Error inesperado:", error)
    return null
  }
}

export async function editarCoche(id: string, formData: FormData) {
  try {
    const matricula = formData.get("matricula") as string
    const marca = formData.get("marca") as string
    const modelo = formData.get("modelo") as string
    const color = formData.get("color") as string
    const fechamatriculacion = formData.get("fechamatriculacion") as string
    const kms = Number.parseInt(formData.get("kms") as string) || 0
    const kw = formData.get("kw") ? Number.parseInt(formData.get("kw") as string) : null
    const cv = formData.get("cv") ? Number.parseInt(formData.get("cv") as string) : null
    const cc = formData.get("cc") ? Number.parseInt(formData.get("cc") as string) : null
    const combustible = formData.get("combustible") as string
    const extras = formData.get("extras") as string
    const donante = formData.get("donante") === "on"
    const alquiler = formData.get("alquiler") === "on"
    const preciocompra = formData.get("preciocompra") ? Number.parseFloat(formData.get("preciocompra") as string) : null
    const empleado_id = formData.get("empleado_id") ? Number.parseInt(formData.get("empleado_id") as string) : null
    const fecha_asignacion = formData.get("fecha_asignacion") as string
    const observaciones_asignacion = formData.get("observaciones_asignacion") as string

    // Actualizar datos del coche
    const cocheData: any = {
      matricula: matricula.toUpperCase(),
      marca,
      modelo,
      color: color || null,
      fechamatriculacion: fechamatriculacion || null,
      kms,
      kw,
      cv,
      cc,
      combustible,
      extras: extras || null,
      donante,
      alquiler,
      preciocompra,
      empleado_id: empleado_id === 0 ? null : empleado_id,
      fecha_asignacion: fecha_asignacion || null,
      observaciones_asignacion: observaciones_asignacion || null,
    }

    const { error: cocheError } = await supabase.from("coches").update(cocheData).eq("id", id)

    if (cocheError) {
      console.error("Error al actualizar coche:", cocheError)
      return { success: false, error: "Error al actualizar el coche" }
    }

    // Gestionar datos del alquiler
    if (alquiler) {
      const fechaInicio = formData.get("fecha_inicio") as string
      const fechaFin = formData.get("fecha_fin") as string
      const importeAnual = formData.get("importe_anual") as string
      const compania = formData.get("compania") as string
      const kmsAnuales = formData.get("kms_anuales") as string

      const alquilerData = {
        matricula: matricula.toUpperCase(),
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        importe_anual: importeAnual && importeAnual.trim() !== "" ? Number.parseFloat(importeAnual) : null,
        compania: compania || null,
        kms_anuales: kmsAnuales && kmsAnuales.trim() !== "" ? Number.parseInt(kmsAnuales) : null,
      }

      // Verificar si ya existe un registro de alquiler
      const { data: existingAlquiler, error: checkError } = await supabase
        .from("alquileres")
        .select("id")
        .eq("matricula", matricula.toUpperCase())
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error al verificar alquiler:", checkError)
        return { success: false, error: "Error al verificar datos de alquiler" }
      }

      if (existingAlquiler) {
        // Actualizar registro existente
        const { error: updateError } = await supabase
          .from("alquileres")
          .update(alquilerData)
          .eq("matricula", matricula.toUpperCase())

        if (updateError) {
          console.error("Error al actualizar datos de alquiler:", updateError)
          return { success: false, error: "Error al actualizar datos de alquiler: " + updateError.message }
        }
      } else {
        // Crear nuevo registro
        const { error: insertError } = await supabase.from("alquileres").insert(alquilerData)

        if (insertError) {
          console.error("Error al crear datos de alquiler:", insertError)
          return { success: false, error: "Error al crear datos de alquiler: " + insertError.message }
        }
      }
    } else {
      // Si ya no es de alquiler, eliminar datos de alquiler
      const { error: deleteError } = await supabase.from("alquileres").delete().eq("matricula", matricula.toUpperCase())

      if (deleteError) {
        console.error("Error al eliminar datos de alquiler:", deleteError)
        // No fallar completamente por esto
      }
    }

    revalidatePath("/coches")
    return { success: true, message: "Coche actualizado exitosamente" }
  } catch (error) {
    console.error("Error inesperado:", error)
    return { success: false, error: "Error inesperado al actualizar el coche" }
  }
}

export async function guardarSeccionBasica(id: string, formData: FormData) {
  try {
    const matricula = formData.get("matricula") as string
    const marca = formData.get("marca") as string
    const modelo = formData.get("modelo") as string
    const color = formData.get("color") as string
    const fechamatriculacion = formData.get("fechamatriculacion") as string
    const kms = Number.parseInt(formData.get("kms") as string) || 0
    const kw = formData.get("kw") ? Number.parseInt(formData.get("kw") as string) : null
    const cv = formData.get("cv") ? Number.parseInt(formData.get("cv") as string) : null
    const cc = formData.get("cc") ? Number.parseInt(formData.get("cc") as string) : null
    const combustible = formData.get("combustible") as string
    const extras = formData.get("extras") as string
    const donante = formData.get("donante") === "on"
    const alquiler = formData.get("alquiler") === "on"
    const preciocompra = formData.get("preciocompra") ? Number.parseFloat(formData.get("preciocompra") as string) : null

    const cocheData: any = {
      matricula: matricula.toUpperCase(),
      marca,
      modelo,
      color: color || null,
      fechamatriculacion: fechamatriculacion || null,
      kms,
      kw,
      cv,
      cc,
      combustible,
      extras: extras || null,
      donante,
      alquiler,
      preciocompra,
    }

    const { error } = await supabase.from("coches").update(cocheData).eq("id", id)

    if (error) {
      console.error("Error al guardar información básica:", error)
      return { success: false, error: "Error al guardar la información básica" }
    }

    revalidatePath("/coches")
    return { success: true, message: "Información básica guardada exitosamente" }
  } catch (error) {
    console.error("Error inesperado:", error)
    return { success: false, error: "Error inesperado al guardar" }
  }
}

export async function guardarSeccionAlquiler(id: string, formData: FormData) {
  try {
    const matricula = formData.get("matricula") as string
    const alquiler = formData.get("alquiler") === "on"

    // Actualizar el campo alquiler en la tabla coches
    const { error: cocheError } = await supabase.from("coches").update({ alquiler }).eq("id", id)

    if (cocheError) {
      console.error("Error al actualizar campo alquiler:", cocheError)
      return { success: false, error: "Error al actualizar el estado de alquiler" }
    }

    if (alquiler) {
      const fechaInicio = formData.get("fecha_inicio") as string
      const fechaFin = formData.get("fecha_fin") as string
      const importeAnual = formData.get("importe_anual") as string
      const compania = formData.get("compania") as string
      const kmsAnuales = formData.get("kms_anuales") as string

      const alquilerData = {
        matricula: matricula.toUpperCase(),
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        importe_anual: importeAnual && importeAnual.trim() !== "" ? Number.parseFloat(importeAnual) : null,
        compania: compania || null,
        kms_anuales: kmsAnuales && kmsAnuales.trim() !== "" ? Number.parseInt(kmsAnuales) : null,
      }

      // Verificar si ya existe un registro de alquiler
      const { data: existingAlquiler, error: checkError } = await supabase
        .from("alquileres")
        .select("id")
        .eq("matricula", matricula.toUpperCase())
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error al verificar alquiler:", checkError)
        return { success: false, error: "Error al verificar datos de alquiler" }
      }

      if (existingAlquiler) {
        // Actualizar registro existente
        const { error: updateError } = await supabase
          .from("alquileres")
          .update(alquilerData)
          .eq("matricula", matricula.toUpperCase())

        if (updateError) {
          console.error("Error al actualizar datos de alquiler:", updateError)
          return { success: false, error: "Error al actualizar datos de alquiler: " + updateError.message }
        }
      } else {
        // Crear nuevo registro
        const { error: insertError } = await supabase.from("alquileres").insert(alquilerData)

        if (insertError) {
          console.error("Error al crear datos de alquiler:", insertError)
          return { success: false, error: "Error al crear datos de alquiler: " + insertError.message }
        }
      }
    } else {
      // Si ya no es de alquiler, eliminar datos de alquiler
      const { error: deleteError } = await supabase.from("alquileres").delete().eq("matricula", matricula.toUpperCase())

      if (deleteError) {
        console.error("Error al eliminar datos de alquiler:", deleteError)
        // No fallar completamente por esto
      }
    }

    revalidatePath("/coches")
    return { success: true, message: "Datos del alquiler guardados exitosamente" }
  } catch (error) {
    console.error("Error inesperado:", error)
    return { success: false, error: "Error inesperado al guardar" }
  }
}

export async function guardarSeccionAsignacion(id: string, formData: FormData) {
  try {
    const empleado_id = formData.get("empleado_id") ? Number.parseInt(formData.get("empleado_id") as string) : null
    const fecha_asignacion = formData.get("fecha_asignacion") as string
    const observaciones_asignacion = formData.get("observaciones_asignacion") as string

    const asignacionData = {
      empleado_id: empleado_id === 0 ? null : empleado_id,
      fecha_asignacion: fecha_asignacion || null,
      observaciones_asignacion: observaciones_asignacion || null,
    }

    const { error } = await supabase.from("coches").update(asignacionData).eq("id", id)

    if (error) {
      console.error("Error al guardar asignación:", error)
      return { success: false, error: "Error al guardar la asignación" }
    }

    revalidatePath("/coches")
    return { success: true, message: "Asignación guardada exitosamente" }
  } catch (error) {
    console.error("Error inesperado:", error)
    return { success: false, error: "Error inesperado al guardar" }
  }
}
