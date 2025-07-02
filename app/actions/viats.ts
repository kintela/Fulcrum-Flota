"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function obtenerTarjetasViat() {
  try {
    const { data, error } = await supabase.from("viats").select("*").eq("activo", true).order("id", { ascending: true })

    if (error) {
      console.error("Error al obtener tarjetas ViaT:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error en obtenerTarjetasViat:", error)
    return []
  }
}

export async function obtenerTarjetaViatAsignada(empleadoId: number) {
  try {
    const { data, error } = await supabase
      .from("viat_empleados")
      .select(`
        *,
        viats (*)
      `)
      .eq("empleado_id", empleadoId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error al obtener tarjeta ViaT asignada:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error en obtenerTarjetaViatAsignada:", error)
    return null
  }
}

export async function asignarTarjetaViat(empleadoId: number, viatId: number, observaciones?: string) {
  try {
    // Verificar que la tarjeta ViaT existe y está activa
    const { data: viat, error: viatError } = await supabase
      .from("viats")
      .select("*")
      .eq("id", viatId)
      .eq("activo", true)
      .single()

    if (viatError || !viat) {
      return {
        success: false,
        error: "La tarjeta ViaT no existe o no está activa",
      }
    }

    // Verificar que el empleado existe
    const { data: empleado, error: empleadoError } = await supabase
      .from("empleados")
      .select("id")
      .eq("id", empleadoId)
      .single()

    if (empleadoError || !empleado) {
      return {
        success: false,
        error: "El empleado no existe",
      }
    }

    // Verificar que la tarjeta no esté ya asignada a otro empleado
    const { data: asignacionExistente, error: asignacionError } = await supabase
      .from("viat_empleados")
      .select("*")
      .eq("viat_id", viatId)

    if (asignacionError && asignacionError.code !== "PGRST116") {
      console.error("Error al verificar asignación existente:", asignacionError)
      return {
        success: false,
        error: "Error al verificar la asignación existente",
      }
    }

    if (asignacionExistente && asignacionExistente.length > 0) {
      return {
        success: false,
        error: "Esta tarjeta ViaT ya está asignada a otro empleado",
      }
    }

    // Eliminar cualquier asignación previa del empleado
    await supabase.from("viat_empleados").delete().eq("empleado_id", empleadoId)

    // Crear nueva asignación
    const { data, error } = await supabase
      .from("viat_empleados")
      .insert([
        {
          viat_id: viatId,
          empleado_id: empleadoId,
          fecha_asignacion: new Date().toISOString(),
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

export async function desasignarTarjetaViat(empleadoId: number) {
  try {
    const { data, error } = await supabase.from("viat_empleados").delete().eq("empleado_id", empleadoId).select()

    if (error) {
      console.error("Error al desasignar tarjeta ViaT:", error)
      return {
        success: false,
        error: `Error al desasignar la tarjeta ViaT: ${error.message}`,
      }
    }

    revalidatePath("/coches")
    return {
      success: true,
      data: data,
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

    // Verificar que el número de tarjeta no exista ya
    const { data: tarjetaExistente, error: existeError } = await supabase
      .from("viats")
      .select("id")
      .eq("id", Number.parseInt(numeroTarjeta))
      .single()

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
          id: Number.parseInt(numeroTarjeta),
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

export async function obtenerHistorialViatEmpleado(empleadoId: number) {
  try {
    const { data, error } = await supabase
      .from("viat_empleados")
      .select(`
        *,
        viats (*)
      `)
      .eq("empleado_id", empleadoId)
      .order("fecha_asignacion", { ascending: false })

    if (error) {
      console.error("Error al obtener historial ViaT:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error en obtenerHistorialViatEmpleado:", error)
    return []
  }
}
