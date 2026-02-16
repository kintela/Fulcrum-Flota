"use server"

import { supabaseServer as supabase } from "@/lib/supabase-server"

export async function obtenerITVsPorMatricula(matricula: string) {
  try {
    const { data, error } = await supabase
      .from("itvs")
      .select("*")
      .eq("matricula", matricula)
      .order("fechaproximarevision", { ascending: false })

    if (error) {
      console.error("Error al obtener ITVs:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error al obtener ITVs:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

export async function crearITV(formData: FormData) {
  try {
    const itvData: any = {
      matricula: formData.get("matricula") as string,
      fechaproximarevision: formData.get("fechaproximarevision") as string,
    }

    // Solo añadir campos si tienen valor
    const fecharevision = formData.get("fecharevision") as string
    if (fecharevision) {
      itvData.fecharevision = fecharevision
    }

    const resultado = formData.get("resultado") as string
    if (resultado) {
      itvData.resultado = resultado
    }

    const observaciones = formData.get("observaciones") as string
    if (observaciones) {
      itvData.observaciones = observaciones
    }

    const coste = formData.get("coste") as string
    if (coste) {
      itvData.coste = Number.parseFloat(coste)
    }

    const estacion_itv = formData.get("estacion_itv") as string
    if (estacion_itv) {
      itvData.estacion_itv = estacion_itv
    }

    const numero_certificado = formData.get("numero_certificado") as string
    if (numero_certificado) {
      itvData.numero_certificado = numero_certificado
    }

    const { data, error } = await supabase.from("itvs").insert([itvData]).select()

    if (error) {
      console.error("Error al crear ITV:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data[0] }
  } catch (error) {
    console.error("Error al crear ITV:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

export async function actualizarITV(id: number, formData: FormData) {
  try {
    const tipoRegistro = formData.get("tipoRegistro") as string

    const itvData: any = {
      fechaproximarevision: formData.get("fechaproximarevision") as string,
    }

    // Manejar campos según el tipo de registro
    if (tipoRegistro === "realizada") {
      const fecharevision = formData.get("fecharevision") as string
      const resultado = formData.get("resultado") as string

      if (fecharevision) {
        itvData.fecharevision = fecharevision
      }
      if (resultado) {
        itvData.resultado = resultado
      }
    } else {
      // Para revisión programada, limpiar estos campos
      itvData.fecharevision = null
      itvData.resultado = null
    }

    // Campos opcionales
    const observaciones = formData.get("observaciones") as string
    if (observaciones) {
      itvData.observaciones = observaciones
    } else {
      itvData.observaciones = null
    }

    const coste = formData.get("coste") as string
    if (coste) {
      itvData.coste = Number.parseFloat(coste)
    } else {
      itvData.coste = null
    }

    const estacion_itv = formData.get("estacion_itv") as string
    if (estacion_itv) {
      itvData.estacion_itv = estacion_itv
    } else {
      itvData.estacion_itv = null
    }

    const numero_certificado = formData.get("numero_certificado") as string
    if (numero_certificado) {
      itvData.numero_certificado = numero_certificado
    } else {
      itvData.numero_certificado = null
    }

    const { data, error } = await supabase.from("itvs").update(itvData).eq("id", id).select()

    if (error) {
      console.error("Error al actualizar ITV:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data[0] }
  } catch (error) {
    console.error("Error al actualizar ITV:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

export async function eliminarITV(id: number) {
  try {
    const { error } = await supabase.from("itvs").delete().eq("id", id)

    if (error) {
      console.error("Error al eliminar ITV:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error al eliminar ITV:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}
