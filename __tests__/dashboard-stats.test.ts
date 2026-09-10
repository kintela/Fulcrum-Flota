import { supabase } from "@/lib/supabase"
import jest from "jest"

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

// Función auxiliar para calcular estadísticas (extraída de la lógica del dashboard)
function calculateStats(cochesArray: any[]) {
  return {
    totalCoches: cochesArray.length,
    cochesDisponibles: cochesArray.filter((c) => !c.alquiler && !c.asignadoa).length,
    cochesAsignados: cochesArray.filter((c) => Boolean(c.asignadoa)).length,
  }
}

describe("Dashboard Statistics Calculation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("correctly counts cars assigned via asignadoa", () => {
    const coches = [
      { matricula: "1234ABC", alquiler: false, asignadoa: 1 },
      { matricula: "5678DEF", alquiler: false, asignadoa: 2 },
      { matricula: "9012GHI", alquiler: false, asignadoa: null },
    ]

    const stats = calculateStats(coches)

    expect(stats.totalCoches).toBe(3)
    expect(stats.cochesAsignados).toBe(2) // 1234ABC y 5678DEF
    expect(stats.cochesDisponibles).toBe(1) // 9012GHI
  })

  it("correctly counts cars assigned via asignadoa field", () => {
    const coches = [
      { matricula: "1234ABC", alquiler: false, asignadoa: 1 },
      { matricula: "5678DEF", alquiler: false, asignadoa: 2 },
      { matricula: "9012GHI", alquiler: false, asignadoa: null },
    ]

    const stats = calculateStats(coches)

    expect(stats.totalCoches).toBe(3)
    expect(stats.cochesAsignados).toBe(2) // 1234ABC y 5678DEF
    expect(stats.cochesDisponibles).toBe(1) // 9012GHI
  })

  it("ignores empty asignadoa values", () => {
    const coches = [
      { matricula: "1234ABC", alquiler: false, asignadoa: null },
      { matricula: "9012GHI", alquiler: false, asignadoa: 1 },
      { matricula: "3456JKL", alquiler: false, asignadoa: null },
    ]

    const stats = calculateStats(coches)

    expect(stats.totalCoches).toBe(3)
    expect(stats.cochesAsignados).toBe(1) // Solo 9012GHI
    expect(stats.cochesDisponibles).toBe(2) // 1234ABC, 3456JKL
  })

  it("excludes rental cars from available count", () => {
    const coches = [
      { matricula: "1234ABC", alquiler: true, asignadoa: null },
      { matricula: "5678DEF", alquiler: true, asignadoa: 1 },
      { matricula: "9012GHI", alquiler: false, asignadoa: null },
      { matricula: "3456JKL", alquiler: false, asignadoa: 2 },
    ]

    const stats = calculateStats(coches)

    expect(stats.totalCoches).toBe(4)
    expect(stats.cochesAsignados).toBe(2) // 5678DEF y 3456JKL
    expect(stats.cochesDisponibles).toBe(1) // Solo 9012GHI (no alquiler, no asignado)
  })

  it("handles mixed scenarios correctly", () => {
    const coches = [
      { matricula: "1234ABC", alquiler: false, asignadoa: 1 },
      { matricula: "5678DEF", alquiler: false, asignadoa: 2 },
      // Alquiler (no cuenta como disponible)
      { matricula: "9012GHI", alquiler: true, asignadoa: null },
      // Disponible
      { matricula: "3456JKL", alquiler: false, asignadoa: null },
      { matricula: "7890MNO", alquiler: false, asignadoa: 3 },
      { matricula: "1111PQR", alquiler: false, asignadoa: null },
    ]

    const stats = calculateStats(coches)

    expect(stats.totalCoches).toBe(6)
    expect(stats.cochesAsignados).toBe(3) // 1234ABC, 5678DEF, 7890MNO
    expect(stats.cochesDisponibles).toBe(2) // 3456JKL, 1111PQR
  })

  it("handles null and undefined values gracefully", () => {
    const coches = [
      { matricula: "1234ABC", alquiler: false, asignadoa: undefined },
      { matricula: "5678DEF", alquiler: false, asignadoa: null },
      { matricula: "9012GHI", alquiler: null, asignadoa: null },
    ]

    const stats = calculateStats(coches)

    expect(stats.totalCoches).toBe(3)
    expect(stats.cochesAsignados).toBe(0)
    expect(stats.cochesDisponibles).toBe(3) // Todos disponibles
  })
})
