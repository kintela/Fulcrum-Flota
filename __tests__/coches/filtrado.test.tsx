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

describe("Página de Coches - Filtrado", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("muestra todos los coches cuando no hay filtro", async () => {
    const mockCoches = [
      { matricula: "1234ABC", alquiler: false, empleado_id: 1, asignadoa: null },
      { matricula: "5678DEF", alquiler: false, empleado_id: null, asignadoa: null },
      { matricula: "9012GHI", alquiler: true, empleado_id: null, asignadoa: null },
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

    // Verificar que se muestran los enlaces de filtro rápido
    expect(screen.getByText("Ver asignados")).toBeInTheDocument()
    expect(screen.getByText("Ver disponibles")).toBeInTheDocument()
    expect(screen.getByText("Ver alquileres")).toBeInTheDocument()
  })

  it("filtra coches asignados correctamente", async () => {
    const mockCoches = [
      { matricula: "1234ABC", alquiler: false, empleado_id: 1, asignadoa: null },
      { matricula: "7890MNO", alquiler: false, empleado_id: null, asignadoa: "Paula Ezcurra" },
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

    render(await CochesPage({ searchParams: { filter: "assigned" } }))

    expect(screen.getByText("Coches Asignados")).toBeInTheDocument()
    expect(screen.getByText("1234ABC")).toBeInTheDocument()
    expect(screen.getByText("7890MNO")).toBeInTheDocument()

    // Verificar que se muestra el botón para quitar filtros
    expect(screen.getByText("Quitar filtros")).toBeInTheDocument()

    // Verificar que NO se muestran los enlaces de filtro rápido
    expect(screen.queryByText("Ver asignados")).not.toBeInTheDocument()
  })

  it("filtra coches disponibles correctamente", async () => {
    const mockCoches = [{ matricula: "5678DEF", alquiler: false, empleado_id: null, asignadoa: null }]

    const mockSelect = jest.fn().mockReturnValue({
      is: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockCoches,
              error: null,
            }),
          }),
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage({ searchParams: { filter: "available" } }))

    expect(screen.getByText("Coches Disponibles")).toBeInTheDocument()
    expect(screen.getByText("5678DEF")).toBeInTheDocument()

    // Verificar que se muestra el botón para quitar filtros
    expect(screen.getByText("Quitar filtros")).toBeInTheDocument()
  })

  it("filtra coches de alquiler correctamente", async () => {
    const mockCoches = [{ matricula: "9012GHI", alquiler: true, empleado_id: null, asignadoa: null }]

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

    // Verificar que se muestra el botón para quitar filtros
    expect(screen.getByText("Quitar filtros")).toBeInTheDocument()
  })

  it("muestra mensaje adecuado cuando no hay resultados con filtro", async () => {
    const mockSelect = jest.fn().mockReturnValue({
      or: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    render(await CochesPage({ searchParams: { filter: "assigned" } }))

    expect(screen.getByText("No hay vehículos que coincidan con el filtro")).toBeInTheDocument()
    expect(screen.getByText("Prueba con otro filtro o agrega nuevos vehículos a la flota.")).toBeInTheDocument()

    // Verificar que se muestran los botones adecuados
    expect(screen.getByText("Ver todos los coches")).toBeInTheDocument()
    expect(screen.getByText("Agregar Vehículo")).toBeInTheDocument()
  })
})
