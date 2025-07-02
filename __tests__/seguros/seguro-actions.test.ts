import { crearSeguro, actualizarSeguro, eliminarSeguro, obtenerHistorialSeguros } from "@/app/actions/seguros"
import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import jest from "jest"

// Mock de supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  },
}))

// Mock de next/cache
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

describe("Acciones de Seguros", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("obtenerHistorialSeguros", () => {
    it("devuelve los seguros correctamente", async () => {
      const mockData = [
        {
          id: 1,
          matricula: "1234ABC",
          numero_poliza: "POL-12345",
          compania: "Mapfre",
        },
      ]
      ;(supabase.from as jest.Mock).mockReturnThis()
      ;(supabase.select as jest.Mock).mockReturnThis()
      ;(supabase.eq as jest.Mock).mockReturnThis()
      ;(supabase.order as jest.Mock).mockResolvedValue({
        data: mockData,
        error: null,
      })

      const result = await obtenerHistorialSeguros("1234ABC")

      expect(supabase.from).toHaveBeenCalledWith("seguros")
      expect(supabase.select).toHaveBeenCalledWith("*")
      expect(supabase.eq).toHaveBeenCalledWith("matricula", "1234ABC")
      expect(supabase.order).toHaveBeenCalledWith("fecha_contratacion", { ascending: false })
      expect(result).toEqual({
        success: true,
        data: mockData,
      })
    })

    it("maneja errores correctamente", async () => {
      ;(supabase.from as jest.Mock).mockReturnThis()
      ;(supabase.select as jest.Mock).mockReturnThis()
      ;(supabase.eq as jest.Mock).mockReturnThis()
      ;(supabase.order as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: "Error de base de datos" },
      })

      const result = await obtenerHistorialSeguros("1234ABC")

      expect(result).toEqual({
        success: false,
        error: "Error al obtener el historial de seguros: Error de base de datos",
      })
    })
  })

  describe("crearSeguro", () => {
    it("crea un seguro correctamente", async () => {
      const mockFormData = new FormData()
      mockFormData.append("matricula", "1234ABC")
      mockFormData.append("numero_poliza", "POL-12345")
      mockFormData.append("fecha_contratacion", "2023-01-01")
      mockFormData.append("fecha_vencimiento", "2024-01-01")
      mockFormData.append("compania", "Mapfre")
      mockFormData.append("tipo", "Todo Riesgo")
      mockFormData.append("importe_anual", "500")
      mockFormData.append("telefono_asistencia", "900123456")
      mockFormData.append("telefono_asistencia2", "900654321")
      mockFormData.append("observaciones", "Observaciones de prueba")
      mockFormData.append("activo", "on")

      const mockData = {
        id: 1,
        matricula: "1234ABC",
        numero_poliza: "POL-12345",
      }
      ;(supabase.from as jest.Mock).mockReturnThis()
      ;(supabase.insert as jest.Mock).mockReturnThis()
      ;(supabase.select as jest.Mock).mockResolvedValue({
        data: [mockData],
        error: null,
      })

      const result = await crearSeguro(mockFormData)

      expect(supabase.from).toHaveBeenCalledWith("seguros")
      expect(supabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          matricula: "1234ABC",
          numero_poliza: "POL-12345",
          fecha_contratacion: "2023-01-01",
          fecha_vencimiento: "2024-01-01",
          compania: "Mapfre",
          tipo: "Todo Riesgo",
          importe_anual: 500,
          telefono_asistencia1: "900123456",
          telefono_asistencia2: "900654321",
          observaciones: "Observaciones de prueba",
          activo: true,
        }),
      ])
      expect(revalidatePath).toHaveBeenCalledWith("/coches/detalle/1234ABC")
      expect(revalidatePath).toHaveBeenCalledWith("/coches/editar/1234ABC")
      expect(result).toEqual({
        success: true,
        data: mockData,
      })
    })

    it("valida campos obligatorios", async () => {
      const mockFormData = new FormData()
      mockFormData.append("matricula", "1234ABC")
      // Falta número de póliza, fecha de contratación, etc.

      const result = await crearSeguro(mockFormData)

      expect(result).toEqual({
        success: false,
        error: "Los campos número de póliza, fecha de contratación, fecha de vencimiento y compañía son obligatorios",
      })
      expect(supabase.insert).not.toHaveBeenCalled()
    })

    it("maneja errores de base de datos", async () => {
      const mockFormData = new FormData()
      mockFormData.append("matricula", "1234ABC")
      mockFormData.append("numero_poliza", "POL-12345")
      mockFormData.append("fecha_contratacion", "2023-01-01")
      mockFormData.append("fecha_vencimiento", "2024-01-01")
      mockFormData.append("compania", "Mapfre")
      ;(supabase.from as jest.Mock).mockReturnThis()
      ;(supabase.insert as jest.Mock).mockReturnThis()
      ;(supabase.select as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: "Error de base de datos" },
      })

      const result = await crearSeguro(mockFormData)

      expect(result).toEqual({
        success: false,
        error: "Error al crear el seguro: Error de base de datos",
      })
    })
  })

  describe("actualizarSeguro", () => {
    it("actualiza un seguro correctamente", async () => {
      const mockFormData = new FormData()
      mockFormData.append("matricula", "1234ABC")
      mockFormData.append("numero_poliza", "POL-12345")
      mockFormData.append("fecha_contratacion", "2023-01-01")
      mockFormData.append("fecha_vencimiento", "2024-01-01")
      mockFormData.append("compania", "Mapfre Actualizada")
      mockFormData.append("tipo", "Todo Riesgo")
      mockFormData.append("activo", "on")

      const mockData = {
        id: 1,
        matricula: "1234ABC",
        numero_poliza: "POL-12345",
        compania: "Mapfre Actualizada",
      }
      ;(supabase.from as jest.Mock).mockReturnThis()
      ;(supabase.update as jest.Mock).mockReturnThis()
      ;(supabase.eq as jest.Mock).mockReturnThis()
      ;(supabase.select as jest.Mock).mockResolvedValue({
        data: [mockData],
        error: null,
      })

      const result = await actualizarSeguro(1, mockFormData)

      expect(supabase.from).toHaveBeenCalledWith("seguros")
      expect(supabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          numero_poliza: "POL-12345",
          fecha_contratacion: "2023-01-01",
          fecha_vencimiento: "2024-01-01",
          compania: "Mapfre Actualizada",
          tipo: "Todo Riesgo",
          activo: true,
        }),
      )
      expect(supabase.eq).toHaveBeenCalledWith("id", 1)
      expect(revalidatePath).toHaveBeenCalledWith("/coches/detalle/1234ABC")
      expect(revalidatePath).toHaveBeenCalledWith("/coches/editar/1234ABC")
      expect(result).toEqual({
        success: true,
        data: mockData,
      })
    })

    it("valida campos obligatorios", async () => {
      const mockFormData = new FormData()
      mockFormData.append("matricula", "1234ABC")
      // Falta número de póliza, fecha de contratación, etc.

      const result = await actualizarSeguro(1, mockFormData)

      expect(result).toEqual({
        success: false,
        error: "Los campos número de póliza, fecha de contratación, fecha de vencimiento y compañía son obligatorios",
      })
      expect(supabase.update).not.toHaveBeenCalled()
    })
  })

  describe("eliminarSeguro", () => {
    it("elimina un seguro correctamente", async () => {
      ;(supabase.from as jest.Mock).mockReturnThis()
      ;(supabase.delete as jest.Mock).mockReturnThis()
      ;(supabase.eq as jest.Mock).mockResolvedValue({
        error: null,
      })

      const result = await eliminarSeguro(1, "1234ABC")

      expect(supabase.from).toHaveBeenCalledWith("seguros")
      expect(supabase.delete).toHaveBeenCalled()
      expect(supabase.eq).toHaveBeenCalledWith("id", 1)
      expect(revalidatePath).toHaveBeenCalledWith("/coches/detalle/1234ABC")
      expect(revalidatePath).toHaveBeenCalledWith("/coches/editar/1234ABC")
      expect(result).toEqual({
        success: true,
      })
    })

    it("maneja errores correctamente", async () => {
      ;(supabase.from as jest.Mock).mockReturnThis()
      ;(supabase.delete as jest.Mock).mockReturnThis()
      ;(supabase.eq as jest.Mock).mockResolvedValue({
        error: { message: "Error al eliminar" },
      })

      const result = await eliminarSeguro(1, "1234ABC")

      expect(result).toEqual({
        success: false,
        error: "Error al eliminar el seguro: Error al eliminar",
      })
    })
  })
})
