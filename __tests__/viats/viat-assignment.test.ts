import { crearTarjetaViat, asignarTarjetaViat, obtenerTarjetaViatAsignada } from "@/app/actions/viats"
import { supabase } from "@/lib/supabase"
import jest from "jest"

// Mock de supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
        order: jest.fn(() => ({
          single: jest.fn(),
        })),
        single: jest.fn(),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(),
        })),
      })),
    })),
  },
}))

// Mock de revalidatePath
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

describe("ViaT Assignment Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("crearTarjetaViat", () => {
    it("should create a ViaT card successfully", async () => {
      const mockTarjeta = {
        id: 1234567890123456,
        fechacaducidad: "2025-12-31",
        activo: true,
      }

      // Mock para verificar que no existe
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
          })),
        })),
      }))

      // Mock para insertar
      const mockInsert = jest.fn(() => ({
        select: jest.fn().mockResolvedValue({ data: [mockTarjeta], error: null }),
      }))
      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ single: jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }) })),
          })),
        })
        .mockReturnValueOnce({ insert: mockInsert })

      const result = await crearTarjetaViat("1234567890123456", "2025-12-31")

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTarjeta)
      expect(mockInsert).toHaveBeenCalledWith([
        {
          id: 1234567890123456,
          fechacaducidad: "2025-12-31",
          activo: true,
        },
      ])
    })

    it("should fail with invalid card number", async () => {
      const result = await crearTarjetaViat("123", "2025-12-31")

      expect(result.success).toBe(false)
      expect(result.error).toBe("El número de tarjeta debe tener exactamente 16 dígitos")
    })

    it("should fail with empty card number", async () => {
      const result = await crearTarjetaViat("", "2025-12-31")

      expect(result.success).toBe(false)
      expect(result.error).toBe("El número de tarjeta es obligatorio")
    })

    it("should fail with invalid expiration date", async () => {
      const result = await crearTarjetaViat("1234567890123456", "")

      expect(result.success).toBe(false)
      expect(result.error).toBe("La fecha de caducidad es obligatoria")
    })
  })

  describe("asignarTarjetaViat", () => {
    it("should assign ViaT card to employee successfully", async () => {
      const mockViat = { id: 1234567890123456, activo: true }
      const mockEmpleado = { id: 1 }
      const mockAsignacion = {
        viat_id: 1234567890123456,
        empleado_id: 1,
        fecha_asignacion: expect.any(String),
        observaciones: "Test assignment",
      }

      // Mock para verificar ViaT existe
      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: mockViat, error: null }),
              })),
            })),
          })),
        })
        // Mock para verificar empleado existe
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: mockEmpleado, error: null }),
            })),
          })),
        })
        // Mock para verificar asignación no existe
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })
        // Mock para eliminar asignaciones previas
        .mockReturnValueOnce({
          delete: jest.fn(() => ({
            eq: jest.fn(),
          })),
        })
        // Mock para insertar nueva asignación
        .mockReturnValueOnce({
          insert: jest.fn(() => ({
            select: jest.fn().mockResolvedValue({ data: [mockAsignacion], error: null }),
          })),
        })

      const result = await asignarTarjetaViat(1, 1234567890123456, "Test assignment")

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockAsignacion)
    })

    it("should fail when ViaT card does not exist", async () => {
      ;(supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
            })),
          })),
        })),
      })

      const result = await asignarTarjetaViat(1, 1234567890123456)

      expect(result.success).toBe(false)
      expect(result.error).toBe("La tarjeta ViaT no existe o no está activa")
    })

    it("should fail when employee does not exist", async () => {
      const mockViat = { id: 1234567890123456, activo: true }
      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: mockViat, error: null }),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
            })),
          })),
        })

      const result = await asignarTarjetaViat(999, 1234567890123456)

      expect(result.success).toBe(false)
      expect(result.error).toBe("El empleado no existe")
    })

    it("should fail when ViaT card is already assigned", async () => {
      const mockViat = { id: 1234567890123456, activo: true }
      const mockEmpleado = { id: 1 }
      const mockAsignacionExistente = [{ viat_id: 1234567890123456, empleado_id: 2 }]
      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: mockViat, error: null }),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: mockEmpleado, error: null }),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: mockAsignacionExistente, error: null }),
          })),
        })

      const result = await asignarTarjetaViat(1, 1234567890123456)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Esta tarjeta ViaT ya está asignada a otro empleado")
    })
  })

  describe("obtenerTarjetaViatAsignada", () => {
    it("should get assigned ViaT card for employee", async () => {
      const mockAsignacion = {
        viat_id: 1234567890123456,
        empleado_id: 1,
        viats: { id: 1234567890123456, fechacaducidad: "2025-12-31" },
      }
      ;(supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: mockAsignacion, error: null }),
          })),
        })),
      })

      const result = await obtenerTarjetaViatAsignada(1)

      expect(result).toEqual(mockAsignacion)
    })

    it("should return null when no ViaT card is assigned", async () => {
      ;(supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
          })),
        })),
      })

      const result = await obtenerTarjetaViatAsignada(1)

      expect(result).toBeNull()
    })
  })
})
