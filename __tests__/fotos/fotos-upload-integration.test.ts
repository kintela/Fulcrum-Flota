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

// Mock image utils
jest.mock("@/lib/image-utils", () => ({
  resizeImage: jest.fn(),
  formatFileSize: jest.fn((size) => `${(size / 1024 / 1024).toFixed(2)} MB`),
}))

const mockStorage = supabase.storage.from as jest.MockedFunction<typeof supabase.storage.from>

describe("Fotos Upload Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mocks
    mockStorage.mockReturnValue({
      upload: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn(),
    } as any)
  })

  describe("subirFoto", () => {
    it("sube una foto correctamente", async () => {
      const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" })
      Object.defineProperty(mockFile, "size", { value: 1024 * 100 }) // 100KB

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: "1234ABC/123456.jpg" },
        error: null,
      })

      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: "https://example.com/1234ABC/123456.jpg" },
      })

      mockStorage.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any)

      const result = await subirFoto("1234ABC", mockFile)

      expect(result.success).toBe(true)
      expect(result.url).toBe("https://example.com/1234ABC/123456.jpg")
      expect(mockUpload).toHaveBeenCalledWith(expect.stringMatching(/^1234ABC\/\d+\.jpg$/), mockFile, {
        cacheControl: "3600",
        upsert: false,
      })
    })

    it("maneja errores de subida", async () => {
      const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" })
      Object.defineProperty(mockFile, "size", { value: 1024 * 100 })

      const mockUpload = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Bucket not found", statusCode: 404 },
      })

      mockStorage.mockReturnValue({
        upload: mockUpload,
      } as any)

      const result = await subirFoto("1234ABC", mockFile)

      expect(result.success).toBe(false)
      expect(result.error).toContain("El bucket 'coches-fotos' no se encuentra")
    })

    it("comprime archivos grandes automáticamente", async () => {
      const { resizeImage } = require("@/lib/image-utils")

      const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" })
      Object.defineProperty(mockFile, "size", { value: 1024 * 1024 * 2 }) // 2MB

      const compressedFile = new File(["compressed"], "test.jpg", { type: "image/jpeg" })
      Object.defineProperty(compressedFile, "size", { value: 1024 * 500 }) // 500KB

      resizeImage.mockResolvedValue({
        success: true,
        file: compressedFile,
        originalSize: 1024 * 1024 * 2,
        compressedSize: 1024 * 500,
        compressionRatio: 75,
      })

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: "1234ABC/123456.jpg" },
        error: null,
      })

      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: "https://example.com/1234ABC/123456.jpg" },
      })

      mockStorage.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any)

      const result = await subirFoto("1234ABC", mockFile)

      expect(result.success).toBe(true)
      expect(result.compressionInfo).toContain("Optimizada")
      expect(mockUpload).toHaveBeenCalledWith(expect.any(String), compressedFile, expect.any(Object))
    })
  })

  describe("obtenerFotosCoche", () => {
    it("obtiene fotos correctamente", async () => {
      const mockList = jest.fn().mockResolvedValue({
        data: [
          { name: "123456.jpg", created_at: "2024-01-01" },
          { name: "789012.jpg", created_at: "2024-01-02" },
        ],
        error: null,
      })

      const mockGetPublicUrl = jest
        .fn()
        .mockReturnValueOnce({
          data: { publicUrl: "https://example.com/1234ABC/123456.jpg" },
        })
        .mockReturnValueOnce({
          data: { publicUrl: "https://example.com/1234ABC/789012.jpg" },
        })

      mockStorage.mockReturnValue({
        list: mockList,
        getPublicUrl: mockGetPublicUrl,
      } as any)

      const result = await obtenerFotosCoche("1234ABC")

      expect(result.success).toBe(true)
      expect(result.fotos).toHaveLength(2)
      expect(result.fotos).toContain("https://example.com/1234ABC/123456.jpg")
      expect(result.fotos).toContain("https://example.com/1234ABC/789012.jpg")
    })

    it("maneja el caso sin fotos", async () => {
      const mockList = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      mockStorage.mockReturnValue({
        list: mockList,
      } as any)

      const result = await obtenerFotosCoche("1234ABC")

      expect(result.success).toBe(true)
      expect(result.fotos).toHaveLength(0)
    })

    it("filtra archivos placeholder", async () => {
      const mockList = jest.fn().mockResolvedValue({
        data: [
          { name: "123456.jpg", created_at: "2024-01-01" },
          { name: ".emptyFolderPlaceholder", created_at: "2024-01-01" },
          { name: "789012.jpg", created_at: "2024-01-02" },
        ],
        error: null,
      })

      const mockGetPublicUrl = jest
        .fn()
        .mockReturnValueOnce({
          data: { publicUrl: "https://example.com/1234ABC/123456.jpg" },
        })
        .mockReturnValueOnce({
          data: { publicUrl: "https://example.com/1234ABC/789012.jpg" },
        })

      mockStorage.mockReturnValue({
        list: mockList,
        getPublicUrl: mockGetPublicUrl,
      } as any)

      const result = await obtenerFotosCoche("1234ABC")

      expect(result.success).toBe(true)
      expect(result.fotos).toHaveLength(2)
      expect(mockGetPublicUrl).toHaveBeenCalledTimes(2)
    })
  })

  describe("eliminarFoto", () => {
    it("elimina una foto correctamente", async () => {
      const mockRemove = jest.fn().mockResolvedValue({
        error: null,
      })

      mockStorage.mockReturnValue({
        remove: mockRemove,
      } as any)

      const result = await eliminarFoto("1234ABC", "123456.jpg")

      expect(result.success).toBe(true)
      expect(mockRemove).toHaveBeenCalledWith(["1234ABC/123456.jpg"])
    })

    it("maneja errores de eliminación", async () => {
      const mockRemove = jest.fn().mockResolvedValue({
        error: { message: "File not found" },
      })

      mockStorage.mockReturnValue({
        remove: mockRemove,
      } as any)

      const result = await eliminarFoto("1234ABC", "123456.jpg")

      expect(result.success).toBe(false)
      expect(result.error).toContain("File not found")
    })
  })

  describe("validarArchivoImagen", () => {
    it("valida archivos JPEG correctamente", () => {
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" })
      Object.defineProperty(file, "size", { value: 1024 * 1024 }) // 1MB

      const result = validarArchivoImagen(file)

      expect(result.valido).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it("valida archivos PNG correctamente", () => {
      const file = new File(["test"], "test.png", { type: "image/png" })
      Object.defineProperty(file, "size", { value: 1024 * 1024 }) // 1MB

      const result = validarArchivoImagen(file)

      expect(result.valido).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it("valida archivos WebP correctamente", () => {
      const file = new File(["test"], "test.webp", { type: "image/webp" })
      Object.defineProperty(file, "size", { value: 1024 * 1024 }) // 1MB

      const result = validarArchivoImagen(file)

      expect(result.valido).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it("rechaza tipos de archivo no válidos", () => {
      const file = new File(["test"], "test.pdf", { type: "application/pdf" })
      Object.defineProperty(file, "size", { value: 1024 * 1024 })

      const result = validarArchivoImagen(file)

      expect(result.valido).toBe(false)
      expect(result.error).toContain("Solo se permiten archivos de imagen")
    })

    it("rechaza archivos demasiado grandes", () => {
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" })
      Object.defineProperty(file, "size", { value: 25 * 1024 * 1024 }) // 25MB

      const result = validarArchivoImagen(file)

      expect(result.valido).toBe(false)
      expect(result.error).toContain("no puede superar los 20MB")
    })

    it("proporciona información sobre compresión para archivos grandes", () => {
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" })
      Object.defineProperty(file, "size", { value: 3 * 1024 * 1024 }) // 3MB

      const result = validarArchivoImagen(file)

      expect(result.valido).toBe(true)
      expect(result.info).toContain("Se optimizará automáticamente")
    })
  })
})
