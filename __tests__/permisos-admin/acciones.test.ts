/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-require-imports -- los módulos se cargan con require tras los mocks */
import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals"
import type * as Autorizacion from "@/lib/autorizacion"
import type * as SupabaseServer from "@/lib/supabase-server"

// Con `jest` importado de @jest/globals los jest.mock no se elevan: los módulos
// se cargan con require después de declarar los mocks.
jest.mock("@/lib/autorizacion", () => ({
  ERROR_NO_AUTENTICADO: "Usuario no autenticado",
  ERROR_NO_AUTORIZADO: "No autorizado",
  autorizarAdmin: jest.fn(),
  autorizarLecturaCoche: jest.fn(),
  obtenerContexto: jest.fn(),
}))
jest.mock("@/lib/supabase-server", () => ({ supabaseServer: { from: jest.fn() } }))
jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn(), storage: { from: jest.fn() } } }))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(async () => ({ user: { email: "alguien@fulcrum.es" }, expires: "" })),
}))
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))

const autorizacion = require("@/lib/autorizacion") as jest.Mocked<typeof Autorizacion>
const { supabaseServer } = require("@/lib/supabase-server") as typeof SupabaseServer
const mockFrom = jest.mocked(supabaseServer.from)

const ctxAdmin = { autenticado: true as const, email: "admin@fulcrum.es", empleadoId: 1, empleadoIds: [1], esAdmin: true }

