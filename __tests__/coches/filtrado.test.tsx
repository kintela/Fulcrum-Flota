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

describe("Página de Coches - Filtrado Corregido", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("muestra todos los coches cuando no hay filtro", async () => {
    const mockCoches = [
      { matricula: "1234ABC", alquiler: false, asignadoa: "Paula Ezcurra" },
      { matricula: "5678DEF", alquiler: false, asignadoa: null },
      { matricula: "9012GHI", alquiler: true, asignadoa: null },
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

    render(await CochesPage({ searchParams: {} }))

    expect(screen.getByText("Gestión de Coches")).toBeInTheDocument()
    expect(screen.getByText("1234ABC")).toBeInTheDocument()
    expect(screen.getByText("5678DEF")).toBeInTheDocument()
    expect(screen.getByText("9012GHI")).toBeInTheDocument()
  })

  it("filtra coches asignados usando solo el campo asignadoa", async () => {
    const mockCoches = [
      { matricula: "1234ABC", alquiler: false, asignadoa: "Paula Ezcurra" },
      { matricula: "7890MNO", alquiler: true, asignadoa: "Juan Pérez" }, // Alquiler pero asignado
    ]

    const mockSelect = jest.fn().mockReturnValue({
      not: jest.fn().mockReturnValue({
        neq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockCoches,
            error: null,
          }),
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage({ searchParams: { filter: "assigned" } }))

    expect(screen.getByText("Coches Asignados")).toBeInTheDocument()
    expect(screen.getByText("1234ABC")).toBeInTheDocument()
    expect(screen.getByText("7890MNO")).toBeInTheDocument()
  })

  it("filtra coches disponibles usando la lógica simplificada (sin asignadoa)", async () => {
    const mockCoches = [
      { matricula: "5678DEF", alquiler: false, asignadoa: null },
      { matricula: "9012GHI", alquiler: true, asignadoa: "" }, // Alquiler sin asignar
      { matricula: "3456JKL", alquiler: false, asignadoa: null },
    ]

    const mockSelect = jest.fn().mockReturnValue({
      or: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockCoches,
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage({ searchParams: { filter: "available" } }))

    expect(screen.getByText("Coches Disponibles")).toBeInTheDocument()
    expect(screen.getByText("5678DEF")).toBeInTheDocument()
    expect(screen.getByText("9012GHI")).toBeInTheDocument()
    expect(screen.getByText("3456JKL")).toBeInTheDocument()
  })

  it("filtra coches de alquiler correctamente", async () => {
    const mockCoches = [{ matricula: "9012GHI", alquiler: true, asignadoa: null }]

    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockCoches,
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage({ searchParams: { filter: "rental" } }))

    expect(screen.getByText("Coches de Alquiler")).toBeInTheDocument()
    expect(screen.getByText("9012GHI")).toBeInTheDocument()
  })

  it("reproduce el escenario real: disponibles incluye alquileres sin asignar", async () => {
    // Simular el escenario donde hay 10 coches disponibles (sin valor en asignadoa)
    // incluyendo algunos que son de alquiler pero sin asignar
    const mockCoches = [
      { matricula: "DISP001", alquiler: false, asignadoa: null },
      { matricula: "DISP002", alquiler: false, asignadoa: "" },
      { matricula: "RENT001", alquiler: true, asignadoa: null }, // Alquiler sin asignar
      { matricula: "RENT002", alquiler: true, asignadoa: "" }, // Alquiler sin asignar
      { matricula: "DISP003", alquiler: false, asignadoa: null },
      { matricula: "DISP004", alquiler: false, asignadoa: null },
      { matricula: "RENT003", alquiler: true, asignadoa: null }, // Alquiler sin asignar
      { matricula: "DISP005", alquiler: false, asignadoa: null },
      { matricula: "DISP006", alquiler: false, asignadoa: null },
      { matricula: "DISP007", alquiler: false, asignadoa: null },
    ]

    const mockSelect = jest.fn().mockReturnValue({
      or: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockCoches,
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage({ searchParams: { filter: "available" } }))

    expect(screen.getByText("Coches Disponibles")).toBeInTheDocument()
    expect(screen.getByText("Vehículos disponibles (10 vehículos)")).toBeInTheDocument()

    // Verificar que se muestran todos los coches disponibles
    expect(screen.getByText("DISP001")).toBeInTheDocument()
    expect(screen.getByText("RENT001")).toBeInTheDocument()
    expect(screen.getByText("DISP007")).toBeInTheDocument()
  })

  it("maneja campos asignadoa con solo espacios como disponibles", async () => {
    const mockCoches = [
      { matricula: "SPACE001", alquiler: false, asignadoa: "   " }, // Solo espacios
      { matricula: "SPACE002", alquiler: true, asignadoa: "  " }, // Solo espacios
    ]

    const mockSelect = jest.fn().mockReturnValue({
      or: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockCoches,
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage({ searchParams: { filter: "available" } }))

    expect(screen.getByText("SPACE001")).toBeInTheDocument()
    expect(screen.getByText("SPACE002")).toBeInTheDocument()
  })
})
