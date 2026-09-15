"use server"

import { supabaseServer as supabase } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

function normalizarMatricula(matricula: string) {
  return matricula.trim().toUpperCase()
}

export async function obtenerTarjetasViat(matricula?: string | null) {
  try {
    const matriculaNormalizada = normalizarMatricula(matricula || "")
    const { data, error } = await supabase.from("viats").select("*").eq("activo", true).order("id", { ascending: true })

    if (error) {
      console.error("Error al obtener tarjetas ViaT:", error)
      throw error
    }

    const tarjetas = data || []
    if (tarjetas.length === 0) return []

    const { data: asignacionesActivas, error: asignacionesError } = await supabase
      .from("viat_coches")
      .select("viat_id, matricula")
      .is("fecha_desasignacion", null)

    if (asignacionesError) {
      console.error("Error al obtener asignaciones activas ViaT:", asignacionesError)
      throw asignacionesError
    }

    const matriculaPorViat = new Map(
      (asignacionesActivas || []).map((asignacion) => [
        String(asignacion.viat_id || "").trim(),
        normalizarMatricula(asignacion.matricula || ""),
      ]),
    )

    return tarjetas.map((tarjeta) => {
      const matriculaAsignada = matriculaPorViat.get(String(tarjeta.id || "").trim()) || null

      return {
        ...tarjeta,
        matricula_asignada: matriculaAsignada,
        disponible: !matriculaAsignada || matriculaAsignada === matriculaNormalizada,
      }
    })
  } catch (error) {
    console.error("Error en obtenerTarjetasViat:", error)
    throw error
  }
}

export async function obtenerTarjetaViatAsignada(matricula: string) {
  try {
    const matriculaNormalizada = normalizarMatricula(matricula || "")
    if (!matriculaNormalizada) return null

    const { data, error } = await supabase
      .from("viat_coches")
      .select(
        `
        *,
        viats (*)
      `,
      )
      .eq("matricula", matriculaNormalizada)
      .is("fecha_desasignacion", null)
      .order("fecha_asignacion", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== "PGRST116") {
      console.error("Error al obtener tarjeta ViaT asignada:", error)
      return null
    }

    return data || null
  } catch (error) {
    console.error("Error en obtenerTarjetaViatAsignada:", error)
    return null
  }
}

export async function asignarTarjetaViat(matricula: string, viatId: string, observaciones?: string) {
  try {
    const matriculaNormalizada = normalizarMatricula(matricula || "")
    const viatIdNormalizado = (viatId || "").trim()

    if (!matriculaNormalizada) {
      return {
        success: false,
        error: "La matrícula es obligatoria",
      }
    }

    if (!viatIdNormalizado) {
      return {
        success: false,
        error: "Debes seleccionar una tarjeta ViaT",
      }
    }

    // Verificar que la tarjeta ViaT existe y está activa
    const { data: viat, error: viatError } = await supabase
      .from("viats")
      .select("id")
      .eq("id", viatIdNormalizado)
      .eq("activo", true)
      .maybeSingle()

    if (viatError || !viat) {
      return {
        success: false,
        error: "La tarjeta ViaT no existe o no está activa",
      }
    }

    // Verificar que el coche existe
    const { data: coche, error: cocheError } = await supabase
      .from("coches")
      .select("matricula")
      .eq("matricula", matriculaNormalizada)
      .maybeSingle()

    if (cocheError || !coche) {
      return {
        success: false,
        error: "El coche no existe",
      }
    }

    // Verificar que la tarjeta no esté activa en otro coche
    const { data: asignacionExistente, error: asignacionError } = await supabase
      .from("viat_coches")
      .select("id, matricula, observaciones")
      .eq("viat_id", viatIdNormalizado)
      .is("fecha_desasignacion", null)

    if (asignacionError && asignacionError.code !== "PGRST116") {
      console.error("Error al verificar asignación existente:", asignacionError)
      return {
        success: false,
        error: "Error al verificar la asignación existente",
      }
    }

    const activaEnOtroCoche = (asignacionExistente || []).find((a) => a.matricula !== matriculaNormalizada)
    if (activaEnOtroCoche) {
      return {
        success: false,
        error: `Esta tarjeta ViaT ya está asignada al coche ${activaEnOtroCoche.matricula}`,
      }
    }

    // Si ya está asignada al mismo coche, actualizar observaciones y salir
    const mismaAsignacion = (asignacionExistente || []).find((a) => a.matricula === matriculaNormalizada)
    if (mismaAsignacion) {
      if (observaciones !== undefined) {
        const { error: updateObsError } = await supabase
          .from("viat_coches")
          .update({ observaciones: observaciones || null })
          .eq("id", mismaAsignacion.id)

        if (updateObsError) {
          console.error("Error al actualizar observaciones ViaT:", updateObsError)
          return {
            success: false,
            error: `Error al actualizar observaciones: ${updateObsError.message}`,
          }
        }
      }

      revalidatePath("/coches")
      revalidatePath(`/coches/detalle/${matriculaNormalizada}`)
      revalidatePath(`/coches/editar/${matriculaNormalizada}`)

      return {
        success: true,
        data: mismaAsignacion,
      }
    }

    // Cerrar asignación activa anterior de este coche (mantener historial)
    const fechaActual = new Date().toISOString().split("T")[0]
    const { error: cerrarError } = await supabase
      .from("viat_coches")
      .update({ fecha_desasignacion: fechaActual })
      .eq("matricula", matriculaNormalizada)
      .is("fecha_desasignacion", null)

    if (cerrarError) {
      console.error("Error al cerrar asignación ViaT anterior:", cerrarError)
      return {
        success: false,
        error: `Error al cerrar asignación anterior: ${cerrarError.message}`,
      }
    }

    // Crear nueva asignación
    const { data, error } = await supabase
      .from("viat_coches")
      .insert([
        {
          viat_id: viatIdNormalizado,
          matricula: matriculaNormalizada,
          fecha_asignacion: fechaActual,
          fecha_desasignacion: null,
          observaciones: observaciones || null,
        },
      ])
      .select()

    if (error) {
      console.error("Error al asignar tarjeta ViaT:", error)
      return {
        success: false,
        error: `Error al asignar la tarjeta ViaT: ${error.message}`,
      }
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matriculaNormalizada}`)
    revalidatePath(`/coches/editar/${matriculaNormalizada}`)

    return {
      success: true,
      data: data[0],
    }
  } catch (error) {
    console.error("Error en asignarTarjetaViat:", error)
    return {
      success: false,
      error: "Error inesperado al asignar la tarjeta ViaT",
    }
  }
}

export async function desasignarTarjetaViat(matricula: string) {
  try {
    const matriculaNormalizada = normalizarMatricula(matricula || "")
    if (!matriculaNormalizada) {
      return {
        success: false,
        error: "La matrícula es obligatoria",
      }
    }

    const fechaActual = new Date().toISOString().split("T")[0]
    const { data, error } = await supabase
      .from("viat_coches")
      .update({ fecha_desasignacion: fechaActual })
      .eq("matricula", matriculaNormalizada)
      .is("fecha_desasignacion", null)
      .select()

    if (error) {
      console.error("Error al desasignar tarjeta ViaT:", error)
      return {
        success: false,
        error: `Error al desasignar la tarjeta ViaT: ${error.message}`,
      }
    }

    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matriculaNormalizada}`)
    revalidatePath(`/coches/editar/${matriculaNormalizada}`)

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("Error en desasignarTarjetaViat:", error)
    return {
      success: false,
      error: "Error inesperado al desasignar la tarjeta ViaT",
    }
  }
}

