/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-require-imports -- los módulos se cargan con require tras los mocks */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import type * as CronAuth from "@/lib/cron-auth"
import type * as Autorizacion from "@/lib/autorizacion"

jest.mock("next-auth/next", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/supabase-server", () => ({ supabaseServer: { from: jest.fn() } }))

const { esPeticionCronAutorizada } = require("@/lib/cron-auth") as typeof CronAuth
const { respuestaRechazoApi } = require("@/lib/autorizacion") as typeof Autorizacion

function peticion(cabeceras: Record<string, string>) {
  return new Request("https://flota.example/api/cron/notificaciones", { headers: cabeceras })
}

describe("esPeticionCronAutorizada (RF-4 a RF-6)", () => {
  const original = process.env.CRON_SECRET

  beforeEach(() => {
    process.env.CRON_SECRET = "s3cr3t-valor"
  })

  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = original
  })

  it("acepta Authorization: Bearer <CRON_SECRET>", () => {
    expect(esPeticionCronAutorizada(peticion({ authorization: "Bearer s3cr3t-valor" }))).toBe(true)
  })

  it.each([
    ["sin cabecera", {}],
    ["secreto distinto", { authorization: "Bearer otro-valor" }],
    ["secreto de distinta longitud", { authorization: "Bearer s3cr3t" }],
    ["otro esquema", { authorization: "Basic s3cr3t-valor" }],
    ["User-Agent de Vercel sin cabecera", { "user-agent": "vercel-cron/1.0", "x-vercel-cron": "1" }],
  ])("rechaza: %s", (_caso, cabeceras) => {
    expect(esPeticionCronAutorizada(peticion(cabeceras as Record<string, string>))).toBe(false)
  })

  it("rechaza todo si CRON_SECRET no está configurada", () => {
    delete process.env.CRON_SECRET
    expect(esPeticionCronAutorizada(peticion({ authorization: "Bearer " }))).toBe(false)
    expect(esPeticionCronAutorizada(peticion({ authorization: "Bearer undefined" }))).toBe(false)
  })

  it("no acepta el secreto antiguo CRON_SECRET_TOKEN", () => {
    process.env.CRON_SECRET_TOKEN = "antiguo"
    expect(esPeticionCronAutorizada(peticion({ authorization: "Bearer antiguo" }))).toBe(false)
    delete process.env.CRON_SECRET_TOKEN
  })
})

describe("respuestaRechazoApi (RF-16)", () => {
  it("sin sesión → 401 { error }", async () => {
    const respuesta = respuestaRechazoApi("Usuario no autenticado")
    expect(respuesta.status).toBe(401)
    await expect(respuesta.json()).resolves.toEqual({ error: "Usuario no autenticado" })
  })

  it("sin permiso → 403 { error }", async () => {
    const respuesta = respuestaRechazoApi("No autorizado")
    expect(respuesta.status).toBe(403)
    await expect(respuesta.json()).resolves.toEqual({ error: "No autorizado" })
  })
})
