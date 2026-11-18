/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-require-imports -- los módulos se cargan con require tras los mocks */
import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import type * as Autorizacion from "@/lib/autorizacion"
import type * as SupabaseServer from "@/lib/supabase-server"

// Con `jest` importado de @jest/globals los jest.mock no se elevan: los módulos
// se cargan con require después de declarar los mocks.
jest.mock("@/lib/autorizacion", () => ({
  URL_SIN_PERMISO: "/?aviso=sin-permiso",
  requerirAdminPagina: jest.fn(),
  obtenerContexto: jest.fn(),
  autorizarLecturaCoche: jest.fn(),
}))
jest.mock("@/lib/supabase-server", () => ({ supabaseServer: { from: jest.fn() } }))
jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn(), storage: { from: jest.fn() } } }))
jest.mock("@/lib/storage", () => ({ obtenerFotosCoche: jest.fn(async () => ({ success: true, fotos: [] })) }))
jest.mock("next-auth/next", () => ({ getServerSession: jest.fn(async () => null) }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}))

const autorizacion = require("@/lib/autorizacion") as jest.Mocked<typeof Autorizacion>
const { supabaseServer } = require("@/lib/supabase-server") as typeof SupabaseServer
const mockFrom = jest.mocked(supabaseServer.from)

const ctxAdmin = { autenticado: true as const, email: "admin@fulcrum.es", empleadoId: 1, empleadoIds: [1], esAdmin: true }

function comoUsuario() {
  autorizacion.requerirAdminPagina.mockImplementation(async () => {
    throw new Error("NEXT_REDIRECT:/?aviso=sin-permiso")
  })
}

function comoAdmin() {
  autorizacion.requerirAdminPagina.mockResolvedValue(ctxAdmin)
}

// Supabase vacío: cualquier consulta encadenada resuelve sin datos.
function supabaseVacio() {
  mockFrom.mockImplementation((() => {
    const resultado = { data: [], error: null }
    const b: Record<string, unknown> = {}
    for (const m of ["select", "eq", "neq", "in", "is", "not", "or", "order", "limit", "gte", "lte", "range"]) {
      b[m] = () => b
    }
    b.single = async () => ({ data: null, error: { message: "no rows" } })
    b.maybeSingle = async () => ({ data: null, error: null })
    b.then = (ok: (r: typeof resultado) => unknown, ko: (e: unknown) => unknown) =>
      Promise.resolve(resultado).then(ok, ko)
    return b
  }) as unknown as typeof supabaseServer.from)
}

type Pagina = (props: never) => Promise<unknown> | unknown

const paginasServidor: Array<{ ruta: string; cargar: () => Pagina; props: unknown }> = [
  { ruta: "/coches", cargar: () => require("@/app/coches/page").default, props: { searchParams: {} } },
  { ruta: "/coches/editar/[id]", cargar: () => require("@/app/coches/editar/[id]/page").default, props: { params: { id: "1111-AAA" } } },
  { ruta: "/empleados", cargar: () => require("@/app/empleados/page").default, props: {} },
  { ruta: "/empleados/[id]", cargar: () => require("@/app/empleados/[id]/page").default, props: { params: { id: "1" } } },
  { ruta: "/analisis", cargar: () => require("@/app/analisis/page").default, props: {} },
  { ruta: "/tarjetas", cargar: () => require("@/app/tarjetas/page").default, props: {} },
]

describe("páginas de administración de servidor (RF-1 a RF-3)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, "error").mockImplementation(() => {})
    supabaseVacio()
  })

  describe.each(paginasServidor)("$ruta", ({ cargar, props }) => {
    it("redirige a un usuario no administrador sin consultar datos", async () => {
      comoUsuario()
      const pagina = cargar()
      await expect(Promise.resolve().then(() => pagina(props as never))).rejects.toThrow(
        "NEXT_REDIRECT:/?aviso=sin-permiso",
      )
      expect(autorizacion.requerirAdminPagina).toHaveBeenCalledTimes(1)
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it("deja pasar a un administrador", async () => {
      comoAdmin()
      const pagina = cargar()
      // notFound() de la edición con datos vacíos también cuenta como "pasó la guarda".
      await Promise.resolve()
        .then(() => pagina(props as never))
        .catch((error: Error) => {
          if (!String(error.message).includes("NEXT_NOT_FOUND")) throw error
        })
      expect(autorizacion.requerirAdminPagina).toHaveBeenCalledTimes(1)
    })
  })
})

type Layout = (props: { children: unknown }) => Promise<unknown>

const layoutsCliente: Array<{ ruta: string; cargar: () => Layout }> = [
  { ruta: "/coches/nuevo", cargar: () => require("@/app/coches/nuevo/layout").default },
  { ruta: "/empleados/nuevo", cargar: () => require("@/app/empleados/nuevo/layout").default },
  { ruta: "/empleados/nuevo-empleado", cargar: () => require("@/app/empleados/nuevo-empleado/layout").default },
  { ruta: "/empleados/[id]/editar", cargar: () => require("@/app/empleados/[id]/editar/layout").default },
  { ruta: "/reservas", cargar: () => require("@/app/reservas/layout").default },
  { ruta: "/admin", cargar: () => require("@/app/admin/layout").default },
  { ruta: "/diagnostico", cargar: () => require("@/app/diagnostico/layout").default },
]

describe("layouts de guarda de páginas cliente (RF-1 a RF-3)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe.each(layoutsCliente)("$ruta", ({ cargar }) => {
    it("redirige a un usuario no administrador sin renderizar la página", async () => {
      comoUsuario()
      await expect(cargar()({ children: "PAGINA" })).rejects.toThrow("NEXT_REDIRECT:/?aviso=sin-permiso")
    })

    it("renderiza la página para un administrador", async () => {
      comoAdmin()
      const elemento = (await cargar()({ children: "PAGINA" })) as { props: { children: unknown } }
      expect(elemento.props.children).toBe("PAGINA")
      expect(autorizacion.requerirAdminPagina).toHaveBeenCalledTimes(1)
    })
  })
})

