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
    cochesDisponibles: cochesArray.filter(
      (c) => !c.alquiler && !c.empleado_id && (!c.asignadoa || c.asignadoa.trim() === ""),
    ).length,
    cochesAsignados: cochesArray.filter((c) => c.empleado_id || (c.asignadoa && c.asignadoa.trim() !== "")).length,
  }
}

describe("Dashboard Statistics Calculation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("correctly counts cars assigned via empleado_id", () => {
    const coches = [
      { matricula: "1234ABC", alquiler: false, empleado_id: 1, asignadoa: null },
      { matricula: "5678DEF", alquiler: false, empleado_id: 2, asignadoa: null },
      { matricula: "9012GHI", alquiler: false, empleado_id: null, asignadoa: null },
    ]

    const stats = calculateStats(coches)

    expect(stats.totalCoches).toBe(3)
    expect(stats.cochesAsignados).toBe(2) // 1234ABC y 5678DEF
    expect(stats.cochesDisponibles).toBe(1) // 9012GHI
  })

  it("correctly counts cars assigned via asignadoa field", () => {
    const coches = [
      { matricula: "1234ABC", alquiler: false, empleado_id: null, asignadoa: "Paula Ezcurra" },
      { matricula: "5678DEF", alquiler: false, empleado_id: null, asignadoa: "Juan Pérez" },
      { matricula: "9012GHI", alquiler: false, empleado_id: null, asignadoa: null },
    ]

    const stats = calculateStats(coches)

    expect(stats.totalCoches).toBe(3)
    expect(stats.cochesAsignados).toBe(2) // 1234ABC y 5678DEF
    expect(stats.cochesDisponibles).toBe(1) // 9012GHI
  })

  it("correctly counts cars with both empleado_id and asignadoa", () => {
    const coches = [
      { matricula: "1234ABC", alquiler: false, empleado_id: 1, asignadoa: "Texto Legacy" },
      { matricula: "5678DEF", alquiler: false, empleado_id: null, asignadoa: "Paula Ezcurra" },
      { matricula: "9012GHI", alquiler: false, empleado_id: 2, asignadoa: null },
    ]

    const stats = calculateStats(coches)

    expect(stats.totalCoches).toBe(3)
    expect(stats.cochesAsignados).toBe(3) // Todos están asignados
    expect(stats.cochesDisponibles).toBe(0)
  })

  it("ignores empty or whitespace-only asignadoa values", () => {
    const coches = [
      { matricula: "1234ABC", alquiler: false, empleado_id: null, asignadoa: "" },
      { matricula: "5678DEF", alquiler: false, empleado_id: null, asignadoa: "   " },
      { matricula: "9012GHI", alquiler: false, empleado_id: null, asignadoa: "Paula Ezcurra" },
      { matricula: "3456JKL", alquiler: false, empleado_id: null, asignadoa: null },
    ]

    const stats = calculateStats(coches)

    expect(stats.totalCoches).toBe(4)
    expect(stats.cochesAsignados).toBe(1) // Solo 9012GHI
    expect(stats.cochesDisponibles).toBe(3) // 1234ABC, 5678DEF, 3456JKL
  })

  it("excludes rental cars from available count", () => {
    const coches = [
      { matricula: "1234ABC", alquiler: true, empleado_id: null, asignadoa: null },
      { matricula: "5678DEF", alquiler: true, empleado_id: 1, asignadoa: null },
      { matricula: "9012GHI", alquiler: false, empleado_id: null, asignadoa: null },
      { matricula: "3456JKL", alquiler: false, empleado_id: 2, asignadoa: null },
    ]

    const stats = calculateStats(coches)

    expect(stats.totalCoches).toBe(4)
    expect(stats.cochesAsignados).toBe(2) // 5678DEF y 3456JKL (empleado_id)
    expect(stats.cochesDisponibles).toBe(1) // Solo 9012GHI (no alquiler, no asignado)
  })

  it("handles mixed scenarios correctly", () => {
    const coches = [
      // Asignado por empleado_id
      { matricula: "1234ABC", alquiler: false, empleado_id: 1, asignadoa: null },
      // Asignado por asignadoa
      { matricula: "5678DEF", alquiler: false, empleado_id: null, asignadoa: "Paula Ezcurra" },
      // Alquiler (no cuenta como disponible)
      { matricula: "9012GHI", alquiler: true, empleado_id: null, asignadoa: null },
      // Disponible
      { matricula: "3456JKL", alquiler: false, empleado_id: null, asignadoa: null },
      // Asignado por ambos campos
      { matricula: "7890MNO", alquiler: false, empleado_id: 2, asignadoa: "Texto Legacy" },
      // Asignadoa vacío (disponible)
      { matricula: "1111PQR", alquiler: false, empleado_id: null, asignadoa: "" },
    ]

    const stats = calculateStats(coches)

    expect(stats.totalCoches).toBe(6)
    expect(stats.cochesAsignados).toBe(3) // 1234ABC, 5678DEF, 7890MNO
    expect(stats.cochesDisponibles).toBe(2) // 3456JKL, 1111PQR
  })

  it("handles null and undefined values gracefully", () => {
    const coches = [
      { matricula: "1234ABC", alquiler: false, empleado_id: null, asignadoa: undefined },
      { matricula: "5678DEF", alquiler: false, empleado_id: undefined, asignadoa: null },
      { matricula: "9012GHI", alquiler: null, empleado_id: null, asignadoa: null },
    ]

    const stats = calculateStats(coches)

    expect(stats.totalCoches).toBe(3)
    expect(stats.cochesAsignados).toBe(0)
    expect(stats.cochesDisponibles).toBe(3) // Todos disponibles
  })
})
