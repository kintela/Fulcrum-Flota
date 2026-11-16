/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import type * as NextAuth from "next-auth/next"
import type * as Navigation from "next/navigation"
import type * as SupabaseServer from "@/lib/supabase-server"
import type * as Autorizacion from "@/lib/autorizacion"

/* eslint-disable @typescript-eslint/no-require-imports -- los módulos se cargan con require tras los mocks */
// Con `jest` importado de @jest/globals los jest.mock no se elevan: los módulos
// se cargan con require después de declarar los mocks.
jest.mock("next-auth/next", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))
jest.mock("@/lib/supabase-server", () => ({ supabaseServer: { from: jest.fn() } }))

const { getServerSession } = require("next-auth/next") as typeof NextAuth
const { redirect } = require("next/navigation") as typeof Navigation
const { supabaseServer } = require("@/lib/supabase-server") as typeof SupabaseServer
const { obtenerContexto, requerirAdminPagina, autorizarAdmin, autorizarLecturaCoche } =
  require("@/lib/autorizacion") as typeof Autorizacion

const mockSession = jest.mocked(getServerSession)
const mockRedirect = jest.mocked(redirect)
const mockFrom = jest.mocked(supabaseServer.from)

type Resultado = { data: unknown; error: unknown }
type Tablas = Record<string, Resultado | ((filtros: unknown[][]) => Resultado)>

// Builder encadenable: registra filtros y resuelve el resultado de la tabla.
function configurarTablas(tablas: Tablas) {
  const consultas: Array<{ tabla: string; filtros: unknown[][] }> = []
  mockFrom.mockImplementation(((tabla: string) => {
    const filtros: unknown[][] = []
    consultas.push({ tabla, filtros })
    const resolver = (): Promise<Resultado> => {
      const def = tablas[tabla] ?? { data: null, error: null }
      return Promise.resolve(typeof def === "function" ? def(filtros) : def)
    }
    const b: Record<string, unknown> = {}
    for (const metodo of ["select", "eq", "ilike", "in", "is", "not", "order", "limit"]) {
      b[metodo] = (...args: unknown[]) => {
        filtros.push([metodo, ...args])
        return b
      }
    }
    b.maybeSingle = resolver
    b.single = resolver
    b.then = (ok: (r: Resultado) => unknown, ko: (e: unknown) => unknown) => resolver().then(ok, ko)
    return b
  }) as unknown as typeof supabaseServer.from)
  return consultas
}

function sesion(email: string) {
  mockSession.mockResolvedValue({ user: { email }, expires: "" })
}

// Devuelve el empleado con el email buscado (ilike), como haría la BD.
const empleado = (id: number, role: string, emailGuardado?: string) => (filtros: unknown[][]): Resultado => {
  const buscado = String(filtros.find((f) => f[0] === "ilike")?.[2] ?? "")
  return { data: [{ id, role, email: emailGuardado ?? buscado }], error: null }
}

