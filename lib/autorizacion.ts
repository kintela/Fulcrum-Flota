// Autorización en servidor para páginas y Server Actions (spec 017).
// Solo debe importarse desde código de servidor: usa el cliente Supabase con
// service role y `redirect` de next/navigation.

import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { supabaseServer as supabase } from "@/lib/supabase-server"
import { esRolAdministrador } from "@/lib/user-role"

export const URL_SIN_PERMISO = "/?aviso=sin-permiso"

export const ERROR_NO_AUTENTICADO = "Usuario no autenticado"
export const ERROR_NO_AUTORIZADO = "No autorizado"

export type ContextoAutorizacion =
  | { autenticado: false }
  | { autenticado: true; email: string; empleadoId: number | null; esAdmin: boolean }

export type ContextoAutenticado = Extract<ContextoAutorizacion, { autenticado: true }>

export type ResultadoAutorizacion =
  | { ok: true; ctx: ContextoAutenticado }
  | { ok: false; error: typeof ERROR_NO_AUTENTICADO | typeof ERROR_NO_AUTORIZADO }

/**
 * Resuelve la sesión y el rol vigente del empleado consultando `empleados` en cada
 * llamada (RF-4): no se usa el rol guardado en el JWT, que no se refresca.
 */
export async function obtenerContexto(): Promise<ContextoAutorizacion> {
  const session = await getServerSession(authOptions)
  const email = String(session?.user?.email || "").trim().toLowerCase()

  if (!email) {
    return { autenticado: false }
  }

  try {
    // Búsqueda sin distinguir mayúsculas (los emails guardados pueden no estar normalizados)
    // y comparación exacta posterior para que `_` o `%` de ilike no casen con otro email.
    const { data, error } = await supabase.from("empleados").select("id, role, email").ilike("email", email)

    const empleado = (Array.isArray(data) ? data : []).find(
      (fila: { email?: unknown }) => String(fila.email ?? "").trim().toLowerCase() === email,
    ) as { id: number | string | null; role: unknown } | undefined

    if (error || !empleado) {
      if (error) console.error("Error al obtener el rol del empleado:", error)
      return { autenticado: true, email, empleadoId: null, esAdmin: false }
    }

    const empleadoId = Number(empleado.id)

    return {
      autenticado: true,
      email,
      empleadoId: Number.isFinite(empleadoId) ? empleadoId : null,
      esAdmin: esRolAdministrador(empleado.role),
    }
  } catch (error) {
    console.error("Error en obtenerContexto:", error)
    return { autenticado: true, email, empleadoId: null, esAdmin: false }
  }
}

/** Para páginas de administración: redirige al dashboard con aviso si no es administrador (RF-2). */
export async function requerirAdminPagina(): Promise<ContextoAutenticado> {
  const ctx = await obtenerContexto()
  if (!ctx.autenticado || !ctx.esAdmin) {
    redirect(URL_SIN_PERMISO)
  }
  return ctx
}

/** Para Server Actions de gestión (RF-11, RF-12). */
export async function autorizarAdmin(): Promise<ResultadoAutorizacion> {
  const ctx = await obtenerContexto()
  if (!ctx.autenticado) return { ok: false, error: ERROR_NO_AUTENTICADO }
  if (!ctx.esAdmin) return { ok: false, error: ERROR_NO_AUTORIZADO }
  return { ok: true, ctx }
}

function idAsignado(asignadoa: unknown): number | null {
  if (typeof asignadoa === "number" && Number.isFinite(asignadoa)) return asignadoa
  if (typeof asignadoa === "string" && /^\d+$/.test(asignadoa.trim())) return Number(asignadoa.trim())
  return null
}

/**
 * RF-8: el usuario está relacionado con el coche si (a) se le ha asignado de forma
 * permanente (`coches.asignadoa` es su id) o (b) tiene una reserva temporal activa.
 * La matrícula se compara con el mismo valor que usa la ficha, sin normalizar.
 */
export async function estaRelacionadoConCoche(empleadoId: number, matricula: string): Promise<boolean> {
  const { data: coche, error: cocheError } = await supabase
    .from("coches")
    .select("asignadoa")
    .eq("matricula", matricula)
    .maybeSingle()

  if (cocheError) {
    console.error("Error al comprobar la asignación del coche:", cocheError)
  } else if (coche && idAsignado((coche as { asignadoa: unknown }).asignadoa) === empleadoId) {
    return true
  }

  const { data: reservas, error: reservasError } = await supabase
    .from("reservas")
    .select("id")
    .eq("matricula", matricula)
    .eq("empleado_id", empleadoId)
    .eq("estado", "activa")
    .limit(1)

  if (reservasError) {
    console.error("Error al comprobar las reservas activas del coche:", reservasError)
    return false
  }

  return Array.isArray(reservas) && reservas.length > 0
}

/** Lectura de datos de un coche: administrador o usuario relacionado (RF-13). */
export async function autorizarLecturaCoche(matricula: string): Promise<ResultadoAutorizacion> {
  const ctx = await obtenerContexto()
  if (!ctx.autenticado) return { ok: false, error: ERROR_NO_AUTENTICADO }
  if (ctx.esAdmin) return { ok: true, ctx }

  const matriculaTexto = String(matricula ?? "")
  if (ctx.empleadoId === null || !matriculaTexto) return { ok: false, error: ERROR_NO_AUTORIZADO }

  try {
    if (await estaRelacionadoConCoche(ctx.empleadoId, matriculaTexto)) {
      return { ok: true, ctx }
    }
  } catch (error) {
    console.error("Error en autorizarLecturaCoche:", error)
  }

  return { ok: false, error: ERROR_NO_AUTORIZADO }
}