// Busca un texto en el árbol JSX devuelto por la página, sin renderizar componentes hijos.
function contieneTexto(nodo: unknown, texto: string): boolean {
  if (nodo === null || nodo === undefined || typeof nodo === "boolean") return false
  if (typeof nodo === "string" || typeof nodo === "number") return String(nodo).includes(texto)
  if (Array.isArray(nodo)) return nodo.some((hijo) => contieneTexto(hijo, texto))
  if (typeof nodo === "object" && "props" in (nodo as object)) {
    const props = (nodo as { props: Record<string, unknown> }).props
    return Object.values(props).some((valor) => contieneTexto(valor, texto))
  }
  return false
}

function contieneHref(nodo: unknown, href: string): boolean {
  if (nodo === null || nodo === undefined || typeof nodo !== "object") return false
  if (Array.isArray(nodo)) return nodo.some((hijo) => contieneHref(hijo, href))
  if ("props" in (nodo as object)) {
    const props = (nodo as { props: Record<string, unknown> }).props
    if (props.href === href) return true
    return Object.values(props).some((valor) => contieneHref(valor, href))
  }
  return false
}

// Supabase con un coche existente para la consulta de la ficha.
function supabaseConCoche(coche: Record<string, unknown> | null) {
  mockFrom.mockImplementation(((tabla: string) => {
    const b: Record<string, unknown> = {}
    for (const m of ["select", "eq", "neq", "in", "is", "not", "or", "order", "limit"]) {
      b[m] = () => b
    }
    b.single = async () =>
      tabla === "coches" && coche ? { data: coche, error: null } : { data: null, error: { message: "no rows" } }
    b.maybeSingle = async () => ({ data: null, error: null })
    b.then = (ok: (r: unknown) => unknown, ko: (e: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(ok, ko)
    return b
  }) as unknown as typeof supabaseServer.from)
}

describe("ficha de coche /coches/detalle/[id] (RF-6, RF-7, RF-9)", () => {
  const cargarFicha = () => require("@/app/coches/detalle/[id]/page").default as Pagina
  const coche = { matricula: "1111-AAA", marca: "Seat", modelo: "León", asignadoa: 3, eliminado: false }
  const ctxUsuario = { autenticado: true as const, email: "u@fulcrum.es", empleadoId: 3, empleadoIds: [3], esAdmin: false }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, "error").mockImplementation(() => {})
  })

  it("usuario sin relación con el coche → redirige con aviso sin cargar datos", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: false, error: "No autorizado" })
    supabaseConCoche(coche)
    await expect(Promise.resolve().then(() => cargarFicha()({ params: { id: "1111-AAA" } } as never))).rejects.toThrow(
      "NEXT_REDIRECT:/?aviso=sin-permiso",
    )
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("usuario con matrícula inexistente → redirige igual (no revela si existe)", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: true, ctx: ctxUsuario })
    supabaseConCoche(null)
    await expect(Promise.resolve().then(() => cargarFicha()({ params: { id: "9999-ZZZ" } } as never))).rejects.toThrow(
      "NEXT_REDIRECT:/?aviso=sin-permiso",
    )
  })

  it("usuario relacionado → ficha en solo lectura, sin Editar ni Restaurar, volviendo al inicio", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: true, ctx: ctxUsuario })
    supabaseConCoche(coche)
    const pagina = await cargarFicha()({ params: { id: "1111-AAA" } } as never)
    expect(contieneTexto(pagina, "1111-AAA")).toBe(true)
    expect(contieneTexto(pagina, "Editar Coche")).toBe(false)
    expect(contieneTexto(pagina, "Volver al inicio")).toBe(true)
    expect(contieneHref(pagina, "/")).toBe(true)
    expect(contieneHref(pagina, "/coches")).toBe(false)
  })

  it("usuario relacionado con coche dado de baja → sin botón Restaurar", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: true, ctx: ctxUsuario })
    supabaseConCoche({ ...coche, eliminado: true })
    const pagina = (await cargarFicha()({ params: { id: "1111-AAA" } } as never)) as unknown
    const { RestoreCocheButton } = require("@/components/restore-coche-button")
    const tieneRestaurar = (nodo: unknown): boolean => {
      if (!nodo || typeof nodo !== "object") return false
      if (Array.isArray(nodo)) return nodo.some(tieneRestaurar)
      const el = nodo as { type?: unknown; props?: Record<string, unknown> }
      if (el.type === RestoreCocheButton) return true
      return Object.values(el.props ?? {}).some(tieneRestaurar)
    }
    expect(tieneRestaurar(pagina)).toBe(false)
  })

  it("administrador → ficha como antes, con Editar Coche y vuelta a /coches", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: true, ctx: ctxAdmin })
    supabaseConCoche(coche)
    const pagina = await cargarFicha()({ params: { id: "1111-AAA" } } as never)
    expect(contieneTexto(pagina, "Editar Coche")).toBe(true)
    expect(contieneHref(pagina, "/coches")).toBe(true)
  })

  it("administrador con matrícula inexistente → 'Coche no encontrado' como antes", async () => {
    autorizacion.autorizarLecturaCoche.mockResolvedValue({ ok: true, ctx: ctxAdmin })
    supabaseConCoche(null)
    const pagina = await cargarFicha()({ params: { id: "9999-ZZZ" } } as never)
    expect(contieneTexto(pagina, "Coche no encontrado")).toBe(true)
  })
})
