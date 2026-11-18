// Autorización en servidor para páginas y Server Actions (spec 017).
// Solo debe importarse desde código de servidor: usa el cliente Supabase con
// service role y `redirect` de next/navigation.

import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { supabaseServer as supabase } from "@/lib/supabase-server"
import { esRolAdministrador } from "@/lib/user-role"

export const URL_SIN_PERMISO = "/?aviso=sin-permiso"

export const ERROR_NO_AUTENTICADO = "Usuario no autenticado"
export const ERROR_NO_AUTORIZADO = "No autorizado"

export type ContextoAutorizacion =
  | { autenticado: false }
  | {
      autenticado: true
      email: string
      /** Registro principal: el de la sesión si está entre los candidatos; si no, el de menor id. */
      empleadoId: number | null
      /** Todos los registros de `empleados` del usuario (mismo email y/o id de la sesión). */
      empleadoIds: number[]
      esAdmin: boolean
    }

export type ContextoAutenticado = Extract<ContextoAutorizacion, { autenticado: true }>

export type ResultadoAutorizacion =
  | { ok: true; ctx: ContextoAutenticado }
  | { ok: false; error: typeof ERROR_NO_AUTENTICADO | typeof ERROR_NO_AUTORIZADO }

type FilaEmpleado = { id: number | string | null; role: unknown; email?: unknown }

function normalizarEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

/**
 * Registros de `empleados` del usuario, con el mismo criterio que `obtenerEmpleadosSesion`
 * (app/actions/reservas-temporales.ts), para que la autorización vea las mismas reservas que
 * "Mis reservas" (spec 018, corrección del 2026-11-18):
 * - coincidencia exacta normalizada sobre una búsqueda `ilike` por email;
 * - si no hay ninguna (p. ej. email guardado con espacios), recorrido completo de la tabla;
 * - el `empleadoId` de la sesión, aunque su email no coincida.
 */
async function obtenerEmpleadosDelUsuario(email: string, empleadoIdSesion: number | null): Promise<FilaEmpleado[]> {
  const { data, error } = await supabase.from("empleados").select("id, role, email").ilike("email", email)
  if (error) throw error

  let candidatos = ((data ?? []) as FilaEmpleado[]).filter((fila) => normalizarEmail(fila.email) === email)

  if (candidatos.length === 0) {
    const { data: todos, error: todosError } = await supabase.from("empleados").select("id, role, email")
    if (todosError) throw todosError
    candidatos = ((todos ?? []) as FilaEmpleado[]).filter((fila) => normalizarEmail(fila.email) === email)
  }

  if (empleadoIdSesion !== null && !candidatos.some((fila) => Number(fila.id) === empleadoIdSesion)) {
    const { data: filaSesion } = await supabase
      .from("empleados")
      .select("id, role, email")
      .eq("id", empleadoIdSesion)
      .maybeSingle()
    if (filaSesion) candidatos.push(filaSesion as FilaEmpleado)
  }

  return candidatos
}

/**
 * Resuelve la sesión y el rol vigente del empleado consultando `empleados` en cada
 * llamada (RF-4): no se usa el rol guardado en el JWT, que no se refresca.
 */
export async function obtenerContexto(): Promise<ContextoAutorizacion> {
  const session = await getServerSession(authOptions)
  const email = normalizarEmail(session?.user?.email)

  if (!email) {
    return { autenticado: false }
  }

  const idSesion = Number((session?.user as { empleadoId?: unknown } | undefined)?.empleadoId)
  const empleadoIdSesion = Number.isInteger(idSesion) ? idSesion : null

  try {
    const filas = (await obtenerEmpleadosDelUsuario(email, empleadoIdSesion))
      .map((fila) => ({ ...fila, id: Number(fila.id) }))
      .filter((fila) => Number.isInteger(fila.id))

    const porId = new Map(filas.map((fila) => [fila.id, fila]))
    const empleadoIds = Array.from(porId.keys()).sort((a, b) => a - b)

    if (empleadoIds.length === 0) {
      return { autenticado: true, email, empleadoId: null, empleadoIds: [], esAdmin: false }
    }

    const empleadoId = empleadoIdSesion !== null && porId.has(empleadoIdSesion) ? empleadoIdSesion : empleadoIds[0]

    return {
      autenticado: true,
      email,
      empleadoId,
      empleadoIds,
      esAdmin: esRolAdministrador(porId.get(empleadoId)?.role),
    }
  } catch (error) {
    console.error("Error en obtenerContexto:", error)
    return { autenticado: true, email, empleadoId: null, empleadoIds: [], esAdmin: false }
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
 * Spec 018 (RF-18, sustituye a 017 RF-8): el usuario está relacionado con el coche si (a) se le
 * ha asignado de forma permanente (`coches.asignadoa` es su id) o (b) tiene una reserva temporal
 * activa o vencida (terminada pero aún sin completar: todavía tiene el coche).
 * La matrícula se compara con el mismo valor que usa la ficha, sin normalizar.
 */
export async function estaRelacionadoConCoche(empleadoIds: number[], matricula: string): Promise<boolean> {
  if (empleadoIds.length === 0) return false

  const { data: coche, error: cocheError } = await supabase
    .from("coches")
    .select("asignadoa")
    .eq("matricula", matricula)
    .maybeSingle()

  if (cocheError) {
    console.error("Error al comprobar la asignación del coche:", cocheError)
  } else if (coche) {
    const asignado = idAsignado((coche as { asignadoa: unknown }).asignadoa)
    if (asignado !== null && empleadoIds.includes(asignado)) return true
  }

  const { data: reservas, error: reservasError } = await supabase
    .from("reservas")
    .select("id")
    .eq("matricula", matricula)
    .in("empleado_id", empleadoIds)
    .in("estado", ["activa", "vencida"])
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
  if (ctx.empleadoIds.length === 0 || !matriculaTexto) return { ok: false, error: ERROR_NO_AUTORIZADO }

  try {
    if (await estaRelacionadoConCoche(ctx.empleadoIds, matriculaTexto)) {
      return { ok: true, ctx }
    }
  } catch (error) {
    console.error("Error en autorizarLecturaCoche:", error)
  }

  return { ok: false, error: ERROR_NO_AUTORIZADO }
}

/** Respuesta HTTP de un endpoint /api rechazado (spec 018, RF-16): 401 sin sesión, 403 sin permiso. */
export function respuestaRechazoApi(error: string): NextResponse {
  return NextResponse.json({ error }, { status: error === ERROR_NO_AUTENTICADO ? 401 : 403 })
}
