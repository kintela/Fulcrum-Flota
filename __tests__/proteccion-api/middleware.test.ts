/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-require-imports -- los módulos se cargan con require tras los mocks */
import { describe, expect, it, jest } from "@jest/globals"

type Req = {
  nextauth: { token: unknown }
  nextUrl: { pathname: string }
  cookies: { getAll: () => Array<{ name: string }> }
  url: string
}
type FnMiddleware = (req: Req) => Response
type Opciones = { callbacks: { authorized: (args: { token: unknown; req: Req }) => boolean } }

// withAuth se sustituye por una función que expone lo que recibe.
jest.mock("next-auth/middleware", () => ({
  withAuth: (fn: FnMiddleware, opciones: Opciones) => Object.assign(fn, { opciones }),
}))

const modulo = require("@/middleware") as {
  default: FnMiddleware & { opciones: Opciones }
  config: { matcher: string[] }
}
const middleware = modulo.default
const authorized = middleware.opciones.callbacks.authorized

function peticion(pathname: string, conSesion: boolean): Req {
  return {
    nextauth: { token: conSesion ? { email: "a@fulcrum.es" } : null },
    nextUrl: { pathname },
    cookies: { getAll: () => [] },
    url: `https://flota.example${pathname}`,
  }
}

describe("middleware (RF-3, RF-13)", () => {
  it("/api sin sesión → 401 JSON, sin redirigir", async () => {
    const respuesta = middleware(peticion("/api/itv-documentos", false))
    expect(respuesta.status).toBe(401)
    expect(respuesta.headers.get("location")).toBeNull()
    await expect(respuesta.json()).resolves.toEqual({ error: "No autenticado" })
  })

  it("rutas antes exentas (/api/public, /api/debug) también dan 401 sin sesión", () => {
    expect(middleware(peticion("/api/public/reset-reserva", false)).status).toBe(401)
    expect(middleware(peticion("/api/debug/env-vars", false)).status).toBe(401)
  })

  it("página sin sesión → redirección al login como hasta ahora", () => {
    const respuesta = middleware(peticion("/coches", false))
    expect(respuesta.status).toBeGreaterThanOrEqual(300)
    expect(respuesta.status).toBeLessThan(400)
    expect(respuesta.headers.get("location")).toContain("/auth/signin")
  })

  it("/api con sesión → pasa", () => {
    const respuesta = middleware(peticion("/api/itv-documentos", true))
    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get("x-middleware-next")).toBe("1")
  })

  it("authorized deja pasar /api a la función (para responder 401 JSON) y exige sesión en páginas", () => {
    expect(authorized({ token: null, req: peticion("/api/diagnostico", false) })).toBe(true)
    expect(authorized({ token: null, req: peticion("/coches", false) })).toBe(false)
    expect(authorized({ token: { email: "a" }, req: peticion("/coches", true) })).toBe(true)
  })

  it("el matcher ya no excluye api/debug ni api/public, y sigue excluyendo api/auth y api/cron", () => {
    const matcher = modulo.config.matcher.join(" ")
    expect(matcher).not.toMatch(/api\/debug|api\/public/)
    expect(matcher).toMatch(/api\/auth/)
    expect(matcher).toMatch(/api\/cron/)
  })
})
