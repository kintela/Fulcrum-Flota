import { crearEmpleado } from "@/app/empleados/nuevo/actions"
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

describe("crearEmpleado Server Action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("crea un empleado exitosamente", async () => {
    // Mock para verificar email no duplicado
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" }, // No rows found
        }),
      }),
    })

    // Mock para insertar empleado
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [{ id: 1, nombre: "Juan", apellidos: "Pérez García", email: "juan.perez@empresa.com" }],
        error: null,
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === "empleados") {
        return {
          select: mockSelect,
          insert: mockInsert,
        } as any
      }
      return {} as any
    })

    const formData = new FormData()
    formData.append("nombre", "Juan")
    formData.append("apellidos", "Pérez García")
    formData.append("email", "juan.perez@empresa.com")
    formData.append("movil", "600123456")
    formData.append("contraseña", "123456")

    const result = await crearEmpleado(formData)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(mockSupabase.from).toHaveBeenCalledWith("empleados")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/empleados")
  })

  it("retorna error cuando faltan campos obligatorios", async () => {
    const formData = new FormData()
    formData.append("nombre", "")
    formData.append("apellidos", "Pérez García")
    formData.append("email", "juan.perez@empresa.com")
    formData.append("contraseña", "123456")

    const result = await crearEmpleado(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Los campos nombre, apellidos, email y contraseña son obligatorios")
  })

  it("valida formato de email", async () => {
    const formData = new FormData()
    formData.append("nombre", "Juan")
    formData.append("apellidos", "Pérez García")
    formData.append("email", "email-invalido")
    formData.append("contraseña", "123456")

    const result = await crearEmpleado(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe("El formato del email no es válido")
  })

  it("valida longitud mínima de contraseña", async () => {
    const formData = new FormData()
    formData.append("nombre", "Juan")
    formData.append("apellidos", "Pérez García")
    formData.append("email", "juan.perez@empresa.com")
    formData.append("contraseña", "123")

    const result = await crearEmpleado(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe("La contraseña debe tener al menos 6 caracteres")
  })

  it("detecta email duplicado", async () => {
    // Mock para verificar email duplicado
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 2, email: "juan.perez@empresa.com" },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    const formData = new FormData()
    formData.append("nombre", "Juan")
    formData.append("apellidos", "Pérez García")
    formData.append("email", "juan.perez@empresa.com")
    formData.append("contraseña", "123456")

    const result = await crearEmpleado(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Ya existe un empleado con este email")
  })

  it("maneja errores de Supabase", async () => {
    // Mock para verificar email no duplicado
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      }),
    })

    // Mock para insertar con error
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === "empleados") {
        return {
          select: mockSelect,
          insert: mockInsert,
        } as any
      }
      return {} as any
    })

    const formData = new FormData()
    formData.append("nombre", "Juan")
    formData.append("apellidos", "Pérez García")
    formData.append("email", "juan.perez@empresa.com")
    formData.append("contraseña", "123456")

    const result = await crearEmpleado(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Error al crear el empleado: Database error")
  })

  it("procesa correctamente todos los campos", async () => {
    // Mock para verificar email no duplicado
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      }),
    })

    // Mock para insertar empleado
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [{ id: 1 }],
        error: null,
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === "empleados") {
        return {
          select: mockSelect,
          insert: mockInsert,
        } as any
      }
      return {} as any
    })

    const formData = new FormData()
    formData.append("nombre", "María")
    formData.append("apellidos", "García López")
    formData.append("email", "maria.garcia@empresa.com")
    formData.append("movil", "600123456")
    formData.append("contraseña", "password123")

    await crearEmpleado(formData)

    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        nombre: "María",
        apellidos: "García López",
        email: "maria.garcia@empresa.com",
        movil: "600123456",
        contraseña: "password123",
      }),
    ])
  })

  it("maneja campo móvil vacío correctamente", async () => {
    // Mock para verificar email no duplicado
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      }),
    })

    // Mock para insertar empleado
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [{ id: 1 }],
        error: null,
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === "empleados") {
        return {
          select: mockSelect,
          insert: mockInsert,
        } as any
      }
      return {} as any
    })

    const formData = new FormData()
    formData.append("nombre", "Juan")
    formData.append("apellidos", "Pérez García")
    formData.append("email", "juan.perez@empresa.com")
    formData.append("movil", "")
    formData.append("contraseña", "123456")

    await crearEmpleado(formData)

    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        nombre: "Juan",
        apellidos: "Pérez García",
        email: "juan.perez@empresa.com",
        movil: null,
        contraseña: "123456",
      }),
    ])
  })

  it("valida emails con diferentes formatos válidos", async () => {
    const emailsValidos = ["test@example.com", "user.name@domain.co.uk", "user+tag@example.org", "123@example.com"]

    for (const email of emailsValidos) {
      const formData = new FormData()
      formData.append("nombre", "Juan")
      formData.append("apellidos", "Pérez García")
      formData.append("email", email)
      formData.append("contraseña", "123456")

      // Mock para verificar email no duplicado
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116" },
          }),
        }),
      })

      // Mock para insertar empleado
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 1 }],
          error: null,
        }),
      })

      mockSupabase.from.mockImplementation((table) => {
        if (table === "empleados") {
          return {
            select: mockSelect,
            insert: mockInsert,
          } as any
        }
        return {} as any
      })

      const result = await crearEmpleado(formData)
      expect(result.success).toBe(true)
    }
  })
})
