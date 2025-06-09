import { render, screen } from "@testing-library/react"
import CochesPage from "@/app/coches/page"
import { supabase } from "@/lib/supabase"
import jest from "jest"

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe("Página de Coches - Asignación de Empleados", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("muestra el nombre del empleado cuando está asignado por relación", async () => {
    const mockCoches = [
      {
        matricula: "1234ABC",
        marca: "Toyota",
        modelo: "Corolla",
        color: "Blanco",
        kms: 50000,
        combustible: "Gasolina",
        alquiler: false,
        donante: false,
        asignadoa: null,
        empleados: {
          id: 1,
          nombre: "Paula",
          apellidos: "Ezcurra",
        },
      },
    ]

    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: mockCoches,
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage())

    expect(screen.getByText("1234ABC")).toBeInTheDocument()
    expect(screen.getByText("Toyota Corolla")).toBeInTheDocument()
    expect(screen.getByText("Paula Ezcurra")).toBeInTheDocument()
  })

  it("muestra el texto legacy cuando no hay relación pero sí campo asignadoa", async () => {
    const mockCoches = [
      {
        matricula: "5678DEF",
        marca: "Ford",
        modelo: "Focus",
        color: "Azul",
        kms: 30000,
        combustible: "Diesel",
        alquiler: false,
        donante: false,
        asignadoa: "Juan Pérez García",
        empleados: null,
      },
    ]

    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: mockCoches,
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage())

    expect(screen.getByText("5678DEF")).toBeInTheDocument()
    expect(screen.getByText("Ford Focus")).toBeInTheDocument()
    expect(screen.getByText("Juan Pérez García")).toBeInTheDocument()
  })

  it("muestra 'Alquiler' para vehículos de alquiler y no muestra asignación", async () => {
    const mockCoches = [
      {
        matricula: "9012GHI",
        marca: "Volkswagen",
        modelo: "Golf",
        color: "Negro",
        kms: 15000,
        combustible: "Gasolina",
        alquiler: true,
        donante: false,
        asignadoa: "Debería ignorarse",
        empleados: {
          id: 2,
          nombre: "María",
          apellidos: "García",
        },
      },
    ]

    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: mockCoches,
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage())

    expect(screen.getByText("9012GHI")).toBeInTheDocument()
    expect(screen.getByText("Volkswagen Golf")).toBeInTheDocument()
    expect(screen.getByText("Alquiler")).toBeInTheDocument()
    // No debería mostrar el nombre del empleado ni el texto legacy
    expect(screen.queryByText("María García")).not.toBeInTheDocument()
    expect(screen.queryByText("Debería ignorarse")).not.toBeInTheDocument()
  })

  it("muestra 'Sin asignar' cuando no hay asignación", async () => {
    const mockCoches = [
      {
        matricula: "3456JKL",
        marca: "Seat",
        modelo: "Ibiza",
        color: "Rojo",
        kms: 0,
        combustible: "Gasolina",
        alquiler: false,
        donante: false,
        asignadoa: null,
        empleados: null,
      },
    ]

    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: mockCoches,
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage())

    expect(screen.getByText("3456JKL")).toBeInTheDocument()
    expect(screen.getByText("Seat Ibiza")).toBeInTheDocument()
    expect(screen.getByText("Sin asignar")).toBeInTheDocument()
  })

  it("prioriza la relación de empleado sobre el campo de texto legacy", async () => {
    const mockCoches = [
      {
        matricula: "7890MNO",
        marca: "Renault",
        modelo: "Megane",
        color: "Blanco",
        kms: 25000,
        combustible: "Diesel",
        alquiler: false,
        donante: false,
        asignadoa: "Texto Legacy Ignorado",
        empleados: {
          id: 3,
          nombre: "Ana",
          apellidos: "Martínez",
        },
      },
    ]

    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: mockCoches,
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage())

    expect(screen.getByText("7890MNO")).toBeInTheDocument()
    expect(screen.getByText("Renault Megane")).toBeInTheDocument()
    expect(screen.getByText("Ana Martínez")).toBeInTheDocument()
    // No debería mostrar el texto legacy
    expect(screen.queryByText("Texto Legacy Ignorado")).not.toBeInTheDocument()
  })

  it("muestra múltiples coches con diferentes tipos de asignación", async () => {
    const mockCoches = [
      {
        matricula: "0750-GMD",
        marca: "Renault",
        modelo: "Megane",
        color: "Blanco",
        kms: 0,
        combustible: "Gasolina",
        alquiler: false,
        donante: false,
        asignadoa: null,
        empleados: null,
      },
      {
        matricula: "0740-GMD",
        marca: "Renault",
        modelo: "Megane",
        color: "Blanco",
        kms: 0,
        combustible: "Gasolina",
        alquiler: true,
        donante: false,
        asignadoa: null,
        empleados: null,
      },
      {
        matricula: "0733-GMD",
        marca: "Renault",
        modelo: "Megane",
        color: "Blanco",
        kms: 0,
        combustible: "Diesel",
        alquiler: false,
        donante: false,
        asignadoa: "Paula Ezcurra",
        empleados: null,
      },
    ]

    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: mockCoches,
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage())

    // Verificar que todos los coches aparecen
    expect(screen.getByText("0750-GMD")).toBeInTheDocument()
    expect(screen.getByText("0740-GMD")).toBeInTheDocument()
    expect(screen.getByText("0733-GMD")).toBeInTheDocument()

    // Verificar estados de asignación
    expect(screen.getByText("Sin asignar")).toBeInTheDocument() // 0750-GMD
    expect(screen.getByText("Alquiler")).toBeInTheDocument() // 0740-GMD
    expect(screen.getByText("Paula Ezcurra")).toBeInTheDocument() // 0733-GMD
  })

  it("muestra badges correctos para vehículos donantes y de alquiler", async () => {
    const mockCoches = [
      {
        matricula: "BADGE123",
        marca: "Test",
        modelo: "Vehicle",
        color: "Verde",
        kms: 10000,
        combustible: "Gasolina",
        alquiler: true,
        donante: true,
        asignadoa: null,
        empleados: null,
      },
    ]

    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: mockCoches,
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage())

    expect(screen.getByText("BADGE123")).toBeInTheDocument()
    expect(screen.getByText("Donante")).toBeInTheDocument()
    expect(screen.getByText("Alquiler")).toBeInTheDocument()
  })

  it("maneja errores de Supabase correctamente", async () => {
    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage())

    // Debería mostrar el estado vacío cuando hay error
    expect(screen.getByText("No hay vehículos registrados")).toBeInTheDocument()
  })

  it("muestra el estado vacío cuando no hay coches", async () => {
    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage())

    expect(screen.getByText("No hay vehículos registrados")).toBeInTheDocument()
    expect(screen.getByText("Comienza agregando tu primer vehículo a la flota.")).toBeInTheDocument()
    expect(screen.getByText("Agregar Primer Coche")).toBeInTheDocument()
  })
})
