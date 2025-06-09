import { editarCoche, obtenerCoche } from "@/app/coches/[id]/editar/actions"
import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import jest from "jest"

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

describe("editarCoche Server Action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("actualiza un coche exitosamente", async () => {
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ matricula: "1234ABC", marca: "Toyota", modelo: "Corolla" }],
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      update: mockUpdate,
    } as any)

    const formData = new FormData()
    formData.append("matricula", "1234ABC")
    formData.append("marca", "Toyota")
    formData.append("modelo", "Corolla")
    formData.append("kms", "55000")
    formData.append("extras", "Aire acondicionado, navegador GPS")

    const result = await editarCoche("1234ABC", formData)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(mockSupabase.from).toHaveBeenCalledWith("coches")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/coches")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/coches/1234ABC")
  })

  it("retorna error cuando faltan campos obligatorios", async () => {
    const formData = new FormData()
    formData.append("matricula", "")
    formData.append("marca", "Toyota")
    formData.append("modelo", "Corolla")

    const result = await editarCoche("1234ABC", formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Los campos matrícula, marca y modelo son obligatorios")
  })

  it("maneja errores de Supabase en actualización", async () => {
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      update: mockUpdate,
    } as any)

    const formData = new FormData()
    formData.append("matricula", "1234ABC")
    formData.append("marca", "Toyota")
    formData.append("modelo", "Corolla")

    const result = await editarCoche("1234ABC", formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Error al actualizar el coche: Database error")
  })

  it("procesa correctamente el campo extras", async () => {
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 1 }],
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      update: mockUpdate,
    } as any)

    const formData = new FormData()
    formData.append("matricula", "1234ABC")
    formData.append("marca", "Toyota")
    formData.append("modelo", "Corolla")
    formData.append("extras", "Aire acondicionado, navegador GPS, cámara trasera, sensores de aparcamiento")

    await editarCoche("1234ABC", formData)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        extras: "Aire acondicionado, navegador GPS, cámara trasera, sensores de aparcamiento",
      }),
    )
  })
})

describe("obtenerCoche Server Action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("obtiene un coche exitosamente", async () => {
    const mockCoche = {
      matricula: "1234ABC",
      marca: "Toyota",
      modelo: "Corolla",
      extras: "Aire acondicionado, navegador GPS",
    }

    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockCoche,
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    const result = await obtenerCoche("1234ABC")

    expect(result).toEqual(mockCoche)
    expect(mockSupabase.from).toHaveBeenCalledWith("coches")
  })

  it("retorna null cuando no encuentra el coche", async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "No rows found" },
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    const result = await obtenerCoche("NOEXISTE")

    expect(result).toBeNull()
  })

  it("maneja ID indefinido", async () => {
    const result = await obtenerCoche("undefined")
    expect(result).toBeNull()
  })

  it("maneja ID vacío", async () => {
    const result = await obtenerCoche("")
    expect(result).toBeNull()
  })
})
