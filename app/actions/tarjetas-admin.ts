"use server"

import { getServerSession } from "next-auth/next"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { supabaseServer as supabase } from "@/lib/supabase-server"

export interface TarjetaSolredAdmin {
  numero_tarjeta: string
  pin: string
  fechavencimiento: string
  activa: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface TarjetaViatAdmin {
  id: string
  fechacaducidad: string
  activo: boolean | null
  created_at: string | null
  updated_at: string | null
}

function normalizarEmail(email: string) {
  return email.trim().toLowerCase()
}

function esAdminRole(role: string | null | undefined) {
  const roleNormalizado = String(role || "").toLowerCase()
  return roleNormalizado === "administrador" || roleNormalizado === "admin"
}

function esFechaValida(fecha: string) {
  const parsed = new Date(fecha)
  return Number.isFinite(parsed.getTime())
}

async function validarAdmin() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return { success: false as const, error: "Usuario no autenticado" }
  }

  if (esAdminRole(session.user.role)) {
    return { success: true as const }
  }

  const emailNormalizado = normalizarEmail(session.user.email)
  const { data: empleados, error: empleadosError } = await supabase
    .from("empleados")
    .select("email, role")
    .ilike("email", emailNormalizado)

  if (empleadosError) {
    console.error("Error verificando permisos admin:", empleadosError)
    return { success: false as const, error: "Error verificando permisos de usuario" }
  }

  const empleado = (empleados || []).find((e) => normalizarEmail(String(e.email || "")) === emailNormalizado)
  if (!empleado || !esAdminRole(empleado.role)) {
    return { success: false as const, error: "Acceso no autorizado - Solo administradores" }
  }

  return { success: true as const }
}

export async function obtenerTarjetasSolredAdmin() {
  try {
    const acceso = await validarAdmin()
    if (!acceso.success) {
      return { success: false as const, error: acceso.error, tarjetas: [] as TarjetaSolredAdmin[] }
    }

    const { data, error } = await supabase
      .from("tarjetassolred")
      .select("numero_tarjeta, pin, fechavencimiento, activa, created_at, updated_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error al obtener tarjetas SOLRED (admin):", error)
      return { success: false as const, error: "Error al obtener tarjetas SOLRED", tarjetas: [] as TarjetaSolredAdmin[] }
    }

    return { success: true as const, tarjetas: (data || []) as TarjetaSolredAdmin[] }
  } catch (error) {
    console.error("Error en obtenerTarjetasSolredAdmin:", error)
    return { success: false as const, error: "Error inesperado al obtener tarjetas SOLRED", tarjetas: [] as TarjetaSolredAdmin[] }
  }
}

export async function obtenerTarjetasViatAdmin() {
  try {
    const acceso = await validarAdmin()
    if (!acceso.success) {
      return { success: false as const, error: acceso.error, tarjetas: [] as TarjetaViatAdmin[] }
    }

    const { data, error } = await supabase
      .from("viats")
      .select("id, fechacaducidad, activo, created_at, updated_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error al obtener tarjetas ViaT (admin):", error)
      return { success: false as const, error: "Error al obtener tarjetas ViaT", tarjetas: [] as TarjetaViatAdmin[] }
    }

    return { success: true as const, tarjetas: (data || []) as TarjetaViatAdmin[] }
  } catch (error) {
    console.error("Error en obtenerTarjetasViatAdmin:", error)
    return { success: false as const, error: "Error inesperado al obtener tarjetas ViaT", tarjetas: [] as TarjetaViatAdmin[] }
  }
}

