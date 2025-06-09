import { crearCoche } from "@/app/coches/nuevo/actions"
import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import jest from "jest" // Declare the jest variable

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

// Mock revalidatePath
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>

describe("crearCoche Server Action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("crea un coche exitosamente", async () => {
    // Mock para verificar matrícula duplicada
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" }, // No rows found
        }),
      }),
    })

    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [{ id: 1, matricula: "1234ABC", marca: "Toyota", modelo: "Corolla" }],
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
    formData.append("matricula", "1234ABC")
    formData.append("marca", "Toyota")
    formData.append("modelo", "Corolla")
    formData.append("kms", "0")
    formData.append("combustible", "Gasolina")

    const result = await crearCoche(formData)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(mockSupabase.from).toHaveBeenCalledWith("coches")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/coches")
  })

  it("retorna error cuando faltan campos obligatorios", async () => {
    const formData = new FormData()
    formData.append("matricula", "")
    formData.append("marca", "Toyota")
    formData.append("modelo", "Corolla")

    const result = await crearCoche(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Los campos matrícula, marca y modelo son obligatorios")
  })

  it("maneja errores de Supabase", async () => {
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      }),
    })

    mockSupabase.from.mockReturnValue({
      insert: mockInsert,
    } as any)

    const formData = new FormData()
    formData.append("matricula", "1234ABC")
    formData.append("marca", "Toyota")
    formData.append("modelo", "Corolla")

    const result = await crearCoche(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Error al crear el coche: Database error")
  })

  it("procesa correctamente todos los campos", async () => {
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [{ id: 1 }],
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValue({
      insert: mockInsert,
    } as any)

    const formData = new FormData()
    formData.append("matricula", "1234ABC")
    formData.append("marca", "Toyota")
    formData.append("modelo", "Corolla")
    formData.append("color", "Rojo")
    formData.append("kms", "15000")
    formData.append("kw", "100")
    formData.append("cv", "136")
    formData.append("cc", "1800")
    formData.append("combustible", "Gasolina")
    formData.append("preciocompra", "20000.50")
    formData.append("asignadoa", "Juan Pérez")
    formData.append("donante", "on")
    formData.append("alquiler", "on")
    formData.append("extras", "Aire acondicionado")

    await crearCoche(formData)

    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        matricula: "1234ABC",
        marca: "Toyota",
        modelo: "Corolla",
        color: "Rojo",
        kms: 15000,
        kw: 100,
        cv: 136,
        cc: 1800,
        combustible: "Gasolina",
        preciocompra: 20000.5,
        asignadoa: "Juan Pérez",
        donante: true,
        alquiler: true,
        extras: "Aire acondicionado",
      }),
    ])
  })
})