function supabaseVacio() {
  mockFrom.mockImplementation((() => {
    const b: Record<string, unknown> = {}
    for (const m of ["select", "insert", "update", "delete", "upsert", "eq", "neq", "in", "is", "not", "or", "order", "limit"]) {
      b[m] = () => b
    }
    b.single = async () => ({ data: null, error: null })
    b.maybeSingle = async () => ({ data: null, error: null })
    b.then = (ok: (r: unknown) => unknown, ko: (e: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(ok, ko)
    return b
  }) as unknown as typeof supabaseServer.from)
}

type Accion = (...args: never[]) => Promise<unknown>

interface CasoAccion {
  modulo: string
  nombre: string
  args: unknown[]
  /** Valor esperado al rechazar; "throw" si la acción lanza Error("No autorizado"). */
  rechazo: (error: string) => unknown
}

const sucErr = (error: string) => ({ success: false, error })

const form = () => new FormData()

// tarjetas-admin conserva sus mensajes propios al rechazar.
const msgTarjetasAdmin = (error: string) =>
  error === "Usuario no autenticado" ? error : "Acceso no autorizado - Solo administradores"
const sucErrTA = (error: string) => ({ success: false, error: msgTarjetasAdmin(error) })
// eliminarCoche y restaurarCoche conservan sus mensajes propios.
const sucErrCoche = (accion: string) => (error: string) => ({
  success: false,
  error: error === "Usuario no autenticado" ? error : `Acceso no autorizado - Solo administradores pueden ${accion}`,
})
const sucErrTALista = (error: string) => ({ success: false, error: msgTarjetasAdmin(error), tarjetas: [] })

const accionesAdmin: CasoAccion[] = [
  // T6 — ITV, mantenimientos, seguros, alquileres
  { modulo: "@/app/actions/itvs", nombre: "crearITV", args: [form()], rechazo: sucErr },
  { modulo: "@/app/actions/itvs", nombre: "actualizarITV", args: [1, form()], rechazo: sucErr },
  { modulo: "@/app/actions/itvs", nombre: "eliminarITV", args: [1], rechazo: sucErr },
  { modulo: "@/app/actions/mantenimientos", nombre: "crearMantenimiento", args: [form()], rechazo: sucErr },
  { modulo: "@/app/actions/mantenimientos", nombre: "actualizarMantenimiento", args: [1, form()], rechazo: sucErr },
  { modulo: "@/app/actions/mantenimientos", nombre: "eliminarMantenimiento", args: [1], rechazo: sucErr },
  { modulo: "@/app/actions/seguros", nombre: "crearSeguro", args: [form()], rechazo: sucErr },
  { modulo: "@/app/actions/seguros", nombre: "actualizarSeguro", args: [1, form()], rechazo: sucErr },
  { modulo: "@/app/actions/seguros", nombre: "eliminarSeguro", args: [1, "1111-AAA"], rechazo: sucErr },
  { modulo: "@/app/actions/alquileres", nombre: "crearAlquiler", args: [form()], rechazo: sucErr },
  { modulo: "@/app/actions/alquileres", nombre: "actualizarAlquiler", args: [1, form()], rechazo: sucErr },
  { modulo: "@/app/actions/alquileres", nombre: "eliminarAlquiler", args: [1, "1111-AAA"], rechazo: sucErr },
  // T7 — Solred, ViaT y tarjetas-admin
  { modulo: "@/app/actions/solred", nombre: "obtenerTarjetasSolred", args: [], rechazo: () => [] },
  { modulo: "@/app/actions/solred", nombre: "asignarTarjetaSolred", args: ["1111-AAA", "123"], rechazo: sucErr },
  { modulo: "@/app/actions/solred", nombre: "desasignarTarjetaSolred", args: ["1111-AAA"], rechazo: sucErr },
  { modulo: "@/app/actions/solred", nombre: "crearTarjetaSolred", args: ["123", "1234", "2030-01-01"], rechazo: sucErr },
  { modulo: "@/app/actions/viats", nombre: "obtenerTarjetasViat", args: ["1111-AAA"], rechazo: () => "throw" },
  { modulo: "@/app/actions/viats", nombre: "asignarTarjetaViat", args: ["1111-AAA", "V1"], rechazo: sucErr },
  { modulo: "@/app/actions/viats", nombre: "desasignarTarjetaViat", args: ["1111-AAA"], rechazo: sucErr },
  { modulo: "@/app/actions/viats", nombre: "crearTarjetaViat", args: ["V1", "2030-01-01"], rechazo: sucErr },
  { modulo: "@/app/actions/tarjetas-admin", nombre: "obtenerTarjetasSolredAdmin", args: [], rechazo: sucErrTALista },
  { modulo: "@/app/actions/tarjetas-admin", nombre: "obtenerTarjetasViatAdmin", args: [], rechazo: sucErrTALista },
  { modulo: "@/app/actions/tarjetas-admin", nombre: "crearTarjetaSolredAdmin", args: ["123", "1234", "2030-01-01"], rechazo: sucErrTA },
  { modulo: "@/app/actions/tarjetas-admin", nombre: "crearTarjetaViatAdmin", args: ["V1", "2030-01-01"], rechazo: sucErrTA },
  { modulo: "@/app/actions/tarjetas-admin", nombre: "actualizarTarjetaSolredAdmin", args: [{}], rechazo: sucErrTA },
  { modulo: "@/app/actions/tarjetas-admin", nombre: "actualizarTarjetaViatAdmin", args: [{}], rechazo: sucErrTA },
  { modulo: "@/app/actions/tarjetas-admin", nombre: "eliminarTarjetaSolredAdmin", args: ["123"], rechazo: sucErrTA },
  { modulo: "@/app/actions/tarjetas-admin", nombre: "eliminarTarjetaViatAdmin", args: ["V1"], rechazo: sucErrTA },
  // T8 — resto de acciones de gestión
  { modulo: "@/app/actions/empleados", nombre: "obtenerEmpleados", args: [], rechazo: () => [] },
  { modulo: "@/app/actions/empleados", nombre: "obtenerEmpleadoPorId", args: [1], rechazo: () => null },
  { modulo: "@/app/actions/reservas-admin", nombre: "obtenerReservasTemporales", args: [], rechazo: sucErr },
  { modulo: "@/app/actions/reservas-admin", nombre: "obtenerAsignacionesPermanentes", args: [], rechazo: sucErr },
  { modulo: "@/app/actions/coches", nombre: "eliminarCoche", args: ["1111-AAA"], rechazo: sucErrCoche("eliminar coches") },
  { modulo: "@/app/actions/coches", nombre: "restaurarCoche", args: ["1111-AAA"], rechazo: sucErrCoche("dar de alta coches") },
  { modulo: "@/app/actions/notificaciones", nombre: "obtenerEstadisticasNotificaciones", args: [], rechazo: sucErr },
  { modulo: "@/app/actions/verificar-datos", nombre: "verificarDatos", args: [], rechazo: sucErr },
  { modulo: "@/app/coches/nuevo/actions", nombre: "crearCoche", args: [form()], rechazo: sucErr },
  { modulo: "@/app/coches/editar/[id]/actions", nombre: "editarCoche", args: [form()], rechazo: () => "throw" },
  { modulo: "@/app/empleados/nuevo/actions", nombre: "crearEmpleado", args: [form()], rechazo: sucErr },
  { modulo: "@/app/empleados/nuevo-empleado/actions", nombre: "crearEmpleado", args: [form()], rechazo: sucErr },
  { modulo: "@/app/empleados/[id]/editar/actions", nombre: "editarEmpleado", args: [1, form()], rechazo: sucErr },
  { modulo: "@/app/empleados/[id]/editar/actions", nombre: "obtenerEmpleado", args: [1], rechazo: () => null },
]

const accionesLectura: CasoAccion[] = [
  // T6
  { modulo: "@/app/actions/itvs", nombre: "obtenerITVsPorMatricula", args: ["1111-AAA"], rechazo: sucErr },
  { modulo: "@/app/actions/mantenimientos", nombre: "obtenerMantenimientosPorMatricula", args: ["1111-AAA"], rechazo: sucErr },
  { modulo: "@/app/actions/seguros", nombre: "obtenerSeguroActivo", args: ["1111-AAA"], rechazo: sucErr },
  { modulo: "@/app/actions/seguros", nombre: "obtenerHistorialSeguros", args: ["1111-AAA"], rechazo: sucErr },
  { modulo: "@/app/actions/alquileres", nombre: "obtenerAlquileresPorMatricula", args: ["1111-AAA"], rechazo: sucErr },
  // T7
  { modulo: "@/app/actions/solred", nombre: "obtenerTarjetaAsignada", args: ["1111-AAA"], rechazo: () => null },
  { modulo: "@/app/actions/viats", nombre: "obtenerTarjetaViatAsignada", args: ["1111-AAA"], rechazo: () => null },
  { modulo: "@/app/actions/viats", nombre: "obtenerHistorialViatCoche", args: ["1111-AAA"], rechazo: () => [] },
]

function cargar(caso: CasoAccion): Accion {
  const modulo = require(caso.modulo) as Record<string, Accion>
  const accion = modulo[caso.nombre]
  if (typeof accion !== "function") throw new Error(`${caso.modulo} no exporta ${caso.nombre}`)
  return accion
}

async function resultadoDe(caso: CasoAccion): Promise<unknown> {
  try {
    return await cargar(caso)(...(caso.args as never[]))
  } catch (error) {
    return { lanzado: (error as Error).message }
  }
}

function esperado(caso: CasoAccion, error: string): unknown {
  const r = caso.rechazo(error)
  return r === "throw" ? { lanzado: error } : r
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, "error").mockImplementation(() => {})
  jest.spyOn(console, "log").mockImplementation(() => {})
  supabaseVacio()
})