export async function crearTarjetaSolredAdmin(numeroTarjeta: string, pin: string, fechaVencimiento: string) {
  try {
    const acceso = await validarAdmin()
    if (!acceso.success) {
      return { success: false as const, error: acceso.error }
    }

    const numeroNormalizado = String(numeroTarjeta || "").trim()
    const pinNormalizado = String(pin || "").trim()
    const fechaNormalizada = String(fechaVencimiento || "").trim()

    if (!/^\d{1,20}$/.test(numeroNormalizado)) {
      return { success: false as const, error: "El número de tarjeta SOLRED debe contener entre 1 y 20 dígitos" }
    }

    if (!/^\d{4}$/.test(pinNormalizado)) {
      return { success: false as const, error: "El PIN de SOLRED debe tener exactamente 4 dígitos" }
    }

    if (!fechaNormalizada || !esFechaValida(fechaNormalizada)) {
      return { success: false as const, error: "La fecha de vencimiento de SOLRED no es válida" }
    }

    const { data: existente, error: existenteError } = await supabase
      .from("tarjetassolred")
      .select("numero_tarjeta")
      .eq("numero_tarjeta", numeroNormalizado)
      .maybeSingle()

    if (existenteError && existenteError.code !== "PGRST116") {
      console.error("Error verificando tarjeta SOLRED existente:", existenteError)
      return { success: false as const, error: "Error al verificar si la tarjeta SOLRED ya existe" }
    }

    if (existente) {
      return { success: false as const, error: "Ya existe una tarjeta SOLRED con ese número" }
    }

    const { error: insertError } = await supabase.from("tarjetassolred").insert([
      {
        numero_tarjeta: numeroNormalizado,
        pin: pinNormalizado,
        fechavencimiento: fechaNormalizada,
        activa: true,
      },
    ])

    if (insertError) {
      console.error("Error insertando tarjeta SOLRED:", insertError)
      return { success: false as const, error: `No se pudo crear la tarjeta SOLRED: ${insertError.message}` }
    }

    revalidatePath("/tarjetas")
    revalidatePath("/coches")

    return { success: true as const, message: "Tarjeta SOLRED creada correctamente" }
  } catch (error) {
    console.error("Error en crearTarjetaSolredAdmin:", error)
    return { success: false as const, error: "Error inesperado al crear tarjeta SOLRED" }
  }
}

export async function crearTarjetaViatAdmin(id: string, fechaCaducidad: string) {
  try {
    const acceso = await validarAdmin()
    if (!acceso.success) {
      return { success: false as const, error: acceso.error }
    }

    const idNormalizado = String(id || "").trim()
    const fechaNormalizada = String(fechaCaducidad || "").trim()

    if (!/^\d{1,16}$/.test(idNormalizado)) {
      return { success: false as const, error: "El identificador ViaT debe contener entre 1 y 16 dígitos" }
    }

    if (!fechaNormalizada || !esFechaValida(fechaNormalizada)) {
      return { success: false as const, error: "La fecha de caducidad ViaT no es válida" }
    }

    const { data: existente, error: existenteError } = await supabase.from("viats").select("id").eq("id", idNormalizado).maybeSingle()

    if (existenteError && existenteError.code !== "PGRST116") {
      console.error("Error verificando tarjeta ViaT existente:", existenteError)
      return { success: false as const, error: "Error al verificar si la tarjeta ViaT ya existe" }
    }

    if (existente) {
      return { success: false as const, error: "Ya existe una tarjeta ViaT con ese identificador" }
    }

    const { error: insertError } = await supabase.from("viats").insert([
      {
        id: idNormalizado,
        fechacaducidad: fechaNormalizada,
        activo: true,
      },
    ])

    if (insertError) {
      console.error("Error insertando tarjeta ViaT:", insertError)
      return { success: false as const, error: `No se pudo crear la tarjeta ViaT: ${insertError.message}` }
    }

    revalidatePath("/tarjetas")
    revalidatePath("/coches")

    return { success: true as const, message: "Tarjeta ViaT creada correctamente" }
  } catch (error) {
    console.error("Error en crearTarjetaViatAdmin:", error)
    return { success: false as const, error: "Error inesperado al crear tarjeta ViaT" }
  }
}
