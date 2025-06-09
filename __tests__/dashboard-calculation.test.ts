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
function calculateStatsSimplified(cochesArray: any[]) {
  const totalCoches = cochesArray.length
  const cochesAsignados = cochesArray.filter((c) => c.asignadoa && c.asignadoa.trim() !== "").length
  const cochesDisponibles = totalCoches - cochesAsignados

  return {
    totalCoches,
    cochesAsignados,
    cochesDisponibles,
  }
}

describe("Dashboard Statistics - Simplified Calculation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("calculates available cars as Total - Assigned (regardless of rental status)", () => {
    const coches = [
      // Coches asignados (tienen valor en asignadoa)
      { matricula: "1234ABC", asignadoa: "Paula Ezcurra", alquiler: false },
      { matricula: "5678DEF", asignadoa: "Juan Pérez", alquiler: true }, // Alquiler pero asignado
      { matricula: "9012GHI", asignadoa: "María García", alquiler: false },

      // Coches no asignados (sin valor en asignadoa)
      { matricula: "3456JKL", asignadoa: null, alquiler: false },
      { matricula: "7890MNO", asignadoa: "", alquiler: true }, // Alquiler sin asignar
      { matricula: "1111PQR", asignadoa: "   ", alquiler: false }, // Solo espacios
    ]

    const stats = calculateStatsSimplified(coches)

    expect(stats.totalCoches).toBe(6)
    expect(stats.cochesAsignados).toBe(3) // Solo los que tienen valor válido en asignadoa
    expect(stats.cochesDisponibles).toBe(3) // Total - Asignados = 6 - 3 = 3
  })

  it("reproduces the exact scenario: 24 total, 14 assigned, 10 available", () => {
    // Crear un array con 24 coches: 14 asignados y 10 sin asignar
    const cochesAsignados = Array.from({ length: 14 }, (_, i) => ({
      matricula: `ASIG${i.toString().padStart(3, "0")}`,
      asignadoa: `Empleado ${i + 1}`,
      alquiler: i % 3 === 0, // Algunos son alquiler, pero eso no importa para el cálculo
    }))

    const cochesDisponibles = Array.from({ length: 10 }, (_, i) => ({
      matricula: `DISP${i.toString().padStart(3, "0")}`,
      asignadoa: null,
      alquiler: i % 2 === 0, // Algunos son alquiler, pero sin asignar
    }))

    const coches = [...cochesAsignados, ...cochesDisponibles]
    const stats = calculateStatsSimplified(coches)

    expect(stats.totalCoches).toBe(24)
    expect(stats.cochesAsignados).toBe(14)
    expect(stats.cochesDisponibles).toBe(10)
  })

  it("ignores empty and whitespace-only asignadoa values", () => {
    const coches = [
      { matricula: "1234ABC", asignadoa: "Paula Ezcurra", alquiler: false }, // Asignado
      { matricula: "5678DEF", asignadoa: "", alquiler: false }, // Vacío - NO asignado
      { matricula: "9012GHI", asignadoa: null, alquiler: false }, // Null - NO asignado
      { matricula: "3456JKL", asignadoa: "   ", alquiler: false }, // Solo espacios - NO asignado
      { matricula: "7890MNO", asignadoa: "Juan Pérez", alquiler: true }, // Asignado (aunque sea alquiler)
    ]

    const stats = calculateStatsSimplified(coches)

    expect(stats.totalCoches).toBe(5)
    expect(stats.cochesAsignados).toBe(2) // Solo 1234ABC y 7890MNO
    expect(stats.cochesDisponibles).toBe(3) // 5 - 2 = 3
  })

  it("rental status does not affect assignment calculation", () => {
    const coches = [
      // Alquileres asignados
      { matricula: "RENT001", asignadoa: "Cliente A", alquiler: true },
      { matricula: "RENT002", asignadoa: "Cliente B", alquiler: true },

      // Alquileres sin asignar
      { matricula: "RENT003", asignadoa: null, alquiler: true },
      { matricula: "RENT004", asignadoa: "", alquiler: true },

      // Coches normales asignados
      { matricula: "NORM001", asignadoa: "Empleado 1", alquiler: false },

      // Coches normales sin asignar
      { matricula: "NORM002", asignadoa: null, alquiler: false },
    ]

    const stats = calculateStatsSimplified(coches)

    expect(stats.totalCoches).toBe(6)
    expect(stats.cochesAsignados).toBe(3) // RENT001, RENT002, NORM001
    expect(stats.cochesDisponibles).toBe(3) // RENT003, RENT004, NORM002
  })

  it("handles undefined values gracefully", () => {
    const coches = [
      { matricula: "1234ABC", asignadoa: undefined, alquiler: false },
      { matricula: "5678DEF", asignadoa: "Valid Assignment", alquiler: undefined },
      { matricula: "9012GHI", asignadoa: null, alquiler: null },
    ]

    const stats = calculateStatsSimplified(coches)

    expect(stats.totalCoches).toBe(3)
    expect(stats.cochesAsignados).toBe(1) // Solo 5678DEF
    expect(stats.cochesDisponibles).toBe(2) // 1234ABC y 9012GHI
  })

  it("validates the mathematical relationship: Total = Assigned + Available", () => {
    const coches = [
      { matricula: "A001", asignadoa: "Employee 1", alquiler: false },
      { matricula: "A002", asignadoa: "Employee 2", alquiler: true },
      { matricula: "A003", asignadoa: null, alquiler: false },
      { matricula: "A004", asignadoa: "", alquiler: true },
      { matricula: "A005", asignadoa: "Employee 3", alquiler: false },
    ]

    const stats = calculateStatsSimplified(coches)

    // La suma de asignados + disponibles debe ser igual al total
    expect(stats.cochesAsignados + stats.cochesDisponibles).toBe(stats.totalCoches)

    // Verificar valores específicos
    expect(stats.totalCoches).toBe(5)
    expect(stats.cochesAsignados).toBe(3) // A001, A002, A005
    expect(stats.cochesDisponibles).toBe(2) // A003, A004
  })
})
