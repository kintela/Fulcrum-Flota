/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-require-imports -- los módulos se cargan con require tras los mocks */
import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import type * as Autorizacion from "@/lib/autorizacion"

jest.mock("@/lib/autorizacion", () => {
  const { NextResponse } = require("next/server")
  return {
    ERROR_NO_AUTENTICADO: "Usuario no autenticado",
    autorizarAdmin: jest.fn(),
    autorizarLecturaCoche: jest.fn(),
    respuestaRechazoApi: (error: string) =>
      NextResponse.json({ error }, { status: error === "Usuario no autenticado" ? 401 : 403 }),
  }
})
jest.mock("@/lib/supabase-server", () => ({ supabaseServer: { from: jest.fn(), storage: { from: jest.fn() } } }))
jest.mock("@/lib/get-session", () => ({ getAuthSession: jest.fn(async () => ({ user: { email: "u@fulcrum.es" } })) }))
jest.mock("next-auth/next", () => ({ getServerSession: jest.fn(async () => ({ user: { email: "u@fulcrum.es" } })) }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))

const autorizacion = require("@/lib/autorizacion") as jest.Mocked<typeof Autorizacion>
const { supabaseServer } = require("@/lib/supabase-server") as {
  supabaseServer: { from: jest.Mock; storage: { from: jest.Mock } }
}

const ctxAdmin = { autenticado: true as const, email: "admin@fulcrum.es", empleadoId: 1, empleadoIds: [1], esAdmin: true }
const ctxUsuario = { autenticado: true as const, email: "u@fulcrum.es", empleadoId: 3, empleadoIds: [3], esAdmin: false }

// Storage simulado: registra operaciones.
const storage = {
  list: jest.fn(async () => ({ data: [{ name: "1-a-doc.pdf", id: "x", metadata: { size: 1 }, created_at: "" }], error: null })),
  createSignedUrl: jest.fn(async () => ({ data: { signedUrl: "https://firmada" }, error: null })),
  createSignedUploadUrl: jest.fn(async () => ({ data: { token: "tok" }, error: null })),
  remove: jest.fn(async () => ({ error: null })),
}

/** Tabla `itvs`: la ITV 7 es de 1111-AAA. */
function configurarItvs() {
  supabaseServer.from.mockImplementation(() => {
    const filtros: Record<string, unknown> = {}
    const b: Record<string, unknown> = {}
    b.select = () => b
    b.eq = (col: string, val: unknown) => {
      filtros[col] = val
      return b
    }
    b.maybeSingle = async () =>
      filtros.id === 7 && filtros.matricula === "1111-AAA" ? { data: { id: 7 }, error: null } : { data: null, error: null }
    return b
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, "error").mockImplementation(() => {})
  jest.spyOn(console, "log").mockImplementation(() => {})
  supabaseServer.storage.from.mockReturnValue(storage)
  configurarItvs()
})

