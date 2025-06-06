import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useRouter } from "next/navigation"
import EditarCochePage from "@/app/coches/[id]/editar/page"
import { editarCoche, obtenerCoche } from "@/app/coches/[id]/editar/actions"
import jest from "jest"

// Mock useRouter
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}))

// Mock las Server Actions
jest.mock("@/app/coches/[id]/editar/actions", () => ({
  editarCoche: jest.fn(),
  obtenerCoche: jest.fn(),
}))

const mockPush = jest.fn()
const mockEditarCoche = editarCoche as jest.MockedFunction<typeof editarCoche>
const mockObtenerCoche = obtenerCoche as jest.MockedFunction<typeof obtenerCoche>

const mockCoche = {
  matricula: "1234ABC",
  marca: "Toyota",
  modelo: "Corolla",
  color: "Blanco",
  fechamatriculacion: "2020-01-15",
  kms: 50000,
  kw: 100,
  cv: 136,
  cc: 1800,
  combustible: "Gasolina",
  preciocompra: 18000.5,
  asignadoa: "Juan Pérez",
  donante: false,
  alquiler: true,
  extras: "Aire acondicionado, navegador GPS, sensores de aparcamiento",
}

describe("Formulario de Editar Coche", () => {
  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    mockEditarCoche.mockClear()
    mockObtenerCoche.mockClear()
    mockPush.mockClear()
  })

  it("carga y muestra los datos del coche correctamente", async () => {
    mockObtenerCoche.mockResolvedValue(mockCoche)

    render(<EditarCochePage params={{ id: "1234ABC" }} />)

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByDisplayValue("1234ABC")).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue("Toyota")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Corolla")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Blanco")).toBeInTheDocument()
    expect(screen.getByDisplayValue("50000")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Aire acondicionado, navegador GPS, sensores de aparcamiento")).toBeInTheDocument()
  })

  it("muestra mensaje de carga inicialmente", () => {
    mockObtenerCoche.mockImplementation(() => new Promise(() => {})) // Promise que nunca se resuelve

    render(<EditarCochePage params={{ id: "1234ABC" }} />)

    expect(screen.getByText("Cargando datos del coche...")).toBeInTheDocument()
  })

  it("muestra error cuando no se encuentra el coche", async () => {
    mockObtenerCoche.mockResolvedValue(null)

    render(<EditarCochePage params={{ id: "NOEXISTE" }} />)

    await waitFor(() => {
      expect(screen.getByText("No se encontró el coche con matrícula NOEXISTE")).toBeInTheDocument()
    })

    expect(screen.getByText("Volver a la lista de coches")).toBeInTheDocument()
  })

  it("maneja ID indefinido correctamente", async () => {
    render(<EditarCochePage params={{ id: "undefined" }} />)

    await waitFor(() => {
      expect(screen.getByText("ID de coche no válido")).toBeInTheDocument()
    })
  })

  it("envía el formulario con datos actualizados", async () => {
    mockObtenerCoche.mockResolvedValue(mockCoche)
    mockEditarCoche.mockResolvedValue({ success: true, data: mockCoche })

    render(<EditarCochePage params={{ id: "1234ABC" }} />)

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByDisplayValue("1234ABC")).toBeInTheDocument()
    })

    // Modificar algunos campos
    const kmInput = screen.getByDisplayValue("50000")
    fireEvent.change(kmInput, { target: { value: "55000" } })

    const extrasTextarea = screen.getByDisplayValue("Aire acondicionado, navegador GPS, sensores de aparcamiento")
    fireEvent.change(extrasTextarea, {
      target: { value: "Aire acondicionado, navegador GPS, sensores de aparcamiento, cámara trasera" },
    })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }))

    await waitFor(() => {
      expect(mockEditarCoche).toHaveBeenCalledWith("1234ABC", expect.any(FormData))
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/coches")
    })
  })

  it("muestra error cuando falla la actualización", async () => {
    mockObtenerCoche.mockResolvedValue(mockCoche)
    mockEditarCoche.mockResolvedValue({
      success: false,
      error: "Error al actualizar el coche",
    })

    render(<EditarCochePage params={{ id: "1234ABC" }} />)

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByDisplayValue("1234ABC")).toBeInTheDocument()
    })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }))

    await waitFor(() => {
      expect(screen.getByText("Error al actualizar el coche")).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it("deshabilita el botón durante el envío", async () => {
    mockObtenerCoche.mockResolvedValue(mockCoche)
    mockEditarCoche.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)),
    )

    render(<EditarCochePage params={{ id: "1234ABC" }} />)

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByDisplayValue("1234ABC")).toBeInTheDocument()
    })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }))

    expect(screen.getByRole("button", { name: "Guardando..." })).toBeDisabled()
  })

  it("incluye el campo extras en el formulario", async () => {
    mockObtenerCoche.mockResolvedValue(mockCoche)

    render(<EditarCochePage params={{ id: "1234ABC" }} />)

    await waitFor(() => {
      expect(screen.getByLabelText("Extras y Equipamiento")).toBeInTheDocument()
    })

    const extrasField = screen.getByLabelText("Extras y Equipamiento")
    expect(extrasField).toHaveValue("Aire acondicionado, navegador GPS, sensores de aparcamiento")
  })

  it("mantiene los valores de los checkboxes correctamente", async () => {
    mockObtenerCoche.mockResolvedValue(mockCoche)

    render(<EditarCochePage params={{ id: "1234ABC" }} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue("1234ABC")).toBeInTheDocument()
    })

    const donanteCheckbox = screen.getByLabelText("Vehículo donante")
    const alquilerCheckbox = screen.getByLabelText("Vehículo de alquiler")

    expect(donanteCheckbox).not.toBeChecked() // donante: false
    expect(alquilerCheckbox).toBeChecked() // alquiler: true
  })
})
