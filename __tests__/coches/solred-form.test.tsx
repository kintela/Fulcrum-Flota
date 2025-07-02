import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useRouter } from "next/navigation"
import NuevoCochePage from "@/app/coches/nuevo/page"
import EditarCochePage from "@/app/coches/editar/[id]/page"
import { crearCoche } from "@/app/coches/nuevo/actions"
import { editarCoche, obtenerCoche } from "@/app/coches/editar/[id]/actions"
import { obtenerEmpleados } from "@/app/actions/empleados"
import { obtenerTarjetasSolred } from "@/app/actions/solred"
import jest from "jest"

// Mock useRouter
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}))

// Mock las Server Actions
jest.mock("@/app/coches/nuevo/actions", () => ({
  crearCoche: jest.fn(),
}))

jest.mock("@/app/coches/editar/[id]/actions", () => ({
  editarCoche: jest.fn(),
  obtenerCoche: jest.fn(),
}))

jest.mock("@/app/actions/empleados", () => ({
  obtenerEmpleados: jest.fn(),
}))

jest.mock("@/app/actions/solred", () => ({
  obtenerTarjetasSolred: jest.fn(),
}))

const mockPush = jest.fn()
const mockCrearCoche = crearCoche as jest.MockedFunction<typeof crearCoche>
const mockEditarCoche = editarCoche as jest.MockedFunction<typeof editarCoche>
const mockObtenerCoche = obtenerCoche as jest.MockedFunction<typeof obtenerCoche>
const mockObtenerEmpleados = obtenerEmpleados as jest.MockedFunction<typeof obtenerEmpleados>
const mockObtenerTarjetasSolred = obtenerTarjetasSolred as jest.MockedFunction<typeof obtenerTarjetasSolred>

const mockTarjetasSolred = [
  { numero_tarjeta: "1234567890", pin: "1234", fechavencimiento: "2025-12-31", activa: true },
  { numero_tarjeta: "0987654321", pin: "5678", fechavencimiento: "2026-06-30", activa: true },
]

const mockCoche = {
  matricula: "1234ABC",
  marca: "Toyota",
  modelo: "Corolla",
  color: "Blanco",
  tarjeta_solred: {
    numero_tarjeta: "1234567890",
    pin: "1234",
    fechavencimiento: "2025-12-31",
  },
}

describe("Formularios SOLRED", () => {
  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    mockCrearCoche.mockClear()
    mockEditarCoche.mockClear()
    mockObtenerCoche.mockClear()
    mockObtenerEmpleados.mockClear()
    mockObtenerTarjetasSolred.mockClear()
    mockPush.mockClear()

    mockObtenerEmpleados.mockResolvedValue([])
    mockObtenerTarjetasSolred.mockResolvedValue(mockTarjetasSolred)
  })

  describe("Formulario Nuevo Coche", () => {
    it("muestra la sección de tarjeta SOLRED", async () => {
      render(<NuevoCochePage />)

      await waitFor(() => {
        expect(screen.getByText("Tarjeta SOLRED")).toBeInTheDocument()
      })

      expect(screen.getByLabelText("Número de Tarjeta")).toBeInTheDocument()
      expect(screen.getByText("Sin tarjeta asignada")).toBeInTheDocument()
    })

    it("carga las tarjetas SOLRED disponibles", async () => {
      render(<NuevoCochePage />)

      await waitFor(() => {
        expect(screen.getByText("1234567890 - PIN: 1234 - Vence: 2025-12-31")).toBeInTheDocument()
      })

      expect(screen.getByText("0987654321 - PIN: 5678 - Vence: 2026-06-30")).toBeInTheDocument()
    })

    it("envía el formulario con tarjeta SOLRED seleccionada", async () => {
      mockCrearCoche.mockResolvedValue({ success: true, data: { id: 1 } })

      render(<NuevoCochePage />)

      // Esperar a que se carguen las tarjetas
      await waitFor(() => {
        expect(screen.getByText("1234567890 - PIN: 1234 - Vence: 2025-12-31")).toBeInTheDocument()
      })

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

      // Seleccionar tarjeta SOLRED
      fireEvent.change(screen.getByLabelText("Número de Tarjeta"), {
        target: { value: "1234567890" },
      })

      // Enviar formulario
      fireEvent.click(screen.getByRole("button", { name: "Crear Coche" }))

      await waitFor(() => {
        expect(mockCrearCoche).toHaveBeenCalledWith(expect.any(FormData))
      })

      // Verificar que se envió la tarjeta SOLRED
      const formData = mockCrearCoche.mock.calls[0][0] as FormData
      expect(formData.get("numero_tarjeta_solred")).toBe("1234567890")
    })
  })

  describe("Formulario Editar Coche", () => {
    it("muestra la tarjeta SOLRED asignada", async () => {
      mockObtenerCoche.mockResolvedValue(mockCoche)

      render(<EditarCochePage params={{ id: "1234ABC" }} />)

      await waitFor(() => {
        expect(screen.getByText("Tarjeta SOLRED")).toBeInTheDocument()
      })

      expect(screen.getByText("PIN Actual")).toBeInTheDocument()
      expect(screen.getByText("1234")).toBeInTheDocument()
      expect(screen.getByText("Fecha Vencimiento")).toBeInTheDocument()
      expect(screen.getByText("2025-12-31")).toBeInTheDocument()
    })

    it("permite cambiar la tarjeta SOLRED asignada", async () => {
      mockObtenerCoche.mockResolvedValue(mockCoche)
      mockEditarCoche.mockResolvedValue({ success: true, data: mockCoche })

      render(<EditarCochePage params={{ id: "1234ABC" }} />)

      // Esperar a que se carguen los datos
      await waitFor(() => {
        expect(screen.getByDisplayValue("1234ABC")).toBeInTheDocument()
      })

      // Cambiar tarjeta SOLRED
      fireEvent.change(screen.getByLabelText("Número de Tarjeta"), {
        target: { value: "0987654321" },
      })

      // Enviar formulario
      fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }))

      await waitFor(() => {
        expect(mockEditarCoche).toHaveBeenCalledWith("1234ABC", expect.any(FormData))
      })

      // Verificar que se envió la nueva tarjeta
      const formData = mockEditarCoche.mock.calls[0][1] as FormData
      expect(formData.get("numero_tarjeta_solred")).toBe("0987654321")
    })

    it("permite quitar la tarjeta SOLRED asignada", async () => {
      mockObtenerCoche.mockResolvedValue(mockCoche)
      mockEditarCoche.mockResolvedValue({ success: true, data: mockCoche })

      render(<EditarCochePage params={{ id: "1234ABC" }} />)

      // Esperar a que se carguen los datos
      await waitFor(() => {
        expect(screen.getByDisplayValue("1234ABC")).toBeInTheDocument()
      })

      // Quitar tarjeta SOLRED
      fireEvent.change(screen.getByLabelText("Número de Tarjeta"), {
        target: { value: "" },
      })

      // Enviar formulario
      fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }))

      await waitFor(() => {
        expect(mockEditarCoche).toHaveBeenCalledWith("1234ABC", expect.any(FormData))
      })

      // Verificar que se envió sin tarjeta
      const formData = mockEditarCoche.mock.calls[0][1] as FormData
      expect(formData.get("numero_tarjeta_solred")).toBe("")
    })
  })
})
