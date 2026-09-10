import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useRouter } from "next/navigation"
import EditarCochePage from "@/app/coches/editar/[id]/page"
import { obtenerCoche, actualizarCoche } from "@/app/coches/editar/[id]/actions"
import { obtenerEmpleados } from "@/app/actions/empleados"
import { obtenerTarjetasSolred, obtenerTarjetaAsignada, crearTarjetaSolred } from "@/app/actions/solred"
import { jest } from "@jest/globals"

// Mocks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useParams: jest.fn().mockReturnValue({ id: "3799-DZF" }),
}))

jest.mock("@/app/coches/editar/[id]/actions", () => ({
  obtenerCoche: jest.fn(),
  actualizarCoche: jest.fn(),
}))

jest.mock("@/app/actions/empleados", () => ({
  obtenerEmpleados: jest.fn(),
}))

jest.mock("@/app/actions/solred", () => ({
  obtenerTarjetasSolred: jest.fn(),
  obtenerTarjetaAsignada: jest.fn(),
  crearTarjetaSolred: jest.fn(),
  asignarTarjetaSolred: jest.fn(),
}))

jest.mock("@/components/fotos-manager", () => ({
  FotosManager: () => <div data-testid="fotos-manager">FotosManager</div>,
}))

jest.mock("@/components/itv-manager", () => ({
  ITVManager: () => <div data-testid="itv-manager">ITVManager</div>,
}))

const mockPush = jest.fn()
const mockObtenerCoche = obtenerCoche as jest.Mock
const mockActualizarCoche = actualizarCoche as jest.Mock
const mockObtenerEmpleados = obtenerEmpleados as jest.Mock
const mockObtenerTarjetasSolred = obtenerTarjetasSolred as jest.Mock
const mockObtenerTarjetaAsignada = obtenerTarjetaAsignada as jest.Mock
const mockCrearTarjetaSolred = crearTarjetaSolred as jest.Mock