export async function crearTarjetaViat(numeroTarjeta: string, fechaCaducidad: string) {
  try {
    // Validar número de tarjeta
    if (!numeroTarjeta) {
      return {
        success: false,
        error: "El número de tarjeta es obligatorio",
      }
    }

    // Validar que el número tenga exactamente 16 dígitos
    if (!/^\d{16}$/.test(numeroTarjeta)) {
      return {
        success: false,
        error: "El número de tarjeta debe tener exactamente 16 dígitos",
      }
    }

    // Validar fecha de caducidad
    if (!fechaCaducidad) {
      return {
        success: false,
        error: "La fecha de caducidad es obligatoria",
      }
    }

    const fechaCaducidadDate = new Date(fechaCaducidad)
    if (isNaN(fechaCaducidadDate.getTime())) {
      return {
        success: false,
        error: "La fecha de caducidad no es válida",
      }
    }

    const numeroTarjetaNormalizado = numeroTarjeta.trim()

    // Verificar que el número de tarjeta no exista ya
    const { data: tarjetaExistente, error: existeError } = await supabase
      .from("viats")
      .select("id")
      .eq("id", numeroTarjetaNormalizado)
      .maybeSingle()

    if (existeError && existeError.code !== "PGRST116") {
      console.error("Error al verificar tarjeta existente:", existeError)
      return {
        success: false,
        error: "Error al verificar si la tarjeta ya existe",
      }
    }

    if (tarjetaExistente) {
      return {
        success: false,
        error: "Ya existe una tarjeta ViaT con este número",
      }
    }

    const { data, error } = await supabase
      .from("viats")
      .insert([
        {
          id: numeroTarjetaNormalizado,
          fechacaducidad: fechaCaducidad,
          activo: true,
        },
      ])
      .select()

    if (error) {
      console.error("Error al crear tarjeta ViaT:", error)
      return {
        success: false,
        error: `Error al crear la tarjeta ViaT: ${error.message}`,
      }
    }

    revalidatePath("/coches")
    return {
      success: true,
      data: data[0],
    }
  } catch (error) {
    console.error("Error en crearTarjetaViat:", error)
    return {
      success: false,
      error: "Error inesperado al crear la tarjeta ViaT",
    }
  }
}

export async function obtenerHistorialViatCoche(matricula: string) {
  try {
    const matriculaNormalizada = normalizarMatricula(matricula || "")
    if (!matriculaNormalizada) return []

    const { data, error } = await supabase
      .from("viat_coches")
      .select(
        `
        *,
        viats (*)
      `,
      )
      .eq("matricula", matriculaNormalizada)
      .not("fecha_desasignacion", "is", null)
      .order("fecha_asignacion", { ascending: false })

    if (error) {
      console.error("Error al obtener historial ViaT:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error en obtenerHistorialViatCoche:", error)
    return []
  }
}

// Alias temporal para compatibilidad de imports antiguos.
export const obtenerHistorialViatEmpleado = obtenerHistorialViatCoche
