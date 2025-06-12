"use server"

import { supabase } from "@/lib/supabase"

export async function obtenerTarjetasSolred() {
  try {
    const { data, error } = await supabase.from("tarjetassolred").select("*").eq("activa", true).order("numero_tarjeta")

    if (error) {
      console.error("Error al obtener tarjetas SOLRED:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error en obtenerTarjetasSolred:", error)
    return []
  }
}

export async function asignarTarjetaSolred(matricula: string, numeroTarjeta: string) {
  try {
    // Verificar que la tarjeta existe y está activa
    const { data: tarjeta, error: tarjetaError } = await supabase
      .from("tarjetassolred")
      .select("*")
      .eq("numero_tarjeta", numeroTarjeta)
      .eq("activa", true)
      .single()

    if (tarjetaError || !tarjeta) {
      return {
        success: false,
        error: "La tarjeta SOLRED no existe o no está activa",
      }
    }

    // Desactivar asignación anterior si existe
    await supabase
      .from("solred_coches")
      .update({
        fecha_desasignacion: new Date().toISOString().split("T")[0],
        activa: false,
      })
      .eq("matricula", matricula)
      .eq("activa", true)

    // Crear nueva asignación
    const { data, error } = await supabase
      .from("solred_coches")
      .insert([
        {
          numero_tarjeta: numeroTarjeta,
          matricula: matricula,
          fecha_asignacion: new Date().toISOString().split("T")[0],
          fecha_desasignacion: null,
          activa: true,
        },
      ])
      .select()

    if (error) {
      console.error("Error al asignar tarjeta SOLRED:", error)
      return {
        success: false,
        error: `Error al asignar la tarjeta: ${error.message}`,
      }
    }

    return {
      success: true,
      data: data[0],
    }
  } catch (error) {
    console.error("Error en asignarTarjetaSolred:", error)
    return {
      success: false,
      error: "Error inesperado al asignar la tarjeta",
    }
  }
}

export async function desasignarTarjetaSolred(matricula: string) {
  try {
    const { data, error } = await supabase
      .from("solred_coches")
      .update({
        fecha_desasignacion: new Date().toISOString().split("T")[0],
        activa: false,
      })
      .eq("matricula", matricula)
      .eq("activa", true)
      .select()

    if (error) {
      console.error("Error al desasignar tarjeta SOLRED:", error)
      return {
        success: false,
        error: `Error al desasignar la tarjeta: ${error.message}`,
      }
    }

    return {
      success: true,
      data: data,
    }
  } catch (error) {
    console.error("Error en desasignarTarjetaSolred:", error)
    return {
      success: false,
      error: "Error inesperado al desasignar la tarjeta",
    }
  }
}

export async function obtenerTarjetaAsignada(matricula: string) {
  try {
    const { data, error } = await supabase
      .from("solred_coches")
      .select(`
        *,
        tarjetassolred (
          numero_tarjeta,
          pin,
          fechavencimiento
        )
      `)
      .eq("matricula", matricula)
      .eq("activa", true)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error al obtener tarjeta asignada:", error)
      return null
    }

    return data || null
  } catch (error) {
    console.error("Error en obtenerTarjetaAsignada:", error)
    return null
  }
}

export async function crearTarjetaSolred(numeroTarjeta: string, pin: string, fechaVencimiento: string) {
  try {
    // Validaciones
    if (!numeroTarjeta || numeroTarjeta.length !== 17 || !/^\d{17}$/.test(numeroTarjeta)) {
      return {
        success: false,
        error: "El número de tarjeta debe tener exactamente 17 dígitos",
      }
    }

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return {
        success: false,
        error: "El PIN debe tener exactamente 4 dígitos",
      }
    }

    if (!fechaVencimiento) {
      return {
        success: false,
        error: "La fecha de vencimiento es obligatoria",
      }
    }

    // Verificar si ya existe una tarjeta con ese número
    const { data: tarjetaExistente, error: errorBusqueda } = await supabase
      .from("tarjetassolred")
      .select("numero_tarjeta")
      .eq("numero_tarjeta", numeroTarjeta)
      .single()

    if (errorBusqueda && errorBusqueda.code !== "PGRST116") {
      console.error("Error al verificar tarjeta duplicada:", errorBusqueda)
      return {
        success: false,
        error: "Error al verificar el número de tarjeta",
      }
    }

    if (tarjetaExistente) {
      return {
        success: false,
        error: `Ya existe una tarjeta con el número ${numeroTarjeta}`,
      }
    }

    // Crear la nueva tarjeta
    const { data, error } = await supabase
      .from("tarjetassolred")
      .insert([
        {
          numero_tarjeta: numeroTarjeta,
          pin: pin,
          fechavencimiento: fechaVencimiento,
          activa: true,
        },
      ])
      .select()

    if (error) {
      console.error("Error al crear tarjeta SOLRED:", error)
      return {
        success: false,
        error: `Error al crear la tarjeta: ${error.message}`,
      }
    }

    return {
      success: true,
      data: data[0],
    }
  } catch (error) {
    console.error("Error en crearTarjetaSolred:", error)
    return {
      success: false,
      error: "Error inesperado al crear la tarjeta",
    }
  }
}