describe("obtenerContexto (RF-4)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("sin sesión → no autenticado y sin consultas", async () => {
    mockSession.mockResolvedValue(null)
    const consultas = configurarTablas({})
    await expect(obtenerContexto()).resolves.toEqual({ autenticado: false })
    expect(consultas).toHaveLength(0)
  })

  it("lee el rol vigente de empleados por email normalizado", async () => {
    sesion("  Admin@Fulcrum.es ")
    const consultas = configurarTablas({ empleados: empleado(1, "administrador") })
    await expect(obtenerContexto()).resolves.toEqual({
      autenticado: true,
      email: "admin@fulcrum.es",
      empleadoId: 1,
      esAdmin: true,
    })
    expect(consultas[0].filtros).toContainEqual(["ilike", "email", "admin@fulcrum.es"])
  })

  it("reconoce al empleado aunque su email esté guardado con mayúsculas", async () => {
    sesion("admin@fulcrum.es")
    configurarTablas({ empleados: empleado(1, "administrador", "Admin@Fulcrum.ES") })
    await expect(obtenerContexto()).resolves.toMatchObject({ esAdmin: true, empleadoId: 1 })
  })

  it("no acepta coincidencias por comodín de ilike con otro email", async () => {
    sesion("a_b@fulcrum.es")
    configurarTablas({ empleados: empleado(1, "administrador", "axb@fulcrum.es") })
    await expect(obtenerContexto()).resolves.toMatchObject({ esAdmin: false, empleadoId: null })
  })

  it("acepta el alias legado 'admin'", async () => {
    sesion("a@fulcrum.es")
    configurarTablas({ empleados: empleado(2, "admin") })
    await expect(obtenerContexto()).resolves.toMatchObject({ esAdmin: true })
  })

  it("usuario normal → esAdmin false", async () => {
    sesion("u@fulcrum.es")
    configurarTablas({ empleados: empleado(3, "usuario") })
    await expect(obtenerContexto()).resolves.toMatchObject({ esAdmin: false, empleadoId: 3 })
  })

  it("empleado inexistente o error de consulta → no administrador", async () => {
    sesion("x@fulcrum.es")
    configurarTablas({ empleados: { data: [], error: null } })
    await expect(obtenerContexto()).resolves.toMatchObject({ autenticado: true, esAdmin: false, empleadoId: null })

    configurarTablas({ empleados: { data: null, error: { message: "boom" } } })
    await expect(obtenerContexto()).resolves.toMatchObject({ autenticado: true, esAdmin: false, empleadoId: null })
  })
})

describe("requerirAdminPagina (RF-2)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("redirige a /?aviso=sin-permiso si no es administrador", async () => {
    sesion("u@fulcrum.es")
    configurarTablas({ empleados: empleado(3, "usuario") })
    await expect(requerirAdminPagina()).rejects.toThrow("NEXT_REDIRECT:/?aviso=sin-permiso")
    expect(mockRedirect).toHaveBeenCalledWith("/?aviso=sin-permiso")
  })

  it("redirige también sin sesión", async () => {
    mockSession.mockResolvedValue(null)
    configurarTablas({})
    await expect(requerirAdminPagina()).rejects.toThrow("NEXT_REDIRECT:/?aviso=sin-permiso")
  })

  it("devuelve el contexto a un administrador sin redirigir", async () => {
    sesion("a@fulcrum.es")
    configurarTablas({ empleados: empleado(1, "administrador") })
    await expect(requerirAdminPagina()).resolves.toMatchObject({ esAdmin: true })
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})

describe("autorizarAdmin (RF-11, RF-12)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("sin sesión → Usuario no autenticado", async () => {
    mockSession.mockResolvedValue(null)
    configurarTablas({})
    await expect(autorizarAdmin()).resolves.toEqual({ ok: false, error: "Usuario no autenticado" })
  })

  it("usuario → No autorizado", async () => {
    sesion("u@fulcrum.es")
    configurarTablas({ empleados: empleado(3, "usuario") })
    await expect(autorizarAdmin()).resolves.toEqual({ ok: false, error: "No autorizado" })
  })

  it("administrador → ok", async () => {
    sesion("a@fulcrum.es")
    configurarTablas({ empleados: empleado(1, "administrador") })
    await expect(autorizarAdmin()).resolves.toMatchObject({ ok: true, ctx: { esAdmin: true } })
  })
})

