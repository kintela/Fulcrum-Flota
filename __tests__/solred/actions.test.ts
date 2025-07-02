import {
  obtenerTarjetasSolred,
  asignarTarjetaSolred,
  desasignarTarjetaSolred,
  obtenerTarjetaAsignada,
} from "@/app/actions/solred"
import { supabase } from "@/lib/supabase"
import jest from "jest"

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe("SOLRED Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("obtenerTarjetasSolred", () => {
    it("obtiene tarjetas activas correctamente", async () => {
      const mockTarjetas = [
        { numero_tarjeta: "1234567890", pin: "1234", fechavencimiento: "2025-12-31", activa: true },
        { numero_tarjeta: "0987654321", pin: "5678", fechavencimiento: "2026-06-30", activa: true },
      ]

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockTarjetas,
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await obtenerTarjetasSolred()

      expect(result).toEqual(mockTarjetas)
      expect(mockSupabase.from).toHaveBeenCalledWith("tarjetassolred")
      expect(mockSelect).toHaveBeenCalledWith("*")
    })

    it("maneja errores de base de datos", async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await obtenerTarjetasSolred()

      expect(result).toEqual([])
    })
  })

  describe("asignarTarjetaSolred", () => {
    it("asigna tarjeta correctamente", async () => {
      const mockTarjeta = { numero_tarjeta: "1234567890", pin: "1234", fechavencimiento: "2025-12-31", activa: true }
      const mockAsignacion = { id: 1, numero_tarjeta: "1234567890", matricula: "1234ABC", activa: true }

      // Mock para verificar tarjeta existe
      const mockSelectTarjeta = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTarjeta,
              error: null,
            }),
          }),
        }),
      })

      // Mock para desactivar asignación anterior
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      // Mock para insertar nueva asignación
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [mockAsignacion],
          error: null,
        }),
      })

      mockSupabase.from.mockImplementation((table) => {
        if (table === "tarjetassolred") {
          return { select: mockSelectTarjeta } as any
        }
        if (table === "solred_coches") {
          return {
            update: mockUpdate,
            insert: mockInsert,
          } as any
        }
        return {} as any
      })

      const result = await asignarTarjetaSolred("1234ABC", "1234567890")

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockAsignacion)
    })

    it("falla cuando la tarjeta no existe", async () => {
      const mockSelectTarjeta = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" },
            }),
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelectTarjeta,
      } as any)

      const result = await asignarTarjetaSolred("1234ABC", "9999999999")

      expect(result.success).toBe(false)
      expect(result.error).toBe("La tarjeta SOLRED no existe o no está activa")
    })
  })

  describe("desasignarTarjetaSolred", () => {
    it("desasigna tarjeta correctamente", async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{ id: 1, activa: false }],
              error: null,
            }),
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      } as any)

      const result = await desasignarTarjetaSolred("1234ABC")

      expect(result.success).toBe(true)
    })
  })

  describe("obtenerTarjetaAsignada", () => {
    it("obtiene tarjeta asignada correctamente", async () => {
      const mockAsignacion = {
        id: 1,
        numero_tarjeta: "1234567890",
        matricula: "1234ABC",
        activa: true,
        tarjetassolred: {
          numero_tarjeta: "1234567890",
          pin: "1234",
          fechavencimiento: "2025-12-31",
        },
      }

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAsignacion,
              error: null,
            }),
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await obtenerTarjetaAsignada("1234ABC")

      expect(result).toEqual(mockAsignacion)
    })

    it("retorna null cuando no hay tarjeta asignada", async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" },
            }),
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await obtenerTarjetaAsignada("1234ABC")

      expect(result).toBeNull()
    })
  })
})