describe("/api/itv-documentos (RF-9, RF-10)", () => {
  const ruta = () =>
    require("@/app/api/itv-documentos/route") as {
      GET: (r: NextRequest) => Promise<Response>
      POST: (r: NextRequest) => Promise<Response>
      DELETE: (r: NextRequest) => Promise<Response>
    }
  const get = (matricula: string, itvId: number) =>
    new NextRequest(`https://flota.example/api/itv-documentos?matricula=${matricula}&itvId=${itvId}`)
  const conCuerpo = (method: string, body: unknown) =>
    new NextRequest("https://flota.example/api/itv-documentos", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })

  it("GET como administrador → lista documentos", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: true, ctx: ctxAdmin })
    const respuesta = await ruta().GET(get("1111-AAA", 7))
    expect(respuesta.status).toBe(200)
    await expect(respuesta.json()).resolves.toMatchObject({ documentos: [{ url: "https://firmada" }] })
  })

  it("GET como usuario relacionado con una ITV de su coche → lista documentos", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: true, ctx: ctxUsuario })
    const respuesta = await ruta().GET(get("1111-AAA", 7))
    expect(respuesta.status).toBe(200)
    expect(autorizacion.autorizarLecturaCoche).toHaveBeenCalledWith("1111-AAA")
  })

  it("GET como usuario relacionado pero con una ITV de otra matrícula → 403 sin tocar Storage", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: true, ctx: ctxUsuario })
    const respuesta = await ruta().GET(get("1111-AAA", 99))
    expect(respuesta.status).toBe(403)
    expect(storage.list).not.toHaveBeenCalled()
  })

  it("GET como usuario no relacionado → 403 sin tocar Storage", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: false, error: "No autorizado" })
    const respuesta = await ruta().GET(get("2222-BBB", 7))
    expect(respuesta.status).toBe(403)
    expect(storage.list).not.toHaveBeenCalled()
  })

  it("GET sin sesión → 401", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: false, error: "Usuario no autenticado" })
    expect((await ruta().GET(get("1111-AAA", 7))).status).toBe(401)
  })

  it("GET de administrador con parámetros no válidos → 400 como hasta ahora", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: true, ctx: ctxAdmin })
    expect((await ruta().GET(get("1111-AAA", 0))).status).toBe(400)
  })

  it("POST como usuario → 403 sin generar URL de subida", async () => {
    autorizacion.autorizarAdmin.mockResolvedValue({ ok: false, error: "No autorizado" })
    const respuesta = await ruta().POST(conCuerpo("POST", { matricula: "1111-AAA", itvId: 7, nombre: "doc.pdf" }))
    expect(respuesta.status).toBe(403)
    expect(storage.createSignedUploadUrl).not.toHaveBeenCalled()
  })

  it("POST como administrador → genera URL de subida", async () => {
    autorizacion.autorizarAdmin.mockResolvedValue({ ok: true, ctx: ctxAdmin })
    const respuesta = await ruta().POST(conCuerpo("POST", { matricula: "1111-AAA", itvId: 7, nombre: "doc.pdf" }))
    expect(respuesta.status).toBe(200)
    expect(storage.createSignedUploadUrl).toHaveBeenCalledTimes(1)
  })

  it("DELETE como usuario → 403 sin borrar", async () => {
    autorizacion.autorizarAdmin.mockResolvedValue({ ok: false, error: "No autorizado" })
    const respuesta = await ruta().DELETE(conCuerpo("DELETE", { matricula: "1111-AAA", itvId: 7, eliminarTodos: true }))
    expect(respuesta.status).toBe(403)
    expect(storage.remove).not.toHaveBeenCalled()
  })

  it("DELETE como administrador → borra", async () => {
    autorizacion.autorizarAdmin.mockResolvedValue({ ok: true, ctx: ctxAdmin })
    const respuesta = await ruta().DELETE(conCuerpo("DELETE", { matricula: "1111-AAA", itvId: 7, eliminarTodos: true }))
    expect(respuesta.status).toBe(200)
    expect(storage.remove).toHaveBeenCalledTimes(1)
  })
})

// Tabla `coches` simulada para los endpoints de ubicación y diagnóstico: registra los update.
const updates: unknown[] = []
function configurarCoches() {
  updates.length = 0
  supabaseServer.from.mockImplementation((tabla: unknown) => {
    const b: Record<string, unknown> = {}
    let esUpdate = false
    b.select = () => b
    b.eq = () => b
    b.update = (valores: unknown) => {
      esUpdate = true
      updates.push(valores)
      return b
    }
    b.single = async () => ({ data: { matricula: "1111-AAA", marca: "Seat", modelo: "León" }, error: null })
    b.then = (ok: (r: unknown) => unknown, ko: (e: unknown) => unknown) =>
      Promise.resolve(
        tabla === "coches" && esUpdate
          ? { data: [{ matricula: "1111-AAA" }], error: null }
          : { data: [], error: null },
      ).then(ok, ko)
    return b
  })
}

