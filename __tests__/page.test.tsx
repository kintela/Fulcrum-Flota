import { render, screen } from "@testing-library/react"
import HomePage from "@/app/page"
import { supabase } from "@/lib/supabase"
import jest from "jest"

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe("Home Page Dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the dashboard title", async () => {
    // Mock empty data
    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await HomePage())
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
  })

  it("calculates assigned cars correctly including asignadoa field", async () => {
    const mockCoches = [
      {
        matricula: "1234ABC",
        marca: "Toyota",
        modelo: "Corolla",
        alquiler: false,
        empleado_id: 1, // Asignado por relación
        asignadoa: null,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        matricula: "5678DEF",
        marca: "Ford",
        modelo: "Focus",
        alquiler: false,
        empleado_id: null,
        asignadoa: "Paula Ezcurra", // Asignado por texto
        created_at: "2024-01-02T00:00:00Z",
      },
      {
        matricula: "9012GHI",
        marca: "Volkswagen",
        modelo: "Golf",
        alquiler: false,
        empleado_id: null,
        asignadoa: null, // No asignado
        created_at: "2024-01-03T00:00:00Z",
      },
      {
        matricula: "3456JKL",
        marca: "Seat",
        modelo: "Ibiza",
        alquiler: true, // Alquiler
        empleado_id: null,
        asignadoa: null,
        created_at: "2024-01-04T00:00:00Z",
      },
      {
        matricula: "7890MNO",
        marca: "Renault",
        modelo: "Megane",
        alquiler: false,
        empleado_id: 2,
        asignadoa: "Texto Legacy", // Ambos campos (prioridad a empleado_id)
        created_at: "2024-01-05T00:00:00Z",
      },
    ]

    const mockEmpleados = [
      { id: 1, nombre: "Juan", apellidos: "Pérez" },
      { id: 2, nombre: "María", apellidos: "García" },
    ]

    // Mock para coches
    const mockSelectCoches = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: mockCoches,
        error: null,
      }),
    })

    // Mock para empleados
    const mockSelectEmpleados = jest.fn().mockResolvedValue({
      data: mockEmpleados,
      error: null,
    })

    // Mock para coches recientes
    const mockSelectRecientes = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: mockCoches.slice(0, 3),
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === "coches") {
        return {
          select: mockSelectCoches,
        } as any
      }
      if (table === "empleados") {
        return {
          select: jest.fn().mockResolvedValue({
            data: mockEmpleados,
            error: null,
          }),
        } as any
      }
      return {
        select: mockSelectRecientes,
      } as any
    })

    render(await HomePage())

    // Verificar estadísticas
    expect(screen.getByText("5")).toBeInTheDocument() // Total coches
    expect(screen.getByText("3")).toBeInTheDocument() // Asignados (1234ABC, 5678DEF, 7890MNO)
    expect(screen.getByText("1")).toBeInTheDocument() // Disponibles (9012GHI)
    expect(screen.getByText("2")).toBeInTheDocument() // Empleados
  })

  it("handles empty asignadoa field correctly", async () => {
    const mockCoches = [
      {
        matricula: "1234ABC",
        marca: "Toyota",
        modelo: "Corolla",
        alquiler: false,
        empleado_id: null,
        asignadoa: "", // Campo vacío
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        matricula: "5678DEF",
        marca: "Ford",
        modelo: "Focus",
        alquiler: false,
        empleado_id: null,
        asignadoa: "   ", // Solo espacios
        created_at: "2024-01-02T00:00:00Z",
      },
      {
        matricula: "9012GHI",
        marca: "Volkswagen",
        modelo: "Golf",
        alquiler: false,
        empleado_id: null,
        asignadoa: "Juan Pérez", // Texto válido
        created_at: "2024-01-03T00:00:00Z",
      },
    ]

    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: mockCoches,
        error: null,
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === "empleados") {
        return {
          select: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      return {
        select: mockSelect,
      } as any
    })

    render(await HomePage())

    // Solo 9012GHI debería contar como asignado
    expect(screen.getByText("3")).toBeInTheDocument() // Total coches
    expect(screen.getByText("1")).toBeInTheDocument() // Asignados (solo 9012GHI)
    expect(screen.getByText("2")).toBeInTheDocument() // Disponibles (1234ABC, 5678DEF)
  })

  it("excludes rental cars from available count", async () => {
    const mockCoches = [
      {
        matricula: "1234ABC",
        marca: "Toyota",
        modelo: "Corolla",
        alquiler: true, // Alquiler
        empleado_id: null,
        asignadoa: null,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        matricula: "5678DEF",
        marca: "Ford",
        modelo: "Focus",
        alquiler: false,
        empleado_id: null,
        asignadoa: null, // Disponible
        created_at: "2024-01-02T00:00:00Z",
      },
    ]

    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: mockCoches,
        error: null,
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === "empleados") {
        return {
          select: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      return {
        select: mockSelect,
      } as any
    })

    render(await HomePage())

    expect(screen.getByText("2")).toBeInTheDocument() // Total coches
    expect(screen.getByText("0")).toBeInTheDocument() // Asignados
    expect(screen.getByText("1")).toBeInTheDocument() // Disponibles (solo 5678DEF)
  })

  it("displays vehicle assignment status correctly in recent vehicles", async () => {
    const mockCoches = [
      {
        matricula: "1234ABC",
        marca: "Toyota",
        modelo: "Corolla",
        alquiler: false,
        empleado_id: null,
        asignadoa: "Paula Ezcurra",
        empleados: null,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        matricula: "5678DEF",
        marca: "Ford",
        modelo: "Focus",
        alquiler: false,
        empleado_id: null,
        asignadoa: null,
        empleados: null,
        created_at: "2024-01-02T00:00:00Z",
      },
      {
        matricula: "9012GHI",
        marca: "Volkswagen",
        modelo: "Golf",
        alquiler: true,
        empleado_id: null,
        asignadoa: null,
        empleados: null,
        created_at: "2024-01-03T00:00:00Z",
      },
    ]

    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: mockCoches,
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === "empleados") {
        return {
          select: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      return {
        select: mockSelect,
      } as any
    })

    render(await HomePage())

    // Verificar que se muestran los estados correctos
    expect(screen.getByText("Asignado a: Paula Ezcurra")).toBeInTheDocument()
    expect(screen.getByText("Disponible para asignación")).toBeInTheDocument()
    expect(screen.getByText("Vehículo de alquiler")).toBeInTheDocument()

    // Verificar badges
    expect(screen.getByText("Asignado")).toBeInTheDocument()
    expect(screen.getByText("Disponible")).toBeInTheDocument()
    expect(screen.getByText("Alquiler")).toBeInTheDocument()
  })

  it("handles database errors gracefully", async () => {
    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Database connection error" },
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await HomePage())

    // Debería mostrar 0 en todas las estadísticas cuando hay error
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    // Verificar que no se rompe la aplicación
    expect(screen.getByText("No hay vehículos registrados")).toBeInTheDocument()
  })

  it("prioritizes empleado relation over asignadoa text", async () => {
    const mockCoches = [
      {
        matricula: "1234ABC",
        marca: "Toyota",
        modelo: "Corolla",
        alquiler: false,
        empleado_id: null,
        asignadoa: "Texto Legacy",
        empleados: {
          id: 1,
          nombre: "Juan",
          apellidos: "Pérez",
        },
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: mockCoches,
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === "empleados") {
        return {
          select: jest.fn().mockResolvedValue({
            data: [{ id: 1, nombre: "Juan", apellidos: "Pérez" }],
            error: null,
          }),
        } as any
      }
      return {
        select: mockSelect,
      } as any
    })

    render(await HomePage())

    // Debería mostrar la relación de empleado, no el texto legacy
    expect(screen.getByText("Asignado a: Juan Pérez")).toBeInTheDocument()
    expect(screen.queryByText("Texto Legacy")).not.toBeInTheDocument()
  })
})
