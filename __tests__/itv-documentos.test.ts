/* eslint-disable @typescript-eslint/no-require-imports */
import { beforeEach, describe, expect, it, jest } from "@jest/globals"

jest.mock("@/lib/supabase", () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}))

const {
  eliminarDocumentoITV,
  obtenerRutaDocumentosITV,
  subirDocumentoITV,
  subirDocumentosITV,
  validarDocumentoITV,
} = require("@/lib/itv-documentos")
const { supabase } = require("@/lib/supabase")
const mockFrom = supabase.storage.from as jest.MockedFunction<any>

describe("documentos de ITV", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("construye la ruta dentro de ITVs por matrícula e id", () => {
    expect(obtenerRutaDocumentosITV("1234 ABC", 42)).toBe("ITVs/1234_ABC/42")
  })

  it("acepta PDF, Word e imágenes y rechaza otros tipos", () => {
    expect(validarDocumentoITV(new File(["pdf"], "itv.pdf", { type: "application/pdf" })).valido).toBe(true)
    expect(validarDocumentoITV(new File(["doc"], "itv.doc", { type: "application/msword" })).valido).toBe(true)
    expect(validarDocumentoITV(new File(["docx"], "itv.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })).valido).toBe(true)
    expect(validarDocumentoITV(new File(["img"], "itv.png", { type: "image/png" })).valido).toBe(true)
    expect(validarDocumentoITV(new File(["zip"], "itv.zip", { type: "application/zip" })).valido).toBe(false)
  })

  it("sube el archivo al bucket privado y a la carpeta de su revisión", async () => {
    const uploadToSignedUrl = jest.fn(async (
      _ruta: string,
      _token: string,
      _archivo: File,
      _opciones: { cacheControl: string; contentType: string },
    ) => ({ data: {}, error: null }))
    mockFrom.mockReturnValue({ uploadToSignedUrl })
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ ruta: "ITVs/1234ABC/7/123-informe.pdf", token: "token-firmado" }),
    })) as unknown as typeof fetch
    const archivo = new File(["pdf"], "Informe ITV.pdf", { type: "application/pdf" })

    const resultado = await subirDocumentoITV("1234ABC", 7, archivo)

    expect(resultado.success).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith("coches-documentacion")
    expect(global.fetch).toHaveBeenCalledWith("/api/itv-documentos", expect.objectContaining({ method: "POST" }))
    expect(uploadToSignedUrl).toHaveBeenCalledWith(
      "ITVs/1234ABC/7/123-informe.pdf",
      "token-firmado",
      archivo,
      { cacheControl: "3600", contentType: "application/pdf" },
    )
  })

  it("sube varios archivos asociados a la misma revisión", async () => {
    const uploadToSignedUrl = jest.fn(async () => ({ data: {}, error: null }))
    mockFrom.mockReturnValue({ uploadToSignedUrl })
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ ruta: "ITVs/1234ABC/7/documento.pdf", token: "token-firmado" }),
    })) as unknown as typeof fetch
    const archivos = [
      new File(["informe"], "informe.pdf", { type: "application/pdf" }),
      new File(["foto"], "foto.png", { type: "image/png" }),
    ]

    const resultado = await subirDocumentosITV("1234ABC", 7, archivos)

    expect(resultado).toEqual({ success: true, subidos: 2, errores: [] })
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(uploadToSignedUrl).toHaveBeenCalledTimes(2)
  })

  it("impide eliminar una ruta que no pertenezca a la revisión", async () => {
    const resultado = await eliminarDocumentoITV("1234ABC", 7, "ITVs/OTRO/9/informe.pdf")
    expect(resultado.success).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
