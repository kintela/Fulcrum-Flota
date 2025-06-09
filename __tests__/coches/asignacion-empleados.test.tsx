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

describe("Asignación de Empleados en Lista de Coches", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("reproduce el caso específico de Paula Ezcurra en 0733-GMD", async () => {
    // Este test reproduce exactamente el caso que el usuario reportó
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
        created_at: "2024-01-03T00:00:00Z",
      },
      {
        matricula: "0740-GMD",
        marca: "Renault",
        modelo: "Megane",
        color: "Blanco",
        kms: 0,
        combustible: "Gasolina",
        alquiler: false,
        donante: false,
        asignadoa: null,
        empleados: null,
        created_at: "2024-01-02T00:00:00Z",
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
        asignadoa: "Paula Ezcurra", // Campo de texto legacy
        empleados: null, // Sin relación de empleado
        created_at: "2024-01-01T00:00:00Z",
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

    // Verificar que Paula Ezcurra aparece en el coche 0733-GMD
    expect(screen.getByText("0733-GMD")).toBeInTheDocument()
    expect(screen.getByText("Paula Ezcurra")).toBeInTheDocument()

    // Verificar que los otros coches muestran "Sin asignar"
    const sinAsignarElements = screen.getAllByText("Sin asignar")
    expect(sinAsignarElements).toHaveLength(2) // Para 0750-GMD y 0740-GMD
  })

  it("maneja la transición de campo legacy a relación de empleado", async () => {
    // Test que verifica que cuando se migra de texto a relación,
    // la relación tiene prioridad
    const mockCoches = [
      {
        matricula: "MIGRATED1",
        marca: "Test",
        modelo: "Migration",
        color: "Verde",
        kms: 5000,
        combustible: "Gasolina",
        alquiler: false,
        donante: false,
        asignadoa: "Texto Antiguo", // Campo legacy
        empleados: {
          id: 1,
          nombre: "Nuevo",
          apellidos: "Empleado",
        }, // Nueva relación
        created_at: "2024-01-01T00:00:00Z",
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

    // Debe mostrar la nueva relación, no el texto legacy
    expect(screen.getByText("Nuevo Empleado")).toBeInTheDocument()
    expect(screen.queryByText("Texto Antiguo")).not.toBeInTheDocument()
  })

  it("verifica que los campos de asignación se muestran en la posición correcta", async () => {
    const mockCoches = [
      {
        matricula: "POS123",
        marca: "Position",
        modelo: "Test",
        color: "Azul",
        kms: 1000,
        combustible: "Gasolina",
        alquiler: false,
        donante: false,
        asignadoa: "Empleado Asignado",
        empleados: null,
        created_at: "2024-01-01T00:00:00Z",
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

    // Verificar que el nombre del empleado aparece en la esquina superior derecha
    const card = screen.getByText("POS123").closest(".hover\\:shadow-lg")
    expect(card).toBeInTheDocument()

    // El nombre del empleado debe estar en el header de la card
    const cardHeader = card?.querySelector(".pb-3")
    expect(cardHeader).toContainElement(screen.getByText("Empleado Asignado"))
  })
})
