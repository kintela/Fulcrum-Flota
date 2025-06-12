import { subirFoto, obtenerFotosCoche, eliminarFoto, validarArchivoImagen } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import jest from "jest" // Declare the jest variable

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        list: jest.fn(),
        remove: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  },
}))

const mockStorage = supabase.storage.from as jest.Mock

describe("Storage Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("validarArchivoImagen", () => {
    it("acepta archivos de imagen válidos", () => {
      const archivo = new File([""], "test.jpg", { type: "image/jpeg" })
      Object.defineProperty(archivo, "size", { value: 1024 * 1024 }) // 1MB

      const resultado = validarArchivoImagen(archivo)
      expect(resultado.valido).toBe(true)
      expect(resultado.error).toBeUndefined()
    })

    it("rechaza archivos que no son imágenes", () => {
      const archivo = new File([""], "test.pdf", { type: "application/pdf" })

      const resultado = validarArchivoImagen(archivo)
      expect(resultado.valido).toBe(false)
      expect(resultado.error).toBe("Solo se permiten archivos de imagen (JPEG, PNG, WebP)")
    })

    it("rechaza archivos demasiado grandes", () => {
      const archivo = new File([""], "test.jpg", { type: "image/jpeg" })
      Object.defineProperty(archivo, "size", { value: 6 * 1024 * 1024 }) // 6MB

      const resultado = validarArchivoImagen(archivo)
      expect(resultado.valido).toBe(false)
      expect(resultado.error).toBe("El archivo no puede superar los 5MB")
    })

    it("acepta diferentes formatos de imagen", () => {
      const formatos = [
        { type: "image/jpeg", valido: true },
        { type: "image/jpg", valido: true },
        { type: "image/png", valido: true },
        { type: "image/webp", valido: true },
        { type: "image/gif", valido: false },
      ]

      formatos.forEach(({ type, valido }) => {
        const archivo = new File([""], `test.${type.split("/")[1]}`, { type })
        Object.defineProperty(archivo, "size", { value: 1024 * 1024 })

        const resultado = validarArchivoImagen(archivo)
        expect(resultado.valido).toBe(valido)
      })
    })
  })

  describe("subirFoto", () => {
    it("sube una foto exitosamente", async () => {
      const archivo = new File([""], "test.jpg", { type: "image/jpeg" })
      const matricula = "1234ABC"

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: `${matricula}/123456789.jpg` },
        error: null,
      })

      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: "https://example.com/foto.jpg" },
      })

      mockStorage.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })

      const resultado = await subirFoto(matricula, archivo)

      expect(resultado.success).toBe(true)
      expect(resultado.url).toBe("https://example.com/foto.jpg")
      expect(mockUpload).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^${matricula}/\\d+\\.jpg$`)), archivo, {
        cacheControl: "3600",
        upsert: false,
      })
    })

    it("maneja errores de subida", async () => {
      const archivo = new File([""], "test.jpg", { type: "image/jpeg" })
      const matricula = "1234ABC"

      const mockUpload = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Error de storage" },
      })

      mockStorage.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: jest.fn(),
      })

      const resultado = await subirFoto(matricula, archivo)

      expect(resultado.success).toBe(false)
      expect(resultado.error).toBe("Error al subir la foto: Error de storage")
    })

    it("genera nombres de archivo únicos", async () => {
      const archivo = new File([""], "test.jpg", { type: "image/jpeg" })
      const matricula = "1234ABC"

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: "test-path" },
        error: null,
      })

      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: "https://example.com/foto.jpg" },
      })

      mockStorage.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })

      // Subir dos fotos y verificar que tienen nombres diferentes
      await subirFoto(matricula, archivo)
      const primerLlamada = mockUpload.mock.calls[0][0]

      await subirFoto(matricula, archivo)
      const segundaLlamada = mockUpload.mock.calls[1][0]

      expect(primerLlamada).not.toBe(segundaLlamada)
      expect(primerLlamada).toMatch(new RegExp(`^${matricula}/\\d+\\.jpg$`))
      expect(segundaLlamada).toMatch(new RegExp(`^${matricula}/\\d+\\.jpg$`))
    })
  })

  describe("obtenerFotosCoche", () => {
    it("obtiene fotos exitosamente", async () => {
      const matricula = "1234ABC"
      const mockList = jest.fn().mockResolvedValue({
        data: [{ name: "123456789.jpg" }, { name: "987654321.png" }],
        error: null,
      })

      const mockGetPublicUrl = jest
        .fn()
        .mockReturnValueOnce({ data: { publicUrl: "https://example.com/foto1.jpg" } })
        .mockReturnValueOnce({ data: { publicUrl: "https://example.com/foto2.png" } })

      mockStorage.mockReturnValue({
        list: mockList,
        getPublicUrl: mockGetPublicUrl,
      })

      const resultado = await obtenerFotosCoche(matricula)

      expect(resultado.success).toBe(true)
      expect(resultado.fotos).toHaveLength(2)
      expect(resultado.fotos).toEqual(["https://example.com/foto1.jpg", "https://example.com/foto2.png"])
      expect(mockList).toHaveBeenCalledWith(matricula, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      })
    })

    it("maneja el caso sin fotos", async () => {
      const matricula = "1234ABC"
      const mockList = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      mockStorage.mockReturnValue({
        list: mockList,
        getPublicUrl: jest.fn(),
      })

      const resultado = await obtenerFotosCoche(matricula)

      expect(resultado.success).toBe(true)
      expect(resultado.fotos).toEqual([])
    })

    it("filtra archivos placeholder", async () => {
      const matricula = "1234ABC"
      const mockList = jest.fn().mockResolvedValue({
        data: [{ name: "123456789.jpg" }, { name: ".emptyFolderPlaceholder" }, { name: "987654321.png" }],
        error: null,
      })

      const mockGetPublicUrl = jest
        .fn()
        .mockReturnValueOnce({ data: { publicUrl: "https://example.com/foto1.jpg" } })
        .mockReturnValueOnce({ data: { publicUrl: "https://example.com/foto2.png" } })

      mockStorage.mockReturnValue({
        list: mockList,
        getPublicUrl: mockGetPublicUrl,
      })

      const resultado = await obtenerFotosCoche(matricula)

      expect(resultado.success).toBe(true)
      expect(resultado.fotos).toHaveLength(2)
      expect(mockGetPublicUrl).toHaveBeenCalledTimes(2)
    })

    it("maneja errores de listado", async () => {
      const matricula = "1234ABC"
      const mockList = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Error de acceso" },
      })

      mockStorage.mockReturnValue({
        list: mockList,
        getPublicUrl: jest.fn(),
      })

      const resultado = await obtenerFotosCoche(matricula)

      expect(resultado.success).toBe(false)
      expect(resultado.error).toBe("Error al obtener las fotos: Error de acceso")
    })
  })

  describe("eliminarFoto", () => {
    it("elimina una foto exitosamente", async () => {
      const matricula = "1234ABC"
      const nombreArchivo = "123456789.jpg"

      const mockRemove = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      mockStorage.mockReturnValue({
        remove: mockRemove,
      })

      const resultado = await eliminarFoto(matricula, nombreArchivo)

      expect(resultado.success).toBe(true)
      expect(mockRemove).toHaveBeenCalledWith([`${matricula}/${nombreArchivo}`])
    })

    it("maneja errores de eliminación", async () => {
      const matricula = "1234ABC"
      const nombreArchivo = "123456789.jpg"

      const mockRemove = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Error al eliminar" },
      })

      mockStorage.mockReturnValue({
        remove: mockRemove,
      })

      const resultado = await eliminarFoto(matricula, nombreArchivo)

      expect(resultado.success).toBe(false)
      expect(resultado.error).toBe("Error al eliminar la foto: Error al eliminar")
    })
  })
})
