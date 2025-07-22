import { registrarUsuarioAutomatico } from "@/lib/auto-register"
import { supabase } from "@/lib/supabase"

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe("Auto Register User", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("registra un usuario nuevo exitosamente", async () => {
    // Mock para verificar que el usuario no existe
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" }, // No rows found
        }),
      }),
    })

    // Mock para insertar nuevo usuario
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1,
            nombre: "Juan",
            apellidos: "Pérez",
            email: "juan.perez@empresa.com",
            role: "usuario",
            movil: null,
            contraseña: null,
          },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    } as any)

    const result = await registrarUsuarioAutomatico(
      "juan.perez@empresa.com",
      "Juan",
      "Pérez"
    )

    expect(result.success).toBe(true)
    expect(result.wasCreated).toBe(true)
    expect(result.user).toMatchObject({
      nombre: "Juan",
      apellidos: "Pérez",
      email: "juan.perez@empresa.com",
      role: "usuario",
    })
  })

  it("no registra si el usuario ya existe", async () => {
    // Mock para verificar que el usuario ya existe
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1,
            email: "juan.perez@empresa.com",
          },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    const result = await registrarUsuarioAutomatico(
      "juan.perez@empresa.com",
      "Juan",
      "Pérez"
    )

    expect(result.success).toBe(true)
    expect(result.wasCreated).toBe(false)
    expect(result.user).toMatchObject({
      id: 1,
      email: "juan.perez@empresa.com",
    })
  })

  it("separa nombre completo automáticamente", async () => {
    // Mock para verificar que el usuario no existe
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      }),
    })

    // Mock para insertar nuevo usuario
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1,
            nombre: "María",
            apellidos: "García López",
            email: "maria.garcia@empresa.com",
            role: "usuario",
            movil: null,
            contraseña: null,
          },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    } as any)

    // Pasar nombre completo sin apellidos separados
    const result = await registrarUsuarioAutomatico(
      "maria.garcia@empresa.com",
      "María García López"
    )

    expect(result.success).toBe(true)
    expect(result.user).toMatchObject({
      nombre: "María",
      apellidos: "García López",
    })
  })

  it("maneja errores de base de datos", async () => {
    // Mock para error en verificación
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection error" },
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    } as any)

    const result = await registrarUsuarioAutomatico(
      "test@empresa.com",
      "Test",
      "User"
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe("Database connection error")
  })

  it("asigna rol usuario por defecto", async () => {
    // Mock para verificar que el usuario no existe
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      }),
    })

    // Mock para insertar nuevo usuario
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 1,
            nombre: "Carlos",
            apellidos: "Mendoza",
            email: "carlos.mendoza@empresa.com",
            role: "usuario",
            movil: null,
            contraseña: null,
          },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    } as any)

    const result = await registrarUsuarioAutomatico(
      "carlos.mendoza@empresa.com",
      "Carlos",
      "Mendoza"
    )

    expect(result.success).toBe(true)
    expect(result.user.role).toBe("usuario")
  })
})
