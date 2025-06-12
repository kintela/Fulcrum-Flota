import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { FotosManager } from "@/components/fotos-manager"
import { obtenerFotosCoche, subirFoto, eliminarFoto } from "@/lib/storage"
import jest from "jest" // Import jest to declare it

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

describe("FotosManager", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(window.confirm as jest.Mock).mockReturnValue(true)
  })

  it("muestra mensaje cuando no hay matrícula", () => {
    render(<FotosManager matricula="" isEditing={false} />)

    expect(screen.getByText("Fotos del Vehículo")).toBeInTheDocument()

    // Expandir el accordion
    fireEvent.click(screen.getByText("Fotos del Vehículo"))

    expect(screen.getByText("Guarda el coche primero para poder gestionar las fotos")).toBeInTheDocument()
  })

  it("carga y muestra fotos existentes", async () => {
    const fotos = ["https://example.com/foto1.jpg", "https://example.com/foto2.jpg"]

    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos,
    })

    render(<FotosManager matricula="1234ABC" isEditing={false} />)

    // Expandir el accordion
    fireEvent.click(screen.getByText("Fotos del Vehículo"))

    await waitFor(() => {
      expect(screen.getByText("Galería de Fotos (2)")).toBeInTheDocument()
    })

    expect(mockObtenerFotosCoche).toHaveBeenCalledWith("1234ABC")

    // Verificar que se muestran las imágenes
    const imagenes = screen.getAllByRole("img")
    expect(imagenes).toHaveLength(2)
    expect(imagenes[0]).toHaveAttribute("src", fotos[0])
    expect(imagenes[1]).toHaveAttribute("src", fotos[1])
  })

  it("muestra mensaje cuando no hay fotos", async () => {
    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos: [],
    })

    render(<FotosManager matricula="1234ABC" isEditing={false} />)

    // Expandir el accordion
    fireEvent.click(screen.getByText("Fotos del Vehículo"))

    await waitFor(() => {
      expect(screen.getByText("No hay fotos registradas para este vehículo")).toBeInTheDocument()
    })
  })

  it("muestra formulario de subida en modo edición", async () => {
    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos: [],
    })

    render(<FotosManager matricula="1234ABC" isEditing={true} />)

    // Expandir el accordion
    fireEvent.click(screen.getByText("Fotos del Vehículo"))

    await waitFor(() => {
      expect(screen.getByText("Subir Fotos")).toBeInTheDocument()
      expect(screen.getByLabelText("Seleccionar fotos")).toBeInTheDocument()
      expect(screen.getByText("Subir Fotos")).toBeInTheDocument()
    })
  })

  it("no muestra formulario de subida en modo solo lectura", async () => {
    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos: [],
    })

    render(<FotosManager matricula="1234ABC" isEditing={false} />)

    // Expandir el accordion
    fireEvent.click(screen.getByText("Fotos del Vehículo"))

    await waitFor(() => {
      expect(screen.queryByText("Subir Fotos")).not.toBeInTheDocument()
    })
  })

  it("muestra badge con número de fotos", async () => {
    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos: ["foto1.jpg", "foto2.jpg", "foto3.jpg"],
    })

    render(<FotosManager matricula="1234ABC" isEditing={false} />)

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument()
    })
  })

  it("maneja errores al cargar fotos", async () => {
    mockObtenerFotosCoche.mockResolvedValue({
      success: false,
      error: "Error de conexión",
    })

    render(<FotosManager matricula="1234ABC" isEditing={false} />)

    // Expandir el accordion
    fireEvent.click(screen.getByText("Fotos del Vehículo"))

    await waitFor(() => {
      expect(screen.getByText("Error de conexión")).toBeInTheDocument()
    })
  })

  it("permite seleccionar archivos para subir", async () => {
    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos: [],
    })

    render(<FotosManager matricula="1234ABC" isEditing={true} />)

    // Expandir el accordion
    fireEvent.click(screen.getByText("Fotos del Vehículo"))

    await waitFor(() => {
      const fileInput = screen.getByLabelText("Seleccionar fotos")
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute("accept", "image/jpeg,image/jpg,image/png,image/webp")
      expect(fileInput).toHaveAttribute("multiple")
    })
  })

  it("muestra información de archivos seleccionados", async () => {
    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos: [],
    })

    render(<FotosManager matricula="1234ABC" isEditing={true} />)

    // Expandir el accordion
    fireEvent.click(screen.getByText("Fotos del Vehículo"))

    await waitFor(() => {
      const fileInput = screen.getByLabelText("Seleccionar fotos")

      // Simular selección de archivos
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
      expect(screen.getByText("2 archivo(s) seleccionado(s):")).toBeInTheDocument()
      expect(screen.getByText(/test1\.jpg.*1\.00 MB/)).toBeInTheDocument()
      expect(screen.getByText(/test2\.png.*2\.00 MB/)).toBeInTheDocument()
    })
  })

  it("muestra botones de acción en modo edición", async () => {
    const fotos = ["https://example.com/foto1.jpg"]

    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos,
    })

    render(<FotosManager matricula="1234ABC" isEditing={true} />)

    // Expandir el accordion
    fireEvent.click(screen.getByText("Fotos del Vehículo"))

    await waitFor(() => {
      const imagen = screen.getByRole("img")

      // Hacer hover sobre la imagen para mostrar los botones
      fireEvent.mouseEnter(imagen.parentElement!)
    })

    // Los botones deberían estar presentes en el DOM aunque no sean visibles
    const botonesVer = screen
      .getAllByRole("button")
      .filter(
        (btn) =>
          btn.querySelector("svg")?.classList.contains("lucide-eye") || btn.getAttribute("aria-label")?.includes("ver"),
      )
    const botonesEliminar = screen
      .getAllByRole("button")
      .filter(
        (btn) =>
          btn.querySelector("svg")?.classList.contains("lucide-trash-2") ||
          btn.getAttribute("aria-label")?.includes("eliminar"),
      )

    expect(botonesVer.length).toBeGreaterThan(0)
    expect(botonesEliminar.length).toBeGreaterThan(0)
  })

  it("no muestra botones de eliminar en modo solo lectura", async () => {
    const fotos = ["https://example.com/foto1.jpg"]

    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos,
    })

    render(<FotosManager matricula="1234ABC" isEditing={false} />)

    // Expandir el accordion
    fireEvent.click(screen.getByText("Fotos del Vehículo"))

    await waitFor(() => {
      expect(screen.getByRole("img")).toBeInTheDocument()
    })

    // No debería haber botones de eliminar
    const botonesEliminar = screen
      .queryAllByRole("button")
      .filter((btn) => btn.querySelector("svg")?.classList.contains("lucide-trash-2"))
    expect(botonesEliminar).toHaveLength(0)
  })

  it("abre modal al hacer clic en una foto", async () => {
    const fotos = ["https://example.com/foto1.jpg"]

    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos,
    })

    render(<FotosManager matricula="1234ABC" isEditing={false} />)

    // Expandir el accordion
    fireEvent.click(screen.getByText("Fotos del Vehículo"))

    await waitFor(() => {
      const imagen = screen.getByRole("img")
      fireEvent.click(imagen)
    })

    await waitFor(() => {
      expect(screen.getByText("Foto del vehículo 1234ABC")).toBeInTheDocument()
    })
  })
})
