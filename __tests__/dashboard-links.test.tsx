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

describe("Dashboard Clickable Stats", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders clickable links for all stats", async () => {
    // Mock data
    const mockCoches = [
      {
        matricula: "1234ABC",
        marca: "Toyota",
        modelo: "Corolla",
        alquiler: false,
        empleado_id: 1,
        asignadoa: null,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        matricula: "5678DEF",
        marca: "Ford",
        modelo: "Focus",
        alquiler: false,
        empleado_id: null,
        asignadoa: null,
        created_at: "2024-01-02T00:00:00Z",
      },
    ]

    const mockEmpleados = [{ id: 1, nombre: "Juan", apellidos: "Pérez" }]

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
          data: mockCoches,
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

    // Verificar que los números son enlaces
    const totalCochesLink = screen.getByText("2").closest("a")
    const cochesAsignadosLink = screen.getByText("1").closest("a")
    const cochesDisponiblesLink = screen.getByText("1").closest("a")
    const empleadosLink = screen.getByText("1").closest("a")

    // Verificar que los enlaces tienen las URLs correctas
    expect(totalCochesLink).toHaveAttribute("href", "/coches")
    expect(cochesAsignadosLink).toHaveAttribute("href", "/coches?filter=assigned")
    expect(cochesDisponiblesLink).toHaveAttribute("href", "/coches?filter=available")
    expect(empleadosLink).toHaveAttribute("href", "/empleados")
  })

  it("applies hover styles to clickable stats", async () => {
    // Mock data
    const mockCoches = [{ matricula: "1234ABC", alquiler: false, empleado_id: null, asignadoa: null }]
    const mockEmpleados = [{ id: 1, nombre: "Juan", apellidos: "Pérez" }]

    mockSupabase.from.mockImplementation((table) => {
      if (table === "coches") {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockCoches,
              error: null,
            }),
          }),
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
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: mockCoches,
              error: null,
            }),
          }),
        }),
      } as any
    })

    render(await HomePage())

    // Verificar que los enlaces tienen clases de hover
    const totalCochesLink = screen.getByText("1").closest("a")
    expect(totalCochesLink).toHaveClass("hover:text-blue-600")
  })
})
