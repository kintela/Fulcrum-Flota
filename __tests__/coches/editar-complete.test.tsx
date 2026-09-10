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

// Mock obtenerEmpleados
jest.mock("@/app/actions/empleados", () => ({
  obtenerEmpleados: jest.fn().mockResolvedValue([
    { id: 1, nombre: "Juan", apellidos: "Pérez" },
    { id: 2, nombre: "María", apellidos: "García" },
  ]),
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
  alquiler: false,
  fecha_asignacion: "2023-01-01",
  observaciones_asignacion: "Asignación inicial",
  extras: "Aire acondicionado, navegador GPS, sensores de aparcamiento",
}

describe("Formulario de Editar Coche - Funcionalidad Completa", () => {
  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    mockEditarCoche.mockClear()
    mockObtenerCoche.mockClear()
    mockPush.mockClear()
  })

  it("carga y renderiza correctamente todos los campos del formulario", async () => {
    mockObtenerCoche.mockResolvedValue(mockCoche)

    render(<EditarCochePage params={{ id: "1234ABC" }} />)

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByDisplayValue("1234ABC")).toBeInTheDocument()
    })

    // Verificar campos básicos
    expect(screen.getByDisplayValue("Toyota")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Corolla")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Blanco")).toBeInTheDocument()
    expect(screen.getByDisplayValue("2020-01-15")).toBeInTheDocument()

    // Verificar campos técnicos
    expect(screen.getByDisplayValue("50000")).toBeInTheDocument()
    expect(screen.getByDisplayValue("100")).toBeInTheDocument()
    expect(screen.getByDisplayValue("136")).toBeInTheDocument()
    expect(screen.getByDisplayValue("1800")).toBeInTheDocument()

    // Verificar campos económicos
    expect(screen.getByDisplayValue("18000.5")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Juan Pérez")).toBeInTheDocument()

    // Verificar extras
    expect(screen.getByDisplayValue("Aire acondicionado, navegador GPS, sensores de aparcamiento")).toBeInTheDocument()

    // Verificar campos de asignación
    expect(screen.getByDisplayValue("2023-01-01")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Asignación inicial")).toBeInTheDocument()
  })

  it("actualiza correctamente todos los campos modificados", async () => {
    mockObtenerCoche.mockResolvedValue(mockCoche)
    mockEditarCoche.mockResolvedValue({ success: true, data: mockCoche })

    render(<EditarCochePage params={{ id: "1234ABC" }} />)

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByDisplayValue("1234ABC")).toBeInTheDocument()
    })

    // Modificar varios campos
    const kmInput = screen.getByDisplayValue("50000")
    fireEvent.change(kmInput, { target: { value: "55000" } })

    const colorInput = screen.getByDisplayValue("Blanco")
    fireEvent.change(colorInput, { target: { value: "Negro" } })

    const precioInput = screen.getByDisplayValue("18000.5")
    fireEvent.change(precioInput, { target: { value: "19000" } })

    const extrasTextarea = screen.getByDisplayValue("Aire acondicionado, navegador GPS, sensores de aparcamiento")
    fireEvent.change(extrasTextarea, {
      target: { value: "Aire acondicionado, navegador GPS, sensores de aparcamiento, cámara trasera" },
    })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }))

    await waitFor(() => {
      expect(mockEditarCoche).toHaveBeenCalledWith("1234ABC", expect.any(FormData))
    })

    // Verificar que se redirige correctamente
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/coches")
    })
  })

  it("maneja correctamente los checkboxes controlados", async () => {
    mockObtenerCoche.mockResolvedValue(mockCoche)
    mockEditarCoche.mockResolvedValue({ success: true, data: mockCoche })

    render(<EditarCochePage params={{ id: "1234ABC" }} />)

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByDisplayValue("1234ABC")).toBeInTheDocument()
    })

    // Verificar estado inicial de checkboxes
    const donanteCheckbox = screen.getByLabelText("Vehículo donante")
    const alquilerCheckbox = screen.getByLabelText("Vehículo de alquiler")

    expect(donanteCheckbox).not.toBeChecked() // donante: false
    expect(alquilerCheckbox).not.toBeChecked() // alquiler: false

    // Cambiar estado de los checkboxes
    fireEvent.click(donanteCheckbox)
    fireEvent.click(alquilerCheckbox)

    expect(donanteCheckbox).toBeChecked()
    expect(alquilerCheckbox).toBeChecked()

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }))

    await waitFor(() => {
      expect(mockEditarCoche).toHaveBeenCalled()
    })
  })

  it("oculta la sección de empleados cuando se marca como alquiler", async () => {
    mockObtenerCoche.mockResolvedValue(mockCoche)

    render(<EditarCochePage params={{ id: "1234ABC" }} />)

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByDisplayValue("1234ABC")).toBeInTheDocument()
    })

    // Verificar que la sección de empleados está visible inicialmente
    expect(screen.getByText("Asignación de Empleado")).toBeInTheDocument()
    expect(screen.getByLabelText("Empleado Asignado")).toBeInTheDocument()

    // Marcar como alquiler
    const alquilerCheckbox = screen.getByLabelText("Vehículo de alquiler")
    fireEvent.click(alquilerCheckbox)

    // Verificar que la sección de empleados se oculta
    expect(screen.queryByText("Asignación de Empleado")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Empleado Asignado")).not.toBeInTheDocument()
  })

  it("valida campos obligatorios correctamente", async () => {
    mockObtenerCoche.mockResolvedValue(mockCoche)
    mockEditarCoche.mockResolvedValue({
      success: false,
      error: "Los campos matrícula, marca y modelo son obligatorios",
    })

    render(<EditarCochePage params={{ id: "1234ABC" }} />)

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByDisplayValue("1234ABC")).toBeInTheDocument()
    })

    // Limpiar un campo obligatorio
    const marcaInput = screen.getByDisplayValue("Toyota")
    fireEvent.change(marcaInput, { target: { value: "" } })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }))

    await waitFor(() => {
      expect(screen.getByText("Los campos matrícula, marca y modelo son obligatorios")).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it("maneja errores de carga de datos correctamente", async () => {
    mockObtenerCoche.mockResolvedValue(null)

    render(<EditarCochePage params={{ id: "NOEXISTE" }} />)

    await waitFor(() => {
      expect(screen.getByText("No se encontró el coche con matrícula NOEXISTE")).toBeInTheDocument()
    })

    expect(screen.getByText("Volver a la lista de coches")).toBeInTheDocument()
  })
})