describe("acciones solo de administrador (RF-11, RF-12, RF-15)", () => {
  describe.each(accionesAdmin)("$nombre", (caso) => {
    it("sin sesión → rechazo con su forma de error y sin consultar datos", async () => {
      autorizacion.autorizarAdmin.mockResolvedValue({ ok: false, error: "Usuario no autenticado" })
      await expect(resultadoDe(caso)).resolves.toEqual(esperado(caso, "Usuario no autenticado"))
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it("usuario no administrador → rechazo 'No autorizado' sin consultar datos", async () => {
      autorizacion.autorizarAdmin.mockResolvedValue({ ok: false, error: "No autorizado" })
      await expect(resultadoDe(caso)).resolves.toEqual(esperado(caso, "No autorizado"))
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it("administrador → pasa la guarda", async () => {
      autorizacion.autorizarAdmin.mockResolvedValue({ ok: true, ctx: ctxAdmin })
      const resultado = await resultadoDe(caso)
      expect(autorizacion.autorizarAdmin).toHaveBeenCalledTimes(1)
      // Pasó la guarda si consultó la BD o si su respuesta no es el rechazo
      // (algunas acciones validan la entrada antes de consultar).
      const consulto = mockFrom.mock.calls.length > 0
      expect(consulto || JSON.stringify(resultado) !== JSON.stringify(esperado(caso, "No autorizado"))).toBe(true)
    })
  })
})

describe("acciones de lectura de un coche (RF-13)", () => {
  describe.each(accionesLectura)("$nombre", (caso) => {
    it("coche no relacionado → rechazo sin consultar datos", async () => {
      autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: false, error: "No autorizado" })
      await expect(resultadoDe(caso)).resolves.toEqual(esperado(caso, "No autorizado"))
      expect(autorizacion.autorizarLecturaCoche).toHaveBeenCalledWith("1111-AAA")
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it("administrador o usuario relacionado → consulta los datos", async () => {
      autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: true, ctx: ctxAdmin })
      await resultadoDe(caso)
      expect(mockFrom).toHaveBeenCalled()
    })
  })
})

// RF-14 y RF-16: las acciones de usuario y las invocadas por cron no pasan por la guarda.
// Se comprueba en el código fuente para no ejecutarlas (envían emails/WhatsApp).
describe("acciones de usuario y de cron sin guarda de rol (RF-14, RF-16)", () => {
  const fs = require("fs") as typeof import("fs")
  const path = require("path") as typeof import("path")

  function cuerpoDe(fichero: string, funcion: string): string {
    const fuente = fs.readFileSync(path.join(process.cwd(), fichero), "utf-8")
    const inicio = fuente.indexOf(`export async function ${funcion}(`)
    if (inicio === -1) throw new Error(`${fichero} no exporta ${funcion}`)
    const siguiente = fuente.indexOf("export async function ", inicio + 10)
    return fuente.slice(inicio, siguiente === -1 ? undefined : siguiente)
  }

  const sinGuarda: Array<[string, string]> = [
    ["app/actions/reservas-temporales.ts", "crearReservaTemporal"],
    ["app/actions/reservas-temporales.ts", "obtenerReservasUsuario"],
    ["app/actions/reservas-temporales.ts", "obtenerHistorialReservasPorMatricula"],
    ["app/actions/reservas-temporales.ts", "cancelarReserva"],
    ["app/actions/reservas-temporales.ts", "completarReserva"],
    ["app/actions/reservas-temporales.ts", "ampliarReservaTemporal"],
    ["app/actions/reservas-temporales.ts", "verificarDisponibilidad"],
    ["app/actions/reservas-temporales.ts", "obtenerBloqueosReservasPorMatricula"],
    ["app/actions/reservas-temporales.ts", "obtenerEstadoReservasPorMatriculas"],
    ["app/actions/reservas-temporales.ts", "activarReservasPendientes"],
    ["app/actions/reservas.ts", "reservarCoche"],
    ["app/actions/reservas.ts", "liberarCoche"],
    ["app/actions/coches.ts", "obtenerFichaCoche"],
    ["app/actions/notificaciones.ts", "verificarReservasVencidas"],
    ["app/actions/itv-notificaciones.ts", "verificarAlertasITV"],
    ["app/actions/mantenimientos-notificaciones.ts", "verificarAlertasMantenimiento"],
  ]

  it.each(sinGuarda)("%s › %s no llama a autorizarAdmin ni autorizarLecturaCoche", (fichero, funcion) => {
    const cuerpo = cuerpoDe(fichero, funcion)
    expect(cuerpo).not.toMatch(/autorizarAdmin|autorizarLecturaCoche|requerirAdminPagina/)
  })
})

// Spec 018 (RF-19): las Server Actions de ubicación exigen administrador o usuario relacionado.
describe("Server Actions de ubicación (spec 018, RF-19)", () => {
  const fetchOriginal = global.fetch
  const claveOriginal = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const ubicacion = () =>
    require("@/app/actions/ubicacion") as {
      actualizarUbicacionCoche: (m: string, lat: number, lng: number) => Promise<{ success: boolean; error?: string }>
      ubicarCocheEnSede: (m: string) => Promise<{ success: boolean; error?: string }>
    }
  const llamadas: Array<[string, () => Promise<{ success: boolean; error?: string }>]> = [
    ["actualizarUbicacionCoche", () => ubicacion().actualizarUbicacionCoche("1111-AAA", 43.3, -2.9)],
    ["ubicarCocheEnSede", () => ubicacion().ubicarCocheEnSede("1111-AAA")],
  ]
  const mockFetch = jest.fn(async () => ({
    json: async () => ({
      status: "OK",
      results: [{ formatted_address: "Leioa", geometry: { location: { lat: 43.3, lng: -2.9 } } }],
    }),
  }))

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "clave-de-prueba"
    global.fetch = mockFetch as unknown as typeof fetch
    mockFetch.mockClear()
  })

  afterAll(() => {
    global.fetch = fetchOriginal
    if (claveOriginal === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    else process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = claveOriginal
  })

  it.each(llamadas)("%s: usuario no relacionado → rechazo sin geocodificar ni actualizar", async (_nombre, llamar) => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: false, error: "No autorizado" })
    await expect(llamar()).resolves.toEqual({ success: false, error: "No autorizado" })
    expect(autorizacion.autorizarLecturaCoche).toHaveBeenCalledWith("1111-AAA")
    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it.each(llamadas)("%s: sin sesión → rechazo", async (_nombre, llamar) => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: false, error: "Usuario no autenticado" })
    await expect(llamar()).resolves.toEqual({ success: false, error: "Usuario no autenticado" })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it.each(llamadas)("%s: usuario relacionado (incluida reserva vencida) → actualiza", async (_nombre, llamar) => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({
      ok: true,
      ctx: { autenticado: true as const, email: "u@fulcrum.es", empleadoId: 3, empleadoIds: [3], esAdmin: false },
    })
    await expect(llamar()).resolves.toMatchObject({ success: true })
    expect(mockFrom).toHaveBeenCalledWith("coches")
  })

  it.each(llamadas)("%s: administrador → actualiza", async (_nombre, llamar) => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: true, ctx: ctxAdmin })
    await expect(llamar()).resolves.toMatchObject({ success: true })
    expect(mockFrom).toHaveBeenCalledWith("coches")
  })
})