describe("/api/coches/[matricula]/ubicacion — editor (RF-11)", () => {
  const ruta = () =>
    require("@/app/api/coches/[matricula]/ubicacion/route") as {
      POST: (r: NextRequest, c: { params: { matricula: string } }) => Promise<Response>
      DELETE: (r: NextRequest, c: { params: { matricula: string } }) => Promise<Response>
    }
  const params = { params: { matricula: "1111-AAA" } }
  const post = () =>
    new NextRequest("https://flota.example/api/coches/1111-AAA/ubicacion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ latitud: 43.2, longitud: -2.9 }),
    })
  const del = () => new NextRequest("https://flota.example/api/coches/1111-AAA/ubicacion", { method: "DELETE" })

  beforeEach(() => configurarCoches())

  it.each([
    ["POST", () => ruta().POST(post(), params)],
    ["DELETE", () => ruta().DELETE(del(), params)],
  ])("%s como usuario → 403 sin modificar", async (_metodo, llamar) => {
    autorizacion.autorizarAdmin.mockResolvedValue({ ok: false, error: "No autorizado" })
    expect((await llamar()).status).toBe(403)
    expect(updates).toHaveLength(0)
  })

  it.each([
    ["POST", () => ruta().POST(post(), params)],
    ["DELETE", () => ruta().DELETE(del(), params)],
  ])("%s como administrador → modifica", async (_metodo, llamar) => {
    autorizacion.autorizarAdmin.mockResolvedValue({ ok: true, ctx: ctxAdmin })
    expect((await llamar()).status).toBe(200)
    expect(updates).toHaveLength(1)
  })
})

describe("/api/coches/actualizar-ubicacion — aparcar (RF-12)", () => {
  const ruta = () =>
    require("@/app/api/coches/actualizar-ubicacion/route") as { POST: (r: NextRequest) => Promise<Response> }
  const post = (matricula: string) =>
    new NextRequest("https://flota.example/api/coches/actualizar-ubicacion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matricula, latitud: 43.2, longitud: -2.9 }),
    })

  beforeEach(() => configurarCoches())

  it("usuario relacionado con el coche → actualiza", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: true, ctx: ctxUsuario })
    const respuesta = await ruta().POST(post("1111-AAA"))
    expect(respuesta.status).toBe(200)
    expect(autorizacion.autorizarLecturaCoche).toHaveBeenCalledWith("1111-AAA")
    expect(updates).toHaveLength(1)
  })

  it("administrador → actualiza", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: true, ctx: ctxAdmin })
    expect((await ruta().POST(post("1111-AAA"))).status).toBe(200)
    expect(updates).toHaveLength(1)
  })

  it("usuario no relacionado → 403 sin modificar", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: false, error: "No autorizado" })
    expect((await ruta().POST(post("2222-BBB"))).status).toBe(403)
    expect(updates).toHaveLength(0)
  })
})

describe("/api/diagnostico (RF-14)", () => {
  const ruta = () => require("@/app/api/diagnostico/route") as { GET: () => Promise<Response> }

  beforeEach(() => configurarCoches())

  it("usuario → 403 sin consultar datos", async () => {
    autorizacion.autorizarAdmin.mockResolvedValue({ ok: false, error: "No autorizado" })
    expect((await ruta().GET()).status).toBe(403)
    expect(supabaseServer.from).not.toHaveBeenCalled()
  })

  it("sin sesión → 401", async () => {
    autorizacion.autorizarAdmin.mockResolvedValue({ ok: false, error: "Usuario no autenticado" })
    expect((await ruta().GET()).status).toBe(401)
  })

  it("administrador → consulta los datos", async () => {
    autorizacion.autorizarAdmin.mockResolvedValue({ ok: true, ctx: ctxAdmin })
    await ruta().GET()
    expect(supabaseServer.from).toHaveBeenCalled()
  })
})
