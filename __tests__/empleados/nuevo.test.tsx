import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useRouter } from "next/navigation"
import NuevoEmpleadoPage from "@/app/empleados/nuevo/page"
import { crearEmpleado } from "@/app/empleados/nuevo/actions"
import jest from "jest"

// Mock useRouter
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}))

// Mock la Server Action
jest.mock("@/app/empleados/nuevo/actions", () => ({
  crearEmpleado: jest.fn(),
}))

const mockPush = jest.fn()
const mockCrearEmpleado = crearEmpleado as jest.MockedFunction<typeof crearEmpleado>

describe("Formulario de Nuevo Empleado", () => {
  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    mockCrearEmpleado.mockClear()
    mockPush.mockClear()
  })

  it("renderiza el formulario correctamente", () => {
    render(<NuevoEmpleadoPage />)

    expect(screen.getByText("Nuevo Empleado")).toBeInTheDocument()
    expect(screen.getByLabelText("Nombre *")).toBeInTheDocument()
    expect(screen.getByLabelText("Apellidos *")).toBeInTheDocument()
    expect(screen.getByLabelText("Email *")).toBeInTheDocument()
    expect(screen.getByLabelText("Móvil")).toBeInTheDocument()
    expect(screen.getByLabelText("Rol")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Crear Empleado" })).toBeInTheDocument()
  })

  it("muestra campos obligatorios", () => {
    render(<NuevoEmpleadoPage />)

    const nombreInput = screen.getByLabelText("Nombre *")
    const apellidosInput = screen.getByLabelText("Apellidos *")
    const emailInput = screen.getByLabelText("Email *")

    expect(nombreInput).toHaveAttribute("required")
    expect(apellidosInput).toHaveAttribute("required")
    expect(emailInput).toHaveAttribute("required")
  })

  it("muestra placeholders correctos", () => {
    render(<NuevoEmpleadoPage />)

    expect(screen.getByPlaceholderText("Juan")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Pérez García")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("juan.perez@empresa.com")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("600123456")).toBeInTheDocument()
  })

  it("envía el formulario con datos válidos", async () => {
    mockCrearEmpleado.mockResolvedValue({ success: true, data: { id: 1 } })

    render(<NuevoEmpleadoPage />)

    // Llenar campos obligatorios
    fireEvent.change(screen.getByLabelText("Nombre *"), {
      target: { value: "Juan" },
    })
    fireEvent.change(screen.getByLabelText("Apellidos *"), {
      target: { value: "Pérez García" },
    })
    fireEvent.change(screen.getByLabelText("Email *"), {
      target: { value: "juan.perez@empresa.com" },
    })
    fireEvent.click(screen.getByLabelText("Rol"))
    fireEvent.click(screen.getByText("Administrador"))

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Crear Empleado" }))

    await waitFor(() => {
      expect(mockCrearEmpleado).toHaveBeenCalledWith(expect.any(FormData))
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/empleados")
    })
  })

  it("envía el formulario con todos los campos incluido móvil", async () => {
    mockCrearEmpleado.mockResolvedValue({ success: true, data: { id: 1 } })

    render(<NuevoEmpleadoPage />)

    // Llenar todos los campos
    fireEvent.change(screen.getByLabelText("Nombre *"), {
      target: { value: "María" },
    })
    fireEvent.change(screen.getByLabelText("Apellidos *"), {
      target: { value: "García López" },
    })
    fireEvent.change(screen.getByLabelText("Email *"), {
      target: { value: "maria.garcia@empresa.com" },
    })
    fireEvent.change(screen.getByLabelText("Móvil"), {
      target: { value: "600123456" },
    })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Crear Empleado" }))

    await waitFor(() => {
      expect(mockCrearEmpleado).toHaveBeenCalledWith(expect.any(FormData))
    })

    // Verificar que el FormData contiene todos los campos
    const formDataCall = mockCrearEmpleado.mock.calls[0][0] as FormData
    expect(formDataCall.get("nombre")).toBe("María")
    expect(formDataCall.get("apellidos")).toBe("García López")
    expect(formDataCall.get("email")).toBe("maria.garcia@empresa.com")
    expect(formDataCall.get("movil")).toBe("600123456")
    expect(formDataCall.get("role")).toBe("usuario")
  })

  it("muestra error cuando falla la creación", async () => {
    mockCrearEmpleado.mockResolvedValue({
      success: false,
      error: "Ya existe un empleado con este email",
    })

    render(<NuevoEmpleadoPage />)

    // Llenar campos obligatorios
    fireEvent.change(screen.getByLabelText("Nombre *"), {
      target: { value: "Juan" },
    })
    fireEvent.change(screen.getByLabelText("Apellidos *"), {
      target: { value: "Pérez García" },
    })
    fireEvent.change(screen.getByLabelText("Email *"), {
      target: { value: "juan.perez@empresa.com" },
    })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Crear Empleado" }))

    await waitFor(() => {
      expect(screen.getByText("Ya existe un empleado con este email")).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it("deshabilita el botón durante el envío", async () => {
    mockCrearEmpleado.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)),
    )

    render(<NuevoEmpleadoPage />)

    // Llenar campos obligatorios
    fireEvent.change(screen.getByLabelText("Nombre *"), {
      target: { value: "Juan" },
    })
    fireEvent.change(screen.getByLabelText("Apellidos *"), {
      target: { value: "Pérez García" },
    })
    fireEvent.change(screen.getByLabelText("Email *"), {
      target: { value: "juan.perez@empresa.com" },
    })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Crear Empleado" }))

    expect(screen.getByRole("button", { name: "Creando..." })).toBeDisabled()
  })

  it("valida el tipo de input email", () => {
    render(<NuevoEmpleadoPage />)

    const emailInput = screen.getByLabelText("Email *")
    expect(emailInput).toHaveAttribute("type", "email")
  })

  it("valida el tipo de input móvil", () => {
    render(<NuevoEmpleadoPage />)

    const movilInput = screen.getByLabelText("Móvil")
    expect(movilInput).toHaveAttribute("type", "tel")
  })

  it("incluye botón de cancelar que enlaza a empleados", () => {
    render(<NuevoEmpleadoPage />)

    const cancelarLink = screen.getByText("Cancelar")
    expect(cancelarLink).toHaveAttribute("href", "/empleados")
  })

  it("incluye enlace de volver que enlaza a empleados", () => {
    render(<NuevoEmpleadoPage />)

    const volverLink = screen.getByText("Volver a Empleados")
    expect(volverLink.closest("a")).toHaveAttribute("href", "/empleados")
  })

  it("valida longitudes máximas de campos", () => {
    render(<NuevoEmpleadoPage />)

    expect(screen.getByLabelText("Nombre *")).toHaveAttribute("maxLength", "50")
    expect(screen.getByLabelText("Apellidos *")).toHaveAttribute("maxLength", "100")
    expect(screen.getByLabelText("Email *")).toHaveAttribute("maxLength", "100")
    expect(screen.getByLabelText("Móvil")).toHaveAttribute("maxLength", "20")
  })
})
