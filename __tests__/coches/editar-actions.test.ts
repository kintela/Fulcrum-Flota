import { editarCoche, obtenerCoche } from "@/app/coches/editar/[id]/actions"
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

// Mock para acciones de Solred
jest.mock("@/app/actions/solred", () => ({
  asignarTarjetaSolred: jest.fn().mockResolvedValue({ success: true }),
  desasignarTarjetaSolred: jest.fn().mockResolvedValue({ success: true }),
  obtenerTarjetaAsignada: jest.fn().mockResolvedValue(null),
  crearTarjetaSolred: jest.fn().mockResolvedValue({ success: true }),
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
          data: [{ id: 1, matricula: "1234ABC", marca: "Toyota", modelo: "Corolla" }],
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === "coches") {
        return {
          update: mockUpdate,
        } as any
      }
      return {} as any
    })

    const formData = new FormData()
    formData.append("matricula", "1234ABC")
    formData.append("marca", "Toyota")
    formData.append("modelo", "Corolla")
    formData.append("kms", "15000")
    formData.append("combustible", "Gasolina")

    const result = await editarCoche("1234ABC", formData)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(mockSupabase.from).toHaveBeenCalledWith("coches")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/coches")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/coches/detalle/1234ABC")
  })

  it("asigna correctamente el ID del empleado al campo asignadoa", async () => {
    // Mock para la consulta de empleado
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 42, nombre: "Juan Pérez" },
          error: null,
        }),
      }),
    })

    // Mock para la actualización
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              matricula: "1234ABC",
              marca: "Toyota",
              modelo: "Corolla",
              asignadoa: "42",
            },
          ],
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === "coches") {
        return {
          update: mockUpdate,
          select: mockSelect,
        } as any
      } else if (table === "empleados") {
        return {
          select: mockSelect,
        } as any
      }
      return {} as any
    })

    const formData = new FormData()
    formData.append("matricula", "1234ABC")
    formData.append("marca", "Toyota")
    formData.append("modelo", "Corolla")
    formData.append("asignadoa", "42") // ID del empleado
    formData.append("fecha_asignacion", "2023-01-01")
    formData.append("observaciones_asignacion", "Asignación de prueba")
    formData.append("alquiler", "off") // No es alquiler

    const result = await editarCoche("1234ABC", formData)

    expect(result.success).toBe(true)

    // Verificar que se pasaron los datos correctos a la actualización
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        matricula: "1234ABC",
        marca: "Toyota",
        modelo: "Corolla",
        asignadoa: "42", // Verificar que asignadoa recibe el ID del empleado
        fecha_asignacion: "2023-01-01",
        observaciones_asignacion: "Asignación de prueba",
      }),
    )
  })

  it("limpia los campos de empleado cuando es alquiler", async () => {
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 1, matricula: "1234ABC", marca: "Toyota", modelo: "Corolla" }],
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === "coches") {
        return {
          update: mockUpdate,
        } as any
      }
      return {} as any
    })

    const formData = new FormData()
    formData.append("matricula", "1234ABC")
    formData.append("marca", "Toyota")
    formData.append("modelo", "Corolla")
    formData.append("asignadoa", "42") // ID del empleado que debería ser ignorado
    formData.append("alquiler", "on") // Es alquiler

    const result = await editarCoche("1234ABC", formData)

    expect(result.success).toBe(true)

    // Verificar que se limpiaron los campos de empleado
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        matricula: "1234ABC",
        marca: "Toyota",
        modelo: "Corolla",
        asignadoa: null, // Debe ser null cuando es alquiler
        fecha_asignacion: null,
        observaciones_asignacion: null,
      }),
    )
  })

  it("retorna error cuando faltan campos obligatorios", async () => {
    const formData = new FormData()
    formData.append("matricula", "")
    formData.append("marca", "Toyota")
    formData.append("modelo", "")

    const result = await editarCoche("1234ABC", formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Los campos matrícula, marca y modelo son obligatorios")
  })

  it("maneja errores de Supabase", async () => {
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
})

describe("obtenerCoche function", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("obtiene un coche por matrícula", async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        data: [{ id: 1, matricula: "1234ABC", marca: "Toyota", modelo: "Corolla" }],
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    const coche = await obtenerCoche("1234ABC")

    expect(coche).toBeDefined()
    expect(coche.matricula).toBe("1234ABC")
    expect(mockSupabase.from).toHaveBeenCalledWith("coches")
  })

  it("retorna null cuando no se encuentra el coche", async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        data: [],
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    const coche = await obtenerCoche("NOEXISTE")

    expect(coche).toBeNull()
  })

  it("maneja errores de Supabase", async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        data: null,
        error: { message: "Database error" },
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    const coche = await obtenerCoche("1234ABC")

    expect(coche).toBeNull()
  })
})
