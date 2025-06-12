import { crearTarjetaSolred } from "@/app/actions/solred"
import { supabase } from "@/lib/supabase"
import jest from "jest"

// Mock de Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(),
      })),
    })),
  },
}))

describe("crearTarjetaSolred", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("debe crear una nueva tarjeta SOLRED correctamente", async () => {
    // Mock para verificar que no existe la tarjeta
    const mockSelect = supabase.from("tarjetassolred").select("numero_tarjeta").eq("12345678901234567")
      .single as jest.Mock
    mockSelect.mockResolvedValue({
      data: null,
      error: { code: "PGRST116" }, // No rows found
    })

    // Mock para la inserción
    const mockInsert = supabase.from("tarjetassolred").insert([]).select as jest.Mock
    mockInsert.mockResolvedValue({
      data: [
        {
          numero_tarjeta: "12345678901234567",
          pin: "1234",
          fechavencimiento: "2025-12-31",
          activa: true,
        },
      ],
      error: null,
    })

    const resultado = await crearTarjetaSolred("12345678901234567", "1234", "2025-12-31")

    expect(resultado.success).toBe(true)
    expect(resultado.data).toEqual({
      numero_tarjeta: "12345678901234567",
      pin: "1234",
      fechavencimiento: "2025-12-31",
      activa: true,
    })
  })

  it("debe fallar si el número de tarjeta no tiene 17 dígitos", async () => {
    const resultado = await crearTarjetaSolred("123456789", "1234", "2025-12-31")

    expect(resultado.success).toBe(false)
    expect(resultado.error).toBe("El número de tarjeta debe tener exactamente 17 dígitos")
  })

  it("debe fallar si el PIN no tiene 4 dígitos", async () => {
    const resultado = await crearTarjetaSolred("12345678901234567", "12", "2025-12-31")

    expect(resultado.success).toBe(false)
    expect(resultado.error).toBe("El PIN debe tener exactamente 4 dígitos")
  })

  it("debe fallar si el número de tarjeta contiene caracteres no numéricos", async () => {
    const resultado = await crearTarjetaSolred("1234567890123456A", "1234", "2025-12-31")

    expect(resultado.success).toBe(false)
    expect(resultado.error).toBe("El número de tarjeta debe tener exactamente 17 dígitos")
  })

  it("debe fallar si el PIN contiene caracteres no numéricos", async () => {
    const resultado = await crearTarjetaSolred("12345678901234567", "12AB", "2025-12-31")

    expect(resultado.success).toBe(false)
    expect(resultado.error).toBe("El PIN debe tener exactamente 4 dígitos")
  })

  it("debe fallar si ya existe una tarjeta con el mismo número", async () => {
    // Mock para verificar que existe la tarjeta
    const mockSelect = supabase.from("tarjetassolred").select("numero_tarjeta").eq("12345678901234567")
      .single as jest.Mock
    mockSelect.mockResolvedValue({
      data: { numero_tarjeta: "12345678901234567" },
      error: null,
    })

    const resultado = await crearTarjetaSolred("12345678901234567", "1234", "2025-12-31")

    expect(resultado.success).toBe(false)
    expect(resultado.error).toBe("Ya existe una tarjeta con el número 12345678901234567")
  })

  it("debe fallar si no se proporciona fecha de vencimiento", async () => {
    const resultado = await crearTarjetaSolred("12345678901234567", "1234", "")

    expect(resultado.success).toBe(false)
    expect(resultado.error).toBe("La fecha de vencimiento es obligatoria")
  })
})