describe("autorizarLecturaCoche (RF-8, RF-13)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const reservaActiva = (filtros: unknown[][]): Resultado => {
    const activa = filtros.some((f) => f[0] === "eq" && f[1] === "estado" && f[2] === "activa")
    const delEmpleado = filtros.some((f) => f[0] === "eq" && f[1] === "empleado_id" && f[2] === 3)
    return { data: activa && delEmpleado ? [{ id: 10 }] : [], error: null }
  }

  it("sin sesión → Usuario no autenticado", async () => {
    mockSession.mockResolvedValue(null)
    configurarTablas({})
    await expect(autorizarLecturaCoche("1111-AAA")).resolves.toEqual({ ok: false, error: "Usuario no autenticado" })
  })

  it("administrador → ok sin comprobar relación", async () => {
    sesion("a@fulcrum.es")
    const consultas = configurarTablas({ empleados: empleado(1, "administrador") })
    await expect(autorizarLecturaCoche("1111-AAA")).resolves.toMatchObject({ ok: true })
    expect(consultas.map((c) => c.tabla)).toEqual(["empleados"])
  })

  it("asignación permanente con id numérico → ok", async () => {
    sesion("u@fulcrum.es")
    configurarTablas({ empleados: empleado(3, "usuario"), coches: { data: { asignadoa: 3 }, error: null } })
    await expect(autorizarLecturaCoche("1111-AAA")).resolves.toMatchObject({ ok: true })
  })

  it("asignación permanente con id en cadena → ok", async () => {
    sesion("u@fulcrum.es")
    configurarTablas({ empleados: empleado(3, "usuario"), coches: { data: { asignadoa: "3" }, error: null } })
    await expect(autorizarLecturaCoche("1111-AAA")).resolves.toMatchObject({ ok: true })
  })

  it("reserva activa → ok", async () => {
    sesion("u@fulcrum.es")
    const consultas = configurarTablas({
      empleados: empleado(3, "usuario"),
      coches: { data: { asignadoa: null }, error: null },
      reservas: reservaActiva,
    })
    await expect(autorizarLecturaCoche("1111-AAA")).resolves.toMatchObject({ ok: true })
    const reservas = consultas.find((c) => c.tabla === "reservas")
    expect(reservas?.filtros).toContainEqual(["eq", "matricula", "1111-AAA"])
  })

  it("reserva no activa → No autorizado", async () => {
    sesion("u@fulcrum.es")
    configurarTablas({
      empleados: empleado(3, "usuario"),
      coches: { data: { asignadoa: null }, error: null },
      reservas: { data: [], error: null },
    })
    await expect(autorizarLecturaCoche("1111-AAA")).resolves.toEqual({ ok: false, error: "No autorizado" })
  })

  it("asignadoa en texto libre no cuenta como asignación → No autorizado", async () => {
    sesion("u@fulcrum.es")
    configurarTablas({
      empleados: empleado(3, "usuario"),
      coches: { data: { asignadoa: "Pool Bilbao" }, error: null },
      reservas: { data: [], error: null },
    })
    await expect(autorizarLecturaCoche("1111-AAA")).resolves.toEqual({ ok: false, error: "No autorizado" })
  })

  it("asignado a otro empleado y sin reserva → No autorizado", async () => {
    sesion("u@fulcrum.es")
    configurarTablas({
      empleados: empleado(3, "usuario"),
      coches: { data: { asignadoa: 9 }, error: null },
      reservas: { data: [], error: null },
    })
    await expect(autorizarLecturaCoche("1111-AAA")).resolves.toEqual({ ok: false, error: "No autorizado" })
  })

  it("matrícula inexistente → No autorizado", async () => {
    sesion("u@fulcrum.es")
    configurarTablas({
      empleados: empleado(3, "usuario"),
      coches: { data: null, error: null },
      reservas: { data: [], error: null },
    })
    await expect(autorizarLecturaCoche("9999-ZZZ")).resolves.toEqual({ ok: false, error: "No autorizado" })
  })

  it("usuario sin registro de empleado → No autorizado sin consultar el coche", async () => {
    sesion("x@fulcrum.es")
    const consultas = configurarTablas({ empleados: { data: [], error: null } })
    await expect(autorizarLecturaCoche("1111-AAA")).resolves.toEqual({ ok: false, error: "No autorizado" })
    expect(consultas.map((c) => c.tabla)).toEqual(["empleados"])
  })
})
