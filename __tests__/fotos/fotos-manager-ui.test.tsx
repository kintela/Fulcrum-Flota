import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { FotosManager } from "@/components/fotos-manager"
import { obtenerFotosCoche, subirFoto, eliminarFoto } from "@/lib/storage"
import jest from "jest" // Declare the jest variable

// Mock las funciones de storage
jest.mock("@/lib/storage", () => ({
  obtenerFotosCoche: jest.fn(),
  subirFoto: jest.fn(),
  eliminarFoto: jest.fn(),
  validarArchivoImagen: jest.fn(),
}))

const mockObtenerFotosCoche = obtenerFotosCoche as jest.MockedFunction<typeof obtenerFotosCoche>
const mockSubirFoto = subirFoto as jest.MockedFunction<typeof subirFoto>
const mockEliminarFoto = eliminarFoto as jest.MockedFunction<typeof eliminarFoto>

// Mock window.confirm
Object.defineProperty(window, "confirm", {
  writable: true,
  value: jest.fn(),
})

describe("FotosManager UI", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(window.confirm as jest.Mock).mockReturnValue(true)
  })

  describe("Visualización de fotos", () => {
    it("muestra galería de fotos correctamente", async () => {
      const fotos = ["https://example.com/foto1.jpg", "https://example.com/foto2.jpg", "https://example.com/foto3.jpg"]

      mockObtenerFotosCoche.mockResolvedValue({
        success: true,
        fotos,
      })

      render(<FotosManager matricula="1234ABC" isEditing={false} />)

      await waitFor(() => {
        expect(screen.getByText("3")).toBeInTheDocument() // Badge con número de fotos
      })

      // Verificar que se muestran las imágenes
      const imagenes = screen.getAllByRole("img")
      expect(imagenes).toHaveLength(3)

      fotos.forEach((foto, index) => {
        expect(imagenes[index]).toHaveAttribute("src", foto)
        expect(imagenes[index]).toHaveAttribute("alt", `Foto ${index + 1} del vehículo 1234ABC`)
      })
    })

    it("muestra mensaje cuando no hay fotos", async () => {
      mockObtenerFotosCoche.mockResolvedValue({
        success: true,
        fotos: [],
      })

      render(<FotosManager matricula="1234ABC" isEditing={false} />)

      await waitFor(() => {
        expect(screen.getByText("No hay fotos disponibles para este vehículo")).toBeInTheDocument()
      })
    })

    it("no muestra el botón de diagnóstico", async () => {
      mockObtenerFotosCoche.mockResolvedValue({
        success: true,
        fotos: [],
      })

      render(<FotosManager matricula="1234ABC" isEditing={false} />)

      await waitFor(() => {
        expect(screen.queryByText("Diagnóstico")).not.toBeInTheDocument()
      })
    })
  })

  describe("Modo edición", () => {
    it("muestra formulario de subida en modo edición", async () => {
      mockObtenerFotosCoche.mockResolvedValue({
        success: true,
        fotos: [],
      })

      render(<FotosManager matricula="1234ABC" isEditing={true} />)

      await waitFor(() => {
        expect(screen.getByLabelText("Seleccionar fotos")).toBeInTheDocument()
        expect(screen.getByText("Subir 0 foto(s)")).toBeInTheDocument()
      })
    })

    it("permite seleccionar múltiples archivos", async () => {
      const { validarArchivoImagen } = require("@/lib/storage")
      validarArchivoImagen.mockReturnValue({ valido: true })

      mockObtenerFotosCoche.mockResolvedValue({
        success: true,
        fotos: [],
      })

      render(<FotosManager matricula="1234ABC" isEditing={true} />)

      await waitFor(() => {
        const fileInput = screen.getByLabelText("Seleccionar fotos")

        const file1 = new File([""], "test1.jpg", { type: "image/jpeg" })
        const file2 = new File([""], "test2.png", { type: "image/png" })

        Object.defineProperty(file1, "size", { value: 1024 * 1024 })
        Object.defineProperty(file2, "size", { value: 2 * 1024 * 1024 })

        Object.defineProperty(fileInput, "files", {
          value: [file1, file2],
          writable: false,
        })

        fireEvent.change(fileInput)
      })

      await waitFor(() => {
        expect(screen.getByText("Archivos seleccionados:")).toBeInTheDocument()
        expect(screen.getByText("test1.jpg")).toBeInTheDocument()
        expect(screen.getByText("test2.png")).toBeInTheDocument()
        expect(screen.getByText("Subir 2 foto(s)")).toBeInTheDocument()
      })
    })

    it("sube archivos correctamente", async () => {
      const { validarArchivoImagen } = require("@/lib/storage")
      validarArchivoImagen.mockReturnValue({ valido: true })

      mockObtenerFotosCoche.mockResolvedValue({
        success: true,
        fotos: [],
      })

      mockSubirFoto.mockResolvedValue({
        success: true,
        url: "https://example.com/nueva-foto.jpg",
      })

      render(<FotosManager matricula="1234ABC" isEditing={true} />)

      await waitFor(() => {
        const fileInput = screen.getByLabelText("Seleccionar fotos")
        const file = new File([""], "test.jpg", { type: "image/jpeg" })
        Object.defineProperty(file, "size", { value: 1024 * 1024 })

        Object.defineProperty(fileInput, "files", {
          value: [file],
          writable: false,
        })

        fireEvent.change(fileInput)
      })

      await waitFor(() => {
        const subirButton = screen.getByText("Subir 1 foto(s)")
        fireEvent.click(subirButton)
      })

      await waitFor(() => {
        expect(mockSubirFoto).toHaveBeenCalledWith("1234ABC", expect.any(File))
        expect(screen.getByText("1 foto(s) subida(s) correctamente")).toBeInTheDocument()
      })
    })

    it("muestra botones de eliminar en modo edición", async () => {
      const fotos = ["https://example.com/foto1.jpg"]

      mockObtenerFotosCoche.mockResolvedValue({
        success: true,
        fotos,
      })

      render(<FotosManager matricula="1234ABC" isEditing={true} />)

      await waitFor(() => {
        const imagen = screen.getByRole("img")
        fireEvent.mouseEnter(imagen.parentElement!)
      })

      // Verificar que hay botones de acción
      const botones = screen.getAllByRole("button")
      const botonesEliminar = botones.filter((btn) => btn.querySelector("svg")?.classList.contains("lucide-trash-2"))

      expect(botonesEliminar.length).toBeGreaterThan(0)
    })
  })

  describe("Modo solo lectura", () => {
    it("no muestra formulario de subida en modo solo lectura", async () => {
      mockObtenerFotosCoche.mockResolvedValue({
        success: true,
        fotos: [],
      })

      render(<FotosManager matricula="1234ABC" isEditing={false} />)

      await waitFor(() => {
        expect(screen.queryByLabelText("Seleccionar fotos")).not.toBeInTheDocument()
        expect(screen.queryByText(/Subir.*foto/)).not.toBeInTheDocument()
      })
    })

    it("no muestra botones de eliminar en modo solo lectura", async () => {
      const fotos = ["https://example.com/foto1.jpg"]

      mockObtenerFotosCoche.mockResolvedValue({
        success: true,
        fotos,
      })

      render(<FotosManager matricula="1234ABC" isEditing={false} />)

      await waitFor(() => {
        expect(screen.getByRole("img")).toBeInTheDocument()
      })

      // No debería haber botones de eliminar
      const botonesEliminar = screen
        .queryAllByRole("button")
        .filter((btn) => btn.querySelector("svg")?.classList.contains("lucide-trash-2"))
      expect(botonesEliminar).toHaveLength(0)
    })

    it("permite ver fotos en modal", async () => {
      const fotos = ["https://example.com/foto1.jpg"]

      mockObtenerFotosCoche.mockResolvedValue({
        success: true,
        fotos,
      })

      render(<FotosManager matricula="1234ABC" isEditing={false} />)

      await waitFor(() => {
        const imagen = screen.getByRole("img")
        fireEvent.click(imagen)
      })

      await waitFor(() => {
        expect(screen.getByText("Foto del vehículo 1234ABC")).toBeInTheDocument()
      })
    })
  })

  describe("Manejo de errores", () => {
    it("muestra errores de carga", async () => {
      mockObtenerFotosCoche.mockResolvedValue({
        success: false,
        error: "Error de conexión",
      })

      render(<FotosManager matricula="1234ABC" isEditing={false} />)

      await waitFor(() => {
        expect(screen.getByText("Error de conexión")).toBeInTheDocument()
      })
    })

    it("muestra errores de subida", async () => {
      const { validarArchivoImagen } = require("@/lib/storage")
      validarArchivoImagen.mockReturnValue({ valido: true })

      mockObtenerFotosCoche.mockResolvedValue({
        success: true,
        fotos: [],
      })

      mockSubirFoto.mockResolvedValue({
        success: false,
        error: "Error al subir archivo",
      })

      render(<FotosManager matricula="1234ABC" isEditing={true} />)

      await waitFor(() => {
        const fileInput = screen.getByLabelText("Seleccionar fotos")
        const file = new File([""], "test.jpg", { type: "image/jpeg" })
        Object.defineProperty(file, "size", { value: 1024 * 1024 })

        Object.defineProperty(fileInput, "files", {
          value: [file],
          writable: false,
        })

        fireEvent.change(fileInput)
      })

      await waitFor(() => {
        const subirButton = screen.getByText("Subir 1 foto(s)")
        fireEvent.click(subirButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/Error en 1 archivo.*Error al subir archivo/)).toBeInTheDocument()
      })
    })
  })

  describe("Sin matrícula", () => {
    it("muestra mensaje cuando no hay matrícula", () => {
      render(<FotosManager matricula="" isEditing={false} />)

      expect(screen.getByText("Fotos del Vehículo")).toBeInTheDocument()
    })
  })
})
