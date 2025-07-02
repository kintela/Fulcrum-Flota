"use server"

import { createClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function obtenerCoche(id: string) {
  try {
    const supabase = createClient()

    const { data: coche, error } = await supabase
      .from("coches")
      .select(`
        *,
        empleados (
          id,
          nombre,
          apellidos
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error al obtener coche:", error)
      return null
    }

    // Obtener datos del alquiler si existe
    const { data: alquiler } = await supabase.from("alquileres").select("*").eq("matricula", coche.matricula).single()

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
    console.error("Error inesperado:", error)
    return null
  }
}

export async function editarCoche(id: string, formData: FormData) {
  try {
    const supabase = createClient()

    // Extraer datos del formulario
    const matricula = formData.get("matricula") as string
    const marca = formData.get("marca") as string
    const modelo = formData.get("modelo") as string
    const color = formData.get("color") as string
    const fechamatriculacion = formData.get("fechamatriculacion") as string
    const kms = formData.get("kms") as string
    const kw = formData.get("kw") as string
    const cv = formData.get("cv") as string
    const cc = formData.get("cc") as string
    const combustible = formData.get("combustible") as string
    const preciocompra = formData.get("preciocompra") as string
    const extras = formData.get("extras") as string
    const donante = formData.get("donante") === "on"
    const alquiler = formData.get("alquiler") === "on"
    const empleado_id = formData.get("empleado_id") as string
    const fecha_asignacion = formData.get("fecha_asignacion") as string
    const observaciones_asignacion = formData.get("observaciones_asignacion") as string

    // Datos del alquiler
    const fechaInicio = formData.get("fecha_inicio") as string
    const fechaFin = formData.get("fecha_fin") as string
    const importeAnual = formData.get("importe_anual") as string
    const compania = formData.get("compania") as string
    const kmsAnuales = formData.get("kms_anuales") as string

    // Actualizar datos del coche
    const cocheData = {
      matricula: matricula.toUpperCase(),
      marca,
      modelo,
      color: color || null,
      fechamatriculacion: fechamatriculacion || null,
      kms: kms ? Number.parseInt(kms) : 0,
      kw: kw ? Number.parseInt(kw) : null,
      cv: cv ? Number.parseInt(cv) : null,
      cc: cc ? Number.parseInt(cc) : null,
      combustible,
      preciocompra: preciocompra ? Number.parseFloat(preciocompra) : null,
      extras: extras || null,
      donante,
      alquiler,
      empleado_id: empleado_id && empleado_id !== "0" ? Number.parseInt(empleado_id) : null,
      fecha_asignacion: fecha_asignacion || null,
      observaciones_asignacion: observaciones_asignacion || null,
    }

    const { error: errorCoche } = await supabase.from("coches").update(cocheData).eq("id", id)

    if (errorCoche) {
      console.error("Error al actualizar coche:", errorCoche)
      return {
        success: false,
        error: "Error al actualizar el coche",
      }
    }

    // Manejar datos del alquiler
    if (alquiler) {
      // Si es vehículo de alquiler, insertar o actualizar datos
      const alquilerData = {
        matricula: matricula.toUpperCase(),
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        importe_anual: importeAnual && importeAnual.trim() !== "" ? Number.parseFloat(importeAnual) : null,
        compania: compania || null,
        kms_anuales: kmsAnuales && kmsAnuales.trim() !== "" ? Number.parseInt(kmsAnuales) : null,
      }

      // Verificar si ya existe un registro de alquiler
      const { data: alquilerExistente } = await supabase
        .from("alquileres")
        .select("id")
        .eq("matricula", matricula.toUpperCase())
        .single()

      if (alquilerExistente) {
        // Actualizar registro existente
        const { error: errorAlquiler } = await supabase
          .from("alquileres")
          .update(alquilerData)
          .eq("matricula", matricula.toUpperCase())

        if (errorAlquiler) {
          console.error("Error al actualizar datos de alquiler:", errorAlquiler)
          return {
            success: false,
            error: "Error al actualizar los datos del alquiler",
          }
        }
      } else {
        // Crear nuevo registro
        const { error: errorAlquiler } = await supabase.from("alquileres").insert(alquilerData)

        if (errorAlquiler) {
          console.error("Error al crear datos de alquiler:", errorAlquiler)
          return {
            success: false,
            error: "Error al crear los datos del alquiler",
          }
        }
      }
    } else {
      // Si no es vehículo de alquiler, eliminar datos existentes
      const { error: errorEliminar } = await supabase
        .from("alquileres")
        .delete()
        .eq("matricula", matricula.toUpperCase())

      if (errorEliminar) {
        console.error("Error al eliminar datos de alquiler:", errorEliminar)
        // No fallar por esto, solo log del error
      }
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/editar/${id}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error inesperado:", error)
    return {
      success: false,
      error: "Error inesperado al actualizar el coche",
    }
  }
}

export async function guardarSeccionBasica(id: string, formData: FormData) {
  try {
    const supabase = createClient()

    const cocheData = {
      matricula: (formData.get("matricula") as string).toUpperCase(),
      marca: formData.get("marca") as string,
      modelo: formData.get("modelo") as string,
      color: (formData.get("color") as string) || null,
      fechamatriculacion: (formData.get("fechamatriculacion") as string) || null,
      kms: formData.get("kms") ? Number.parseInt(formData.get("kms") as string) : 0,
      kw: formData.get("kw") ? Number.parseInt(formData.get("kw") as string) : null,
      cv: formData.get("cv") ? Number.parseInt(formData.get("cv") as string) : null,
      cc: formData.get("cc") ? Number.parseInt(formData.get("cc") as string) : null,
      combustible: formData.get("combustible") as string,
      preciocompra: formData.get("preciocompra") ? Number.parseFloat(formData.get("preciocompra") as string) : null,
      extras: (formData.get("extras") as string) || null,
      donante: formData.get("donante") === "on",
      alquiler: formData.get("alquiler") === "on",
    }

    const { error } = await supabase.from("coches").update(cocheData).eq("id", id)

    if (error) {
      return { success: false, error: "Error al guardar información básica" }
    }

    revalidatePath(`/coches/editar/${id}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: "Error inesperado" }
  }
}

export async function guardarSeccionAlquiler(id: string, formData: FormData) {
  try {
    const supabase = createClient()

    // Obtener la matrícula del coche
    const { data: coche } = await supabase.from("coches").select("matricula, alquiler").eq("id", id).single()

    if (!coche) {
      return { success: false, error: "Coche no encontrado" }
    }

    const alquiler = formData.get("alquiler") === "on"

    // Actualizar el campo alquiler en la tabla coches
    await supabase.from("coches").update({ alquiler }).eq("id", id)

    if (alquiler) {
      const fechaInicio = formData.get("fecha_inicio") as string
      const fechaFin = formData.get("fecha_fin") as string
      const importeAnual = formData.get("importe_anual") as string
      const compania = formData.get("compania") as string
      const kmsAnuales = formData.get("kms_anuales") as string

      const alquilerData = {
        matricula: coche.matricula,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        importe_anual: importeAnual && importeAnual.trim() !== "" ? Number.parseFloat(importeAnual) : null,
        compania: compania || null,
        kms_anuales: kmsAnuales && kmsAnuales.trim() !== "" ? Number.parseInt(kmsAnuales) : null,
      }

      // Verificar si ya existe
      const { data: existente } = await supabase
        .from("alquileres")
        .select("id")
        .eq("matricula", coche.matricula)
        .single()

      if (existente) {
        const { error } = await supabase.from("alquileres").update(alquilerData).eq("matricula", coche.matricula)

        if (error) {
          return { success: false, error: "Error al actualizar datos del alquiler" }
        }
      } else {
        const { error } = await supabase.from("alquileres").insert(alquilerData)

        if (error) {
          return { success: false, error: "Error al crear datos del alquiler" }
        }
      }
    } else {
      // Eliminar datos de alquiler si no es vehículo de alquiler
      await supabase.from("alquileres").delete().eq("matricula", coche.matricula)
    }

    revalidatePath(`/coches/editar/${id}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: "Error inesperado" }
  }
}

export async function guardarSeccionAsignacion(id: string, formData: FormData) {
  try {
    const supabase = createClient()

    const empleado_id = formData.get("empleado_id") as string
    const fecha_asignacion = formData.get("fecha_asignacion") as string
    const observaciones_asignacion = formData.get("observaciones_asignacion") as string

    const asignacionData = {
      empleado_id: empleado_id && empleado_id !== "0" ? Number.parseInt(empleado_id) : null,
      fecha_asignacion: fecha_asignacion || null,
      observaciones_asignacion: observaciones_asignacion || null,
    }

    const { error } = await supabase.from("coches").update(asignacionData).eq("id", id)

    if (error) {
      return { success: false, error: "Error al guardar asignación" }
    }

    revalidatePath(`/coches/editar/${id}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: "Error inesperado" }
  }
}
