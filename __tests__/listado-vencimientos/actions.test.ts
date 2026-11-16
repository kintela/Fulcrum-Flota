/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import type * as NextAuth from "next-auth/next"
import type * as Roles from "@/lib/roles"
import type * as SupabaseServer from "@/lib/supabase-server"
import type * as Acciones from "@/app/actions/listado-vencimientos"

// Con `jest` importado de @jest/globals los jest.mock no se elevan por encima de los
// imports, así que los módulos se cargan con require después de declarar los mocks.
jest.mock("next-auth/next", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/roles", () => ({ esAdministradorPorSesion: jest.fn() }))
jest.mock("@/lib/supabase-server", () => ({ supabaseServer: { from: jest.fn() } }))

const { getServerSession } = require("next-auth/next") as typeof NextAuth
const { esAdministradorPorSesion } = require("@/lib/roles") as typeof Roles
const { supabaseServer } = require("@/lib/supabase-server") as typeof SupabaseServer
const { obtenerListadoVencimientos } = require("@/app/actions/listado-vencimientos") as typeof Acciones

const mockGetServerSession = jest.mocked(getServerSession)
const mockEsAdmin = jest.mocked(esAdministradorPorSesion)
const mockFrom = jest.mocked(supabaseServer.from)

type Resultado = { data: unknown; error: unknown }

// Query builder encadenable y "thenable": cada método devuelve el builder y al
// hacer await resuelve el resultado configurado para la tabla.
function builder(resultado: Resultado, registro: { selects: string[]; filtros: unknown[][] }) {
  const b: Record<string, unknown> = {}
  b.select = jest.fn((cols: string) => {
    registro.selects.push(cols)
    return b
  })
  b.eq = jest.fn((...args: unknown[]) => {
    registro.filtros.push(["eq", ...args])
    return b
  })
  b.is = jest.fn(() => b)
  b.order = jest.fn(() => b)
  b.then = (resolve: (r: Resultado) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(resultado).then(resolve, reject)
  return b
}

function configurarTablas(tablas: Record<string, Resultado>) {
  const registros: Record<string, { selects: string[]; filtros: unknown[][] }> = {}
  mockFrom.mockImplementation(((tabla: string) => {
    registros[tabla] ??= { selects: [], filtros: [] }
    return builder(tablas[tabla] ?? { data: [], error: null }, registros[tabla])
  }) as unknown as typeof supabaseServer.from)
  return registros
}

const sesionAdmin = { user: { email: "admin@fulcrum.es" }, expires: "" }

const coches = [
  { matricula: "2222-BBB", marca: "Seat", modelo: "León", asignadoa: "7", alquiler: true, donante: false },
  { matricula: "1111-AAA", marca: "Renault", modelo: "Clio", asignadoa: null, alquiler: false, donante: false },
  { matricula: "3333-CCC", marca: "Audi", modelo: "A3", asignadoa: "Pool Bilbao", alquiler: false, donante: false },
  { matricula: "4444-DDD", marca: "Ford", modelo: "Focus", asignadoa: 99, alquiler: false, donante: false },
  { matricula: "5555-EEE", marca: "Opel", modelo: "Corsa", asignadoa: null, alquiler: false, donante: true },
  { matricula: "0000-TST", marca: "Test", modelo: "Prueba", asignadoa: null, alquiler: false, donante: false },
]

const tablasCompletas: Record<string, Resultado> = {
  coches: { data: coches, error: null },
  empleados: { data: [{ id: 7, nombre: "Ana", apellidos: "López" }], error: null },
  seguros: { data: [{ matricula: "2222-BBB", fecha_vencimiento: "2026-12-01" }], error: null },
  solred_coches: {
    data: [{ matricula: "1111-AAA", tarjetassolred: { fechavencimiento: "2027-03-31" } }],
    error: null,
  },
  itvs: {
    // Ordenadas desc por la consulta: la primera por matrícula es la vigente.
    data: [
      { matricula: "2222-BBB", fechaproximarevision: "2027-05-01", fecharevision: "2025-05-01" },
      { matricula: "2222-BBB", fechaproximarevision: "2025-05-01", fecharevision: "2023-05-01" },
    ],
    error: null,
  },
}

describe("obtenerListadoVencimientos", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("sin sesión devuelve error y no consulta datos (RF-2)", async () => {
    mockGetServerSession.mockResolvedValue(null)

    const resultado = await obtenerListadoVencimientos()

    expect(resultado).toEqual({ success: false, error: "Usuario no autenticado" })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("usuario no administrador devuelve 'No autorizado' y no consulta datos (RF-2)", async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: "user@fulcrum.es" }, expires: "" })
    mockEsAdmin.mockResolvedValue(false)

    const resultado = await obtenerListadoVencimientos()

    expect(resultado).toEqual({ success: false, error: "No autorizado" })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("administrador recibe filas de la flota activa sin donantes ni coches de prueba (RF-4 a RF-8)", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    mockEsAdmin.mockResolvedValue(true)
    const registros = configurarTablas(tablasCompletas)

    const resultado = await obtenerListadoVencimientos()

    expect(resultado.success).toBe(true)
    expect(registros.coches.filtros).toContainEqual(["eq", "eliminado", false])
    // El orden lo aplica el cliente; aquí se compara por matrícula.
    const filas = [...(resultado.filas ?? [])].sort((a, b) => a.matricula.localeCompare(b.matricula))
    expect(filas).toEqual([
      { matricula: "1111-AAA", modelo: "Renault Clio", asignado: null, alquiler: false, seguro: null, solred: "2027-03-31", itv: null },
      { matricula: "2222-BBB", modelo: "Seat León", asignado: "Ana López", alquiler: true, seguro: "2026-12-01", solred: null, itv: "2027-05-01" },
      { matricula: "3333-CCC", modelo: "Audi A3", asignado: "Pool Bilbao", alquiler: false, seguro: null, solred: null, itv: null },
      { matricula: "4444-DDD", modelo: "Ford Focus", asignado: "ID: 99", alquiler: false, seguro: null, solred: null, itv: null },
    ])
  })

  it("filtra seguros activos y Solred con asignación activa (RF-5)", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    mockEsAdmin.mockResolvedValue(true)
    const registros = configurarTablas(tablasCompletas)

    await obtenerListadoVencimientos()

    expect(registros.seguros.filtros).toContainEqual(["eq", "activo", true])
    expect(registros.solred_coches.filtros).toContainEqual(["eq", "activa", true])
  })

  it("no solicita ni devuelve el PIN de las tarjetas Solred (RF-21)", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    mockEsAdmin.mockResolvedValue(true)
    const registros = configurarTablas(tablasCompletas)

    const resultado = await obtenerListadoVencimientos()

    expect(registros.solred_coches.selects.join(" ")).not.toMatch(/pin/i)
    expect(JSON.stringify(resultado)).not.toMatch(/pin/i)
  })

  it("muestra los coches de prueba solo al usuario con la excepción del catálogo", async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: "rquintela@fulcrum.es" }, expires: "" })
    mockEsAdmin.mockResolvedValue(true)
    configurarTablas(tablasCompletas)

    const resultado = await obtenerListadoVencimientos()

    expect(resultado.filas?.map((f) => f.matricula)).toContain("0000-TST")
  })

  it("si falla una consulta asociada, devuelve las filas con ese dato vacío", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    mockEsAdmin.mockResolvedValue(true)
    configurarTablas({ ...tablasCompletas, seguros: { data: null, error: { message: "boom" } } })

    const resultado = await obtenerListadoVencimientos()

    expect(resultado.success).toBe(true)
    expect(resultado.filas?.every((f) => f.seguro === null)).toBe(true)
    expect(resultado.filas?.find((f) => f.matricula === "1111-AAA")?.solred).toBe("2027-03-31")
  })

  it("si falla la consulta de coches, devuelve error", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    mockEsAdmin.mockResolvedValue(true)
    configurarTablas({ ...tablasCompletas, coches: { data: null, error: { message: "boom" } } })

    const resultado = await obtenerListadoVencimientos()

    expect(resultado).toEqual({ success: false, error: "No se pudo cargar el listado de vehículos" })
  })
})
