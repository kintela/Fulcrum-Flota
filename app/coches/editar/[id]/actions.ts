"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function obtenerCoche(matricula: string) {
  try {
    // Obtener datos del coche
    const { data: coche, error: cocheError } = await supabase
      .from("coches")
      .select("*")
      .eq("matricula", matricula)
      .single()

    if (cocheError) {
      console.error("Error al obtener coche:", cocheError)
      return null
    }

    // Obtener datos del alquiler si existe
    const { data: alquiler } = await supabase.from("alquileres").select("*").eq("matricula", matricula).single()

    // Combinar datos del coche con datos del alquiler
    return {
      ...coche,
      fecha_inicio: alquiler?.fecha_inicio || null,
      fecha_fin: alquiler?.fecha_fin || null,
      importe_anual: alquiler?.importe_anual || null,
      compania: alquiler?.compania || null,
      kms_anuales: alquiler?.kms_anuales || null,
    }
  } catch (error) {
    console.error("Error al obtener coche:", error)
    return null
  }
}

export async function editarCoche(matricula: string, formData: FormData) {
  try {
    const marca = formData.get("marca") as string
    const modelo = formData.get("modelo") as string
    const color = formData.get("color") as string
    const fechamatriculacion = formData.get("fechamatriculacion") as string
    const kms = Number.parseInt(formData.get("kms") as string) || 0
    const kw = formData.get("kw") as string
    const cv = formData.get("cv") as string
    const cc = formData.get("cc") as string
    const combustible = formData.get("combustible") as string
    const extras = formData.get("extras") as string
    const donante = formData.get("donante") === "on"
    const alquiler = formData.get("alquiler") === "on"
    const preciocompra = formData.get("preciocompra") as string
    const empleadoId = formData.get("empleado_id") as string
    const fechaAsignacion = formData.get("fecha_asignacion") as string
    const observacionesAsignacion = formData.get("observaciones_asignacion") as string

    const cocheData = {
      marca,
      modelo,
      color: color || null,
      fechamatriculacion: fechamatriculacion || null,
      kms,
      kw: kw && kw.trim() !== "" ? Number.parseInt(kw) : null,
      cv: cv && cv.trim() !== "" ? Number.parseInt(cv) : null,
      cc: cc && cc.trim() !== "" ? Number.parseInt(cc) : null,
      combustible,
      extras: extras || null,
      donante,
      alquiler,
      preciocompra: preciocompra && preciocompra.trim() !== "" ? Number.parseFloat(preciocompra) : null,
      empleado_id: empleadoId && empleadoId !== "0" ? Number.parseInt(empleadoId) : null,
      fecha_asignacion: fechaAsignacion || null,
      observaciones_asignacion: observacionesAsignacion || null,
    }

    // Actualizar el coche
    const { error: cocheError } = await supabase.from("coches").update(cocheData).eq("matricula", matricula)

    if (cocheError) {
      console.error("Error al actualizar coche:", cocheError)
      return {
        success: false,
        error: "Error al actualizar el coche: " + cocheError.message,
      }
    }

    // Manejar datos del alquiler
    if (alquiler) {
      const fechaInicio = formData.get("fecha_inicio") as string
      const fechaFin = formData.get("fecha_fin") as string
      const importeAnual = formData.get("importe_anual") as string
      const compania = formData.get("compania") as string
      const kmsAnuales = formData.get("kms_anuales") as string

      const alquilerData = {
        matricula,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        importe_anual: importeAnual && importeAnual.trim() !== "" ? Number.parseFloat(importeAnual) : null,
        compania: compania || null,
        kms_anuales: kmsAnuales && kmsAnuales.trim() !== "" ? Number.parseInt(kmsAnuales) : null,
      }

      // Verificar si ya existe un registro de alquiler
      const { data: existingAlquiler } = await supabase
        .from("alquileres")
        .select("matricula")
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
          return {
            success: false,
            error: "Error al actualizar datos de alquiler: " + alquilerError.message,
          }
        }
      } else {
        // Crear nuevo registro
        const { error: alquilerError } = await supabase.from("alquileres").insert([alquilerData])

        if (alquilerError) {
          console.error("Error al crear datos de alquiler:", alquilerError)
          return {
            success: false,
            error: "Error al crear datos de alquiler: " + alquilerError.message,
          }
        }
      }
    } else {
      // Si no es alquiler, eliminar datos de alquiler si existen
      await supabase.from("alquileres").delete().eq("matricula", matricula)
    }

    revalidatePath("/coches")
    return {
      success: true,
      message: "Coche actualizado correctamente",
    }
  } catch (error) {
    console.error("Error inesperado:", error)
    return {
      success: false,
      error: "Error inesperado al actualizar el coche",
    }
  }
}

