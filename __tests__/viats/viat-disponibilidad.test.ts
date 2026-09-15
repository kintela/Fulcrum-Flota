/** @jest-environment node */
import { obtenerTarjetasViat } from "@/app/actions/viats"
import { supabaseServer } from "@/lib/supabase-server"

jest.mock("@/lib/supabase-server", () => ({ supabaseServer: { from: jest.fn() } }))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))

function prepararConsultas(asignaciones: unknown[], error: unknown = null) {
  const tarjetas = ["1", "2", "3"].map((id) => ({ id, activo: true }))
  const query = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: tarjetas, error: null }),
    is: jest.fn().mockResolvedValue({ data: asignaciones, error }),
  }
  ;(supabaseServer.from as jest.Mock).mockReturnValue(query)
}

beforeEach(() => jest.clearAllMocks())

test("muestra las tarjetas existentes y bloquea solo las asignadas a otros coches", async () => {
  prepararConsultas([
    { viat_id: "1", matricula: "7652-DCX" },
    { viat_id: "2", matricula: "3392-NPC" },
  ])
  const tarjetas = await obtenerTarjetasViat(" 3392-npc ")
  expect(tarjetas).toEqual([
    { id: "1", activo: true, matricula_asignada: "7652-DCX", disponible: false },
    { id: "2", activo: true, matricula_asignada: "3392-NPC", disponible: true },
    { id: "3", activo: true, matricula_asignada: null, disponible: true },
  ])
})

test("mantiene visibles las tarjetas cuando todas están asignadas a otros coches", async () => {
  prepararConsultas(["1", "2", "3"].map((viat_id) => ({ viat_id, matricula: "7652-DCX" })))
  const tarjetas = await obtenerTarjetasViat("3392-NPC")
  expect(tarjetas).toHaveLength(3)
  expect(tarjetas.every((tarjeta) => tarjeta.disponible === false)).toBe(true)
})

test("propaga los errores de asignaciones para evitar mostrar tarjetas ocupadas como disponibles", async () => {
  const error = { message: "No se pudieron cargar las asignaciones" }
  const log = jest.spyOn(console, "error").mockImplementation(() => {})
  try {
    prepararConsultas([], error)
    await expect(obtenerTarjetasViat("3392-NPC")).rejects.toEqual(error)
  } finally {
    log.mockRestore()
  }
})
