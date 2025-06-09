import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useRouter } from "next/navigation"
import NuevoCochePage from "@/app/coches/nuevo/page"
import { crearCoche } from "@/app/coches/nuevo/actions"
import jest from "jest"

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

describe("Campo Extras en Formularios", () => {
  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    mockCrearCoche.mockClear()
    mockPush.mockClear()
  })

  it("incluye el campo extras en el formulario de nuevo coche", () => {
    render(<NuevoCochePage />)

    const extrasField = screen.getByLabelText("Extras y Equipamiento")
    expect(extrasField).toBeInTheDocument()
    expect(extrasField).toHaveAttribute("placeholder", "Aire acondicionado, navegador, sensores de aparcamiento...")
  })

  it("permite escribir en el campo extras", () => {
    render(<NuevoCochePage />)

    const extrasField = screen.getByLabelText("Extras y Equipamiento")

    fireEvent.change(extrasField, {
      target: { value: "Aire acondicionado, navegador GPS, cámara trasera" },
    })

    expect(extrasField).toHaveValue("Aire acondicionado, navegador GPS, cámara trasera")
  })

  it("envía el campo extras en el formulario", async () => {
    mockCrearCoche.mockResolvedValue({ success: true, data: { matricula: "1234ABC" } })

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

    // Llenar campo extras
    fireEvent.change(screen.getByLabelText("Extras y Equipamiento"), {
      target: { value: "Aire acondicionado, navegador GPS, sensores de aparcamiento, cámara trasera" },
    })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Crear Coche" }))

    await waitFor(() => {
      expect(mockCrearCoche).toHaveBeenCalledWith(expect.any(FormData))
    })

    // Verificar que el FormData contiene el campo extras
    const formDataCall = mockCrearCoche.mock.calls[0][0] as FormData
    expect(formDataCall.get("extras")).toBe(
      "Aire acondicionado, navegador GPS, sensores de aparcamiento, cámara trasera",
    )
  })

  it("maneja campo extras vacío correctamente", async () => {
    mockCrearCoche.mockResolvedValue({ success: true, data: { matricula: "1234ABC" } })

    render(<NuevoCochePage />)

    // Llenar solo campos obligatorios
    fireEvent.change(screen.getByLabelText("Matrícula *"), {
      target: { value: "1234ABC" },
    })
    fireEvent.change(screen.getByLabelText("Marca *"), {
      target: { value: "Toyota" },
    })
    fireEvent.change(screen.getByLabelText("Modelo *"), {
      target: { value: "Corolla" },
    })

    // Dejar extras vacío
    const extrasField = screen.getByLabelText("Extras y Equipamiento")
    expect(extrasField).toHaveValue("")

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Crear Coche" }))

    await waitFor(() => {
      expect(mockCrearCoche).toHaveBeenCalledWith(expect.any(FormData))
    })

    // Verificar que el FormData maneja extras vacío
    const formDataCall = mockCrearCoche.mock.calls[0][0] as FormData
    expect(formDataCall.get("extras")).toBe("")
  })
})
