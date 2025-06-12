import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { FotosManager } from "@/components/fotos-manager"
import { obtenerFotosCoche, subirFoto, eliminarFoto, validarArchivoImagen } from "@/lib/storage"
import jest from "jest" // Import jest to declare the variable

// Mock completo del workflow
jest.mock("@/lib/storage")

const mockObtenerFotosCoche = obtenerFotosCoche as jest.MockedFunction<typeof obtenerFotosCoche>
const mockSubirFoto = subirFoto as jest.MockedFunction<typeof subirFoto>
const mockEliminarFoto = eliminarFoto as jest.MockedFunction<typeof eliminarFoto>
const mockValidarArchivoImagen = validarArchivoImagen as jest.MockedFunction<typeof validarArchivoImagen>

Object.defineProperty(window, "confirm", {
  writable: true,
  value: jest.fn(),
})

describe("Fotos Workflow Completo", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(window.confirm as jest.Mock).mockReturnValue(true)
  })

  it("workflow completo: cargar -> subir -> eliminar fotos", async () => {
    // 1. Inicialmente sin fotos
    mockObtenerFotosCoche.mockResolvedValueOnce({
      success: true,
      fotos: [],
    })

    const { rerender } = render(<FotosManager matricula="1234ABC" isEditing={true} />)

    await waitFor(() => {
      expect(screen.getByText("No hay fotos disponibles para este vehículo")).toBeInTheDocument()
    })

    // 2. Subir primera foto
    mockValidarArchivoImagen.mockReturnValue({ valido: true })
    mockSubirFoto.mockResolvedValueOnce({
      success: true,
      url: "https://example.com/foto1.jpg",
    })

    // Mock para recargar fotos después de subir
    mockObtenerFotosCoche.mockResolvedValueOnce({
      success: true,
      fotos: ["https://example.com/foto1.jpg"],
    })

    const fileInput = screen.getByLabelText("Seleccionar fotos")
    const file1 = new File([""], "foto1.jpg", { type: "image/jpeg" })
    Object.defineProperty(file1, "size", { value: 1024 * 1024 })

    Object.defineProperty(fileInput, "files", {
      value: [file1],
      writable: false,
    })

    fireEvent.change(fileInput)

    await waitFor(() => {
      const subirButton = screen.getByText("Subir 1 foto(s)")
      fireEvent.click(subirButton)
    })

    await waitFor(() => {
      expect(mockSubirFoto).toHaveBeenCalledWith("1234ABC", file1)
      expect(screen.getByText("1 foto(s) subida(s) correctamente")).toBeInTheDocument()
    })

    // 3. Subir segunda foto
    mockSubirFoto.mockResolvedValueOnce({
      success: true,
      url: "https://example.com/foto2.jpg",
    })

    mockObtenerFotosCoche.mockResolvedValueOnce({
      success: true,
      fotos: ["https://example.com/foto1.jpg", "https://example.com/foto2.jpg"],
    })

    const file2 = new File([""], "foto2.jpg", { type: "image/jpeg" })
    Object.defineProperty(file2, "size", { value: 1024 * 1024 })

    Object.defineProperty(fileInput, "files", {
      value: [file2],
      writable: false,
    })

    fireEvent.change(fileInput)

    await waitFor(() => {
      const subirButton = screen.getByText("Subir 1 foto(s)")
      fireEvent.click(subirButton)
    })

    await waitFor(() => {
      expect(mockSubirFoto).toHaveBeenCalledWith("1234ABC", file2)
    })

    // 4. Verificar que se muestran ambas fotos
    rerender(<FotosManager matricula="1234ABC" isEditing={true} />)

    mockObtenerFotosCoche.mockResolvedValueOnce({
      success: true,
      fotos: ["https://example.com/foto1.jpg", "https://example.com/foto2.jpg"],
    })

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument() // Badge con número de fotos
      const imagenes = screen.getAllByRole("img")
      expect(imagenes).toHaveLength(2)
    })

    // 5. Eliminar una foto
    mockEliminarFoto.mockResolvedValueOnce({
      success: true,
    })

    mockObtenerFotosCoche.mockResolvedValueOnce({
      success: true,
      fotos: ["https://example.com/foto1.jpg"],
    })

    const imagenes = screen.getAllByRole("img")
    fireEvent.mouseEnter(imagenes[0].parentElement!)

    await waitFor(() => {
      const botonesEliminar = screen
        .getAllByRole("button")
        .filter((btn) => btn.querySelector("svg")?.classList.contains("lucide-trash-2"))

      if (botonesEliminar.length > 0) {
        fireEvent.click(botonesEliminar[0])
      }
    })

    await waitFor(() => {
      expect(mockEliminarFoto).toHaveBeenCalledWith("1234ABC", "foto1.jpg")
    })
  })

  it("maneja múltiples subidas simultáneas", async () => {
    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos: [],
    })

    render(<FotosManager matricula="1234ABC" isEditing={true} />)

    // Preparar múltiples archivos
    mockValidarArchivoImagen.mockReturnValue({ valido: true })

    const files = [
      new File([""], "foto1.jpg", { type: "image/jpeg" }),
      new File([""], "foto2.png", { type: "image/png" }),
      new File([""], "foto3.webp", { type: "image/webp" }),
    ]

    files.forEach((file) => {
      Object.defineProperty(file, "size", { value: 1024 * 1024 })
    })

    // Mock respuestas de subida
    mockSubirFoto
      .mockResolvedValueOnce({
        success: true,
        url: "https://example.com/foto1.jpg",
      })
      .mockResolvedValueOnce({
        success: true,
        url: "https://example.com/foto2.png",
      })
      .mockResolvedValueOnce({
        success: true,
        url: "https://example.com/foto3.webp",
      })

    mockObtenerFotosCoche.mockResolvedValueOnce({
      success: true,
      fotos: ["https://example.com/foto1.jpg", "https://example.com/foto2.png", "https://example.com/foto3.webp"],
    })

    await waitFor(() => {
      const fileInput = screen.getByLabelText("Seleccionar fotos")

      Object.defineProperty(fileInput, "files", {
        value: files,
        writable: false,
      })

      fireEvent.change(fileInput)
    })

    await waitFor(() => {
      expect(screen.getByText("Subir 3 foto(s)")).toBeInTheDocument()
      const subirButton = screen.getByText("Subir 3 foto(s)")
      fireEvent.click(subirButton)
    })

    await waitFor(() => {
      expect(mockSubirFoto).toHaveBeenCalledTimes(3)
      expect(screen.getByText("3 foto(s) subida(s) correctamente")).toBeInTheDocument()
    })
  })

  it("maneja errores parciales en subidas múltiples", async () => {
    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos: [],
    })

    render(<FotosManager matricula="1234ABC" isEditing={true} />)

    mockValidarArchivoImagen.mockReturnValue({ valido: true })

    const files = [
      new File([""], "foto1.jpg", { type: "image/jpeg" }),
      new File([""], "foto2.jpg", { type: "image/jpeg" }),
    ]

    files.forEach((file) => {
      Object.defineProperty(file, "size", { value: 1024 * 1024 })
    })

    // Una subida exitosa, una fallida
    mockSubirFoto
      .mockResolvedValueOnce({
        success: true,
        url: "https://example.com/foto1.jpg",
      })
      .mockResolvedValueOnce({
        success: false,
        error: "Error de red",
      })

    mockObtenerFotosCoche.mockResolvedValueOnce({
      success: true,
      fotos: ["https://example.com/foto1.jpg"],
    })

    await waitFor(() => {
      const fileInput = screen.getByLabelText("Seleccionar fotos")

      Object.defineProperty(fileInput, "files", {
        value: files,
        writable: false,
      })

      fireEvent.change(fileInput)
    })

    await waitFor(() => {
      const subirButton = screen.getByText("Subir 2 foto(s)")
      fireEvent.click(subirButton)
    })

    await waitFor(() => {
      expect(screen.getByText("1 foto(s) subida(s) correctamente")).toBeInTheDocument()
      expect(screen.getByText(/Error en 1 archivo.*Error de red/)).toBeInTheDocument()
    })
  })
})