describe("Integración de SolredManager en Editar Coche", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })

    // Mock de datos
    mockObtenerCoche.mockResolvedValue({
      id: 1,
      matricula: "3799-DZF",
      marca: "Toyota",
      modelo: "Corolla",
      ano: 2020,
      color: "Azul",
      kilometros: 50000,
      combustible: "Gasolina",
      estado: "Activo",
    })

    mockObtenerEmpleados.mockResolvedValue([
      { id: 1, nombre: "Juan Pérez", departamento: "Ventas" },
      { id: 2, nombre: "María López", departamento: "Marketing" },
    ])

    mockObtenerTarjetasSolred.mockResolvedValue([
      {
        numero_tarjeta: "12345678901234567",
        pin: "1234",
        fechavencimiento: "2025-12-31",
        activa: true,
      },
      {
        numero_tarjeta: "76543210987654321",
        pin: "4321",
        fechavencimiento: "2026-06-30",
        activa: true,
      },
    ])

    mockObtenerTarjetaAsignada.mockResolvedValue(null) // Sin tarjeta asignada inicialmente
  })

  it("permite crear y asignar una nueva tarjeta SOLRED", async () => {
    // Mock de respuesta exitosa para crear tarjeta
    mockCrearTarjetaSolred.mockResolvedValue({
      success: true,
      data: {
        numero_tarjeta: "99999888887777666",
        pin: "9876",
        fechavencimiento: "2028-10-15",
        activa: true,
      },
    })

    // Mock de respuesta exitosa para actualizar coche
    mockActualizarCoche.mockResolvedValue({ success: true })

    render(<EditarCochePage />)

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByLabelText("Marca *")).toBeInTheDocument()
    })

    // Verificar que el componente SolredManager está presente
    await waitFor(() => {
      expect(screen.getByLabelText("Seleccionar Tarjeta Existente")).toBeInTheDocument()
      expect(screen.getByLabelText("Número de Tarjeta (17 dígitos)")).toBeInTheDocument()
      expect(screen.getByLabelText("PIN (4 dígitos)")).toBeInTheDocument()
      expect(screen.getByLabelText("Fecha de Vencimiento")).toBeInTheDocument()
      expect(screen.getByText("Añadir Tarjeta")).toBeInTheDocument()
    })

    // Rellenar los campos de nueva tarjeta
    const numeroInput = screen.getByLabelText("Número de Tarjeta (17 dígitos)")
    const pinInput = screen.getByLabelText("PIN (4 dígitos)")
    const fechaInput = screen.getByLabelText("Fecha de Vencimiento")

    fireEvent.change(numeroInput, { target: { value: "99999888887777666" } })
    fireEvent.change(pinInput, { target: { value: "9876" } })
    fireEvent.change(fechaInput, { target: { value: "2028-10-15" } })

    // Hacer clic en el botón de añadir tarjeta
    const botonAnadir = screen.getByText("Añadir Tarjeta")
    fireEvent.click(botonAnadir)

    // Verificar que se ha llamado a la función de crear tarjeta
    await waitFor(() => {
      expect(mockCrearTarjetaSolred).toHaveBeenCalledWith("99999888887777666", "9876", "2028-10-15")
    })

    // Verificar que se muestra el mensaje de éxito
    await waitFor(() => {
      expect(screen.getByText("Operación exitosa")).toBeInTheDocument()
      expect(screen.getByText("Tarjeta SOLRED creada y seleccionada correctamente")).toBeInTheDocument()
    })

    // Verificar que la nueva tarjeta está seleccionada en el desplegable
    const selector = screen.getByLabelText("Seleccionar Tarjeta Existente") as HTMLSelectElement
    await waitFor(() => {
      expect(selector.value).toBe("99999888887777666")
    })

    // Guardar el formulario
    const botonGuardar = screen.getByText("Guardar Cambios")
    fireEvent.click(botonGuardar)

    // Verificar que se ha llamado a la función de actualizar coche con la nueva tarjeta
    await waitFor(() => {
      expect(mockActualizarCoche).toHaveBeenCalled()
      const formData = mockActualizarCoche.mock.calls[0][0] as FormData
      expect(formData.get("numero_tarjeta_solred")).toBe("99999888887777666")
    })
  })

  it("muestra un mensaje de error cuando falla la creación de la tarjeta", async () => {
    // Mock de respuesta con error
    mockCrearTarjetaSolred.mockResolvedValue({
      success: false,
      error: "Ya existe una tarjeta con ese número",
    })

    render(<EditarCochePage />)

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByLabelText("Marca *")).toBeInTheDocument()
    })

    // Rellenar los campos de nueva tarjeta
    const numeroInput = screen.getByLabelText("Número de Tarjeta (17 dígitos)")
    const pinInput = screen.getByLabelText("PIN (4 dígitos)")
    const fechaInput = screen.getByLabelText("Fecha de Vencimiento")

    fireEvent.change(numeroInput, { target: { value: "12345678901234567" } }) // Número que ya existe
    fireEvent.change(pinInput, { target: { value: "9876" } })
    fireEvent.change(fechaInput, { target: { value: "2028-10-15" } })

    // Hacer clic en el botón de añadir tarjeta
    const botonAnadir = screen.getByText("Añadir Tarjeta")
    fireEvent.click(botonAnadir)

    // Verificar que se muestra el mensaje de error
    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument()
      expect(screen.getByText("Ya existe una tarjeta con ese número")).toBeInTheDocument()
    })
  })

  it("muestra la tarjeta asignada actualmente", async () => {
    // Mock de tarjeta asignada
    mockObtenerTarjetaAsignada.mockResolvedValue({
      id: 1,
      numero_tarjeta: "12345678901234567",
      matricula: "3799-DZF",
      fecha_asignacion: "2023-01-01",
      fecha_desasignacion: null,
      activa: true,
      tarjetassolred: {
        numero_tarjeta: "12345678901234567",
        pin: "1234",
        fechavencimiento: "2025-12-31",
      },
    })

    render(<EditarCochePage />)

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByLabelText("Marca *")).toBeInTheDocument()
    })

    // Verificar que la tarjeta asignada está seleccionada en el desplegable
    const selector = screen.getByLabelText("Seleccionar Tarjeta Existente") as HTMLSelectElement
    await waitFor(() => {
      expect(selector.value).toBe("12345678901234567")
    })
  })

  it("permite seleccionar una tarjeta existente", async () => {
    mockActualizarCoche.mockResolvedValue({ success: true })

    render(<EditarCochePage />)

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByLabelText("Marca *")).toBeInTheDocument()
    })

    // Seleccionar una tarjeta del desplegable
    const selector = screen.getByLabelText("Seleccionar Tarjeta Existente")
    fireEvent.change(selector, { target: { value: "76543210987654321" } })

    // Guardar el formulario
    const botonGuardar = screen.getByText("Guardar Cambios")
    fireEvent.click(botonGuardar)

    // Verificar que se ha llamado a la función de actualizar coche con la tarjeta seleccionada
    await waitFor(() => {
      expect(mockActualizarCoche).toHaveBeenCalled()
      const formData = mockActualizarCoche.mock.calls[0][0] as FormData
      expect(formData.get("numero_tarjeta_solred")).toBe("76543210987654321")
    })
  })
})