export async function guardarSeccionBasica(matricula: string, formData: FormData) {
  try {
    const marca = formData.get("marca") as string
    const modelo = formData.get("modelo") as string
    const color = formData.get("color") as string
    const fechamatriculacion = formData.get("fechamatriculacion") as string
    const kms = Number.parseInt(formData.get("kms") as string) || 0
    const kw = formData.get("kw") as string
    const cv = formData.get("cv") as string
    const cc = formData.get("cc") as string
    const combustible = formData.get("combustible") as string
    const extras = formData.get("extras") as string
    const donante = formData.get("donante") === "on"
    const alquiler = formData.get("alquiler") === "on"
    const preciocompra = formData.get("preciocompra") as string

    const cocheData = {
      marca,
      modelo,
      color: color || null,
      fechamatriculacion: fechamatriculacion || null,
      kms,
      kw: kw && kw.trim() !== "" ? Number.parseInt(kw) : null,
      cv: cv && cv.trim() !== "" ? Number.parseInt(cv) : null,
      cc: cc && cc.trim() !== "" ? Number.parseInt(cc) : null,
      combustible,
      extras: extras || null,
      donante,
      alquiler,
      preciocompra: preciocompra && preciocompra.trim() !== "" ? Number.parseFloat(preciocompra) : null,
    }

    const { error } = await supabase.from("coches").update(cocheData).eq("matricula", matricula)

    if (error) {
      console.error("Error al guardar información básica:", error)
      return {
        success: false,
        error: "Error al guardar información básica: " + error.message,
      }
    }

    revalidatePath("/coches")
    return {
      success: true,
      message: "Información básica guardada correctamente",
    }
  } catch (error) {
    console.error("Error inesperado:", error)
    return {
      success: false,
      error: "Error inesperado al guardar",
    }
  }
}

export async function guardarSeccionAlquiler(matricula: string, formData: FormData) {
  try {
    const alquiler = formData.get("alquiler") === "on"

    // Actualizar el campo alquiler en la tabla coches
    const { error: cocheError } = await supabase.from("coches").update({ alquiler }).eq("matricula", matricula)

    if (cocheError) {
      console.error("Error al actualizar campo alquiler:", cocheError)
      return {
        success: false,
        error: "Error al actualizar campo alquiler: " + cocheError.message,
      }
    }

    if (alquiler) {
      const fechaInicio = formData.get("fecha_inicio") as string
      const fechaFin = formData.get("fecha_fin") as string
      const importeAnual = formData.get("importe_anual") as string
      const compania = formData.get("compania") as string
      const kmsAnuales = formData.get("kms_anuales") as string

      const alquilerData = {
        matricula,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        importe_anual: importeAnual && importeAnual.trim() !== "" ? Number.parseFloat(importeAnual) : null,
        compania: compania || null,
        kms_anuales: kmsAnuales && kmsAnuales.trim() !== "" ? Number.parseInt(kmsAnuales) : null,
      }

      // Verificar si ya existe un registro de alquiler
      const { data: existingAlquiler } = await supabase
        .from("alquileres")
        .select("matricula")
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
          return {
            success: false,
            error: "Error al actualizar datos de alquiler: " + alquilerError.message,
          }
        }
      } else {
        // Crear nuevo registro
        const { error: alquilerError } = await supabase.from("alquileres").insert([alquilerData])

        if (alquilerError) {
          console.error("Error al crear datos de alquiler:", alquilerError)
          return {
            success: false,
            error: "Error al crear datos de alquiler: " + alquilerError.message,
          }
        }
      }
    } else {
      // Si no es alquiler, eliminar datos de alquiler si existen
      await supabase.from("alquileres").delete().eq("matricula", matricula)
    }

    revalidatePath("/coches")
    return {
      success: true,
      message: "Datos del alquiler guardados correctamente",
    }
  } catch (error) {
    console.error("Error inesperado:", error)
    return {
      success: false,
      error: "Error inesperado al guardar",
    }
  }
}

export async function guardarSeccionAsignacion(matricula: string, formData: FormData) {
  try {
    const empleadoId = formData.get("empleado_id") as string
    const fechaAsignacion = formData.get("fecha_asignacion") as string
    const observacionesAsignacion = formData.get("observaciones_asignacion") as string

    const asignacionData = {
      empleado_id: empleadoId && empleadoId !== "0" ? Number.parseInt(empleadoId) : null,
      fecha_asignacion: fechaAsignacion || null,
      observaciones_asignacion: observacionesAsignacion || null,
    }

    const { error } = await supabase.from("coches").update(asignacionData).eq("matricula", matricula)

    if (error) {
      console.error("Error al guardar asignación:", error)
      return {
        success: false,
        error: "Error al guardar asignación: " + error.message,
      }
    }

    revalidatePath("/coches")
    return {
      success: true,
      message: "Asignación guardada correctamente",
    }
  } catch (error) {
    console.error("Error inesperado:", error)
    return {
      success: false,
      error: "Error inesperado al guardar",
    }
  }
}
