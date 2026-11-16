/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-require-imports -- los módulos se cargan con require tras los mocks */
import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import type * as Autorizacion from "@/lib/autorizacion"

jest.mock("@/app/actions/reservas-temporales", () => ({
  activarReservasPendientes: jest.fn(async () => ({ success: true, activadas: 0 })),
}))
jest.mock("@/app/actions/itv-notificaciones", () => ({
  verificarAlertasITV: jest.fn(async () => ({ success: true, message: "ok", data: {} })),
}))
jest.mock("@/app/actions/mantenimientos-notificaciones", () => ({
  verificarAlertasMantenimiento: jest.fn(async () => ({ success: true, message: "ok", data: {} })),
}))
jest.mock("@/app/actions/notificaciones", () => ({
  verificarReservasVencidas: jest.fn(async () => ({ success: true, message: "ok" })),
}))
jest.mock("@/lib/email", () => ({
  probarConfiguracionEmail: jest.fn(async () => true),
  enviarEmailPrueba: jest.fn(async () => ({ success: true, destinatario: "x@fulcrum.es" })),
}))
jest.mock("@/lib/roles", () => ({ obtenerEmpleadoPorEmail: jest.fn(async () => null) }))
jest.mock("next-auth/next", () => ({ getServerSession: jest.fn(async () => null) }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/autorizacion", () => {
  const { NextResponse } = require("next/server")
  return {
    ERROR_NO_AUTENTICADO: "Usuario no autenticado",
    autorizarAdmin: jest.fn(),
    respuestaRechazoApi: (error: string) =>
      NextResponse.json({ error }, { status: error === "Usuario no autenticado" ? 401 : 403 }),
  }
})

const autorizacion = require("@/lib/autorizacion") as jest.Mocked<typeof Autorizacion>
const acciones = {
  activar: require("@/app/actions/reservas-temporales").activarReservasPendientes as jest.Mock,
  itv: require("@/app/actions/itv-notificaciones").verificarAlertasITV as jest.Mock,
  mantenimiento: require("@/app/actions/mantenimientos-notificaciones").verificarAlertasMantenimiento as jest.Mock,
  notificaciones: require("@/app/actions/notificaciones").verificarReservasVencidas as jest.Mock,
}
const email = require("@/lib/email") as { enviarEmailPrueba: jest.Mock }

type Handler = (req: NextRequest) => Promise<Response>
interface Ruta {
  nombre: string
  modulo: string
  proceso: jest.Mock
}

const rutas: Ruta[] = [
  { nombre: "notificaciones", modulo: "@/app/api/cron/notificaciones/route", proceso: acciones.notificaciones },
  { nombre: "activar-reservas-pendientes", modulo: "@/app/api/cron/activar-reservas-pendientes/route", proceso: acciones.activar },
  { nombre: "itv-alertas", modulo: "@/app/api/cron/itv-alertas/route", proceso: acciones.itv },
  { nombre: "mantenimiento-alertas", modulo: "@/app/api/cron/mantenimiento-alertas/route", proceso: acciones.mantenimiento },
]

const SECRETO = "secreto-de-prueba-018"
const secretoOriginal = process.env.CRON_SECRET

function get(nombre: string, cabeceras: Record<string, string>) {
  return new NextRequest(`https://flota.example/api/cron/${nombre}`, { method: "GET", headers: cabeceras })
}

