import { crearCoche } from "@/app/coches/nuevo/actions"
import { supabase } from "@/lib/supabase"
import jest from "jest"

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe("Validación de matrícula duplicada", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("no permite crear un coche con una matrícula que ya existe", async () => {
    // Mock para verificar matrícula duplicada - Simula que encuentra un coche con la misma matrícula
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { matricula: "1234ABC" },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    const formData = new FormData()
    formData.append("matricula", "1234ABC")
    formData.append("marca", "Toyota")
    formData.append("modelo", "Corolla")

    const result = await crearCoche(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Ya existe un coche con la matrícula 1234ABC")

    // Verificar que se llamó a select con la matrícula correcta
    expect(mockSelect).toHaveBeenCalled()
    expect(mockSupabase.from).toHaveBeenCalledWith("coches")
  })

  it("permite crear un coche cuando la matrícula no existe", async () => {
    // Mock para verificar matrícula duplicada - Simula que no encuentra ningún coche
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" }, // No rows found
        }),
      }),
    })

    // Mock para insertar coche
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [{ matricula: "5678DEF", marca: "Honda", modelo: "Civic" }],
        error: null,
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === "coches") {
        return {
          select: mockSelect,
          insert: mockInsert,
        } as any
      }
      return {} as any
    })

    const formData = new FormData()
    formData.append("matricula", "5678DEF")
    formData.append("marca", "Honda")
    formData.append("modelo", "Civic")

    const result = await crearCoche(formData)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()

    // Verificar que se llamó a select y luego a insert
    expect(mockSelect).toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalled()
  })

  it("maneja errores al verificar matrícula duplicada", async () => {
    // Mock para simular un error al verificar la matrícula
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "OTHER_ERROR", message: "Database connection error" },
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    const formData = new FormData()
    formData.append("matricula", "9012GHI")
    formData.append("marca", "Ford")
    formData.append("modelo", "Focus")

    const result = await crearCoche(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Error al verificar la matrícula")
  })
})
