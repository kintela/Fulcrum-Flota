import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useRouter } from "next/navigation"
import NuevoCochePage from "@/app/coches/nuevo/page"
import { crearCoche } from "@/app/coches/nuevo/actions"
import jest from "jest" // Import jest to declare the variable

// Mock useRouter
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}))

// Mock la Server Action
jest.mock("@/app/coches/nuevo/actions", () => ({
  crearCoche: jest.fn(),
}))

const mockPush = jest.fn()
const mockCrearCoche = crearCoche as jest.MockedFunction<typeof crearCoche>

describe("Formulario de Nuevo Coche", () => {
  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    mockCrearCoche.mockClear()
    mockPush.mockClear()
  })

  it("renderiza el formulario correctamente", () => {
    render(<NuevoCochePage />)

    expect(screen.getByText("Nuevo Coche")).toBeInTheDocument()
    expect(screen.getByLabelText("Matrícula *")).toBeInTheDocument()
    expect(screen.getByLabelText("Marca *")).toBeInTheDocument()
    expect(screen.getByLabelText("Modelo *")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Crear Coche" })).toBeInTheDocument()
  })

  it("muestra campos obligatorios", () => {
    render(<NuevoCochePage />)

    const matriculaInput = screen.getByLabelText("Matrícula *")
    const marcaInput = screen.getByLabelText("Marca *")
    const modeloInput = screen.getByLabelText("Modelo *")

    expect(matriculaInput).toHaveAttribute("required")
    expect(marcaInput).toHaveAttribute("required")
    expect(modeloInput).toHaveAttribute("required")
  })

  it("envía el formulario con datos válidos", async () => {
    mockCrearCoche.mockResolvedValue({ success: true, data: { id: 1 } })

    render(<NuevoCochePage />)

    // Llenar campos obligatorios
    fireEvent.change(screen.getByLabelText("Matrícula *"), {
      target: { value: "1234ABC" },
    })
    fireEvent.change(screen.getByLabelText("Marca *"), {
      target: { value: "Toyota" },
    })
    fireEvent.change(screen.getByLabelText("Modelo *"), {
      target: { value: "Corolla" },
    })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Crear Coche" }))

    await waitFor(() => {
      expect(mockCrearCoche).toHaveBeenCalledWith(expect.any(FormData))
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/coches")
    })
  })

  it("muestra error cuando falla la creación", async () => {
    mockCrearCoche.mockResolvedValue({
      success: false,
      error: "Error al crear el coche",
    })

    render(<NuevoCochePage />)

    // Llenar campos obligatorios
    fireEvent.change(screen.getByLabelText("Matrícula *"), {
      target: { value: "1234ABC" },
    })
    fireEvent.change(screen.getByLabelText("Marca *"), {
      target: { value: "Toyota" },
    })
    fireEvent.change(screen.getByLabelText("Modelo *"), {
      target: { value: "Corolla" },
    })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Crear Coche" }))

    await waitFor(() => {
      expect(screen.getByText("Error al crear el coche")).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it("deshabilita el botón durante el envío", async () => {
    mockCrearCoche.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)))

    render(<NuevoCochePage />)

    // Llenar campos obligatorios
    fireEvent.change(screen.getByLabelText("Matrícula *"), {
      target: { value: "1234ABC" },
    })
    fireEvent.change(screen.getByLabelText("Marca *"), {
      target: { value: "Toyota" },
    })
    fireEvent.change(screen.getByLabelText("Modelo *"), {
      target: { value: "Corolla" },
    })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Crear Coche" }))

    expect(screen.getByRole("button", { name: "Creando..." })).toBeDisabled()
  })

  it("incluye todos los campos del formulario", () => {
    render(<NuevoCochePage />)

    // Campos básicos
    expect(screen.getByLabelText("Matrícula *")).toBeInTheDocument()
    expect(screen.getByLabelText("Marca *")).toBeInTheDocument()
    expect(screen.getByLabelText("Modelo *")).toBeInTheDocument()
    expect(screen.getByLabelText("Color")).toBeInTheDocument()

    // Campos técnicos
    expect(screen.getByLabelText("Kilómetros")).toBeInTheDocument()
    expect(screen.getByLabelText("Potencia (kW)")).toBeInTheDocument()
    expect(screen.getByLabelText("Potencia (CV)")).toBeInTheDocument()
    expect(screen.getByLabelText("Cilindrada (cc)")).toBeInTheDocument()

    // Campos económicos
    expect(screen.getByLabelText("Precio de Compra (€)")).toBeInTheDocument()
    expect(screen.getByLabelText("Asignado a")).toBeInTheDocument()

    // Checkboxes
    expect(screen.getByLabelText("Vehículo donante")).toBeInTheDocument()
    expect(screen.getByLabelText("Vehículo de alquiler")).toBeInTheDocument()

    // Extras
    expect(screen.getByLabelText("Extras y Equipamiento")).toBeInTheDocument()
  })
})