function post(nombre: string, body: unknown) {
  return new NextRequest(`https://flota.example/api/cron/${nombre}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

const ctxAdmin = { autenticado: true as const, email: "admin@fulcrum.es", empleadoId: 1, esAdmin: true }

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, "log").mockImplementation(() => {})
  jest.spyOn(console, "error").mockImplementation(() => {})
  process.env.CRON_SECRET = SECRETO
})

afterAll(() => {
  if (secretoOriginal === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = secretoOriginal
})

describe.each(rutas)("/api/cron/$nombre", ({ nombre, modulo, proceso }) => {
  const handlers = () => require(modulo) as { GET: Handler; POST: Handler }

  describe("GET programado (RF-4 a RF-6)", () => {
    it("con Authorization: Bearer <CRON_SECRET> ejecuta el proceso", async () => {
      const respuesta = await handlers().GET(get(nombre, { authorization: `Bearer ${SECRETO}` }))
      expect(respuesta.status).toBe(200)
      expect(proceso).toHaveBeenCalledTimes(1)
      await expect(respuesta.json()).resolves.toMatchObject({ source: "cron" })
    })

    it.each([
      ["sin cabecera", {}],
      ["secreto incorrecto", { authorization: "Bearer otro" }],
      ["User-Agent de Vercel falseado", { "user-agent": "vercel-cron/1.0", "x-vercel-cron": "1" }],
      ["secreto antiguo CRON_SECRET_TOKEN", { authorization: "Bearer valor-antiguo" }],
    ])("%s → 401 sin ejecutar", async (_caso, cabeceras) => {
      process.env.CRON_SECRET_TOKEN = "valor-antiguo"
      const respuesta = await handlers().GET(get(nombre, cabeceras as Record<string, string>))
      delete process.env.CRON_SECRET_TOKEN
      expect(respuesta.status).toBe(401)
      expect(proceso).not.toHaveBeenCalled()
    })

    it("sin CRON_SECRET configurada → 401 sin ejecutar", async () => {
      delete process.env.CRON_SECRET
      const respuesta = await handlers().GET(get(nombre, { authorization: `Bearer ${SECRETO}` }))
      expect(respuesta.status).toBe(401)
      expect(proceso).not.toHaveBeenCalled()
    })
  })

  describe("POST manual (RF-7, RF-8)", () => {
    it("sin sesión → 401 sin ejecutar", async () => {
      autorizacion.autorizarAdmin.mockResolvedValue({ ok: false, error: "Usuario no autenticado" })
      const respuesta = await handlers().POST(post(nombre, { action: "run" }))
      expect(respuesta.status).toBe(401)
      expect(proceso).not.toHaveBeenCalled()
    })

    it("usuario no administrador → 403 sin ejecutar", async () => {
      autorizacion.autorizarAdmin.mockResolvedValue({ ok: false, error: "No autorizado" })
      const respuesta = await handlers().POST(post(nombre, { action: "run" }))
      expect(respuesta.status).toBe(403)
      expect(proceso).not.toHaveBeenCalled()
    })

    it("administrador → ejecuta como hasta ahora", async () => {
      autorizacion.autorizarAdmin.mockResolvedValue({ ok: true, ctx: ctxAdmin })
      const respuesta = await handlers().POST(post(nombre, { action: "run" }))
      expect(respuesta.status).toBe(200)
      expect(proceso).toHaveBeenCalledTimes(1)
      await expect(respuesta.json()).resolves.toMatchObject({ source: "manual" })
    })
  })
})

describe("/api/cron/notificaciones acciones de prueba de email (RF-8)", () => {
  const handlers = () => require("@/app/api/cron/notificaciones/route") as { POST: Handler }

  it.each(["send-test", "send-test-auth-user", "test"])("%s como usuario → 403 sin enviar", async (action) => {
    autorizacion.autorizarAdmin.mockResolvedValue({ ok: false, error: "No autorizado" })
    const respuesta = await handlers().POST(post("notificaciones", { action }))
    expect(respuesta.status).toBe(403)
    expect(email.enviarEmailPrueba).not.toHaveBeenCalled()
  })

  it("send-test como administrador → envía", async () => {
    autorizacion.autorizarAdmin.mockResolvedValue({ ok: true, ctx: ctxAdmin })
    const respuesta = await handlers().POST(post("notificaciones", { action: "send-test" }))
    expect(respuesta.status).toBe(200)
    expect(email.enviarEmailPrueba).toHaveBeenCalledTimes(1)
  })
})
