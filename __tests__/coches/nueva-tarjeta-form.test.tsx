import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useRouter } from "next/navigation"
import NuevoCochePage from "@/app/coches/nuevo/page"
import { crearCoche } from "@/app/coches/nuevo/actions"
import { obtenerEmpleados } from "@/app/actions/empleados"
import { obtenerTarjetasSolred } from "@/app/actions/solred"
import { jest } from "@jest/globals"

// Mocks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}))

jest.mock("@/app/coches/nuevo/actions", () => ({
  crearCoche: jest.fn(),
}))

jest.mock("@/app/actions/empleados", () => ({
  obtenerEmpleados: jest.fn(),
}))

jest.mock("@/app/actions/solred", () => ({
  obtenerTarjetasSolred: jest.fn(),
}))

jest.mock("@/components/fotos-manager", () => ({
  FotosManager: () => <div data-testid="fotos-manager">FotosManager</div>,
}))

const mockPush = jest.fn()
const mockObtenerEmpleados = obtenerEmpleados as jest.Mock
const mockObtenerTarjetasSolred = obtenerTarjetasSolred as jest.Mock
const mockCrearCoche = crearCoche as jest.Mock

describe("NuevoCochePage - Nueva Tarjeta SOLRED", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    mockObtenerEmpleados.mockResolvedValue([])
    mockObtenerTarjetasSolred.mockResolvedValue([
      {
        numero_tarjeta: "11111111111111111",
        pin: "1111",
        fechavencimiento: "2025-12-31",
      },
    ])
  })

  it("debe mostrar campos para crear nueva tarjeta SOLRED", async () => {
    render(<NuevoCochePage />)

    await waitFor(() => {
      expect(screen.getByLabelText("Número de Tarjeta (17 dígitos)")).toBeInTheDocument()
      expect(screen.getByLabelText("PIN (4 dígitos)")).toBeInTheDocument()
      expect(screen.getByLabelText("Fecha de Vencimiento")).toBeInTheDocument()
    })
  })

  it("debe validar que el número de tarjeta solo contenga dígitos", async () => {
    render(<NuevoCochePage />)

    await waitFor(() => {
      const numeroInput = screen.getByLabelText("Número de Tarjeta (17 dígitos)")

      fireEvent.change(numeroInput, { target: { value: "1234ABC5678901234" } })

      // El input debe filtrar los caracteres no numéricos
      expect(numeroInput.value).toBe("12345678901234")
    })
  })

  it("debe validar que el PIN solo contenga dígitos", async () => {
    render(<NuevoCochePage />)

    await waitFor(() => {
      const pinInput = screen.getByLabelText("PIN (4 dígitos)")

      fireEvent.change(pinInput, { target: { value: "12AB" } })

      // El input debe filtrar los caracteres no numéricos
      expect(pinInput.value).toBe("12")
    })
  })

  it("debe limitar el número de tarjeta a 17 dígitos", async () => {
    render(<NuevoCochePage />)

    await waitFor(() => {
      const numeroInput = screen.getByLabelText("Número de Tarjeta (17 dígitos)")

      fireEvent.change(numeroInput, { target: { value: "123456789012345678901" } })

      expect(numeroInput.value).toBe("12345678901234567")
    })
  })

  it("debe limitar el PIN a 4 dígitos", async () => {
    render(<NuevoCochePage />)

    await waitFor(() => {
      const pinInput = screen.getByLabelText("PIN (4 dígitos)")

      fireEvent.change(pinInput, { target: { value: "123456" } })

      expect(pinInput.value).toBe("1234")
    })
  })

  it("debe enviar datos de nueva tarjeta al crear coche", async () => {
    mockCrearCoche.mockResolvedValue({ success: true })

    render(<NuevoCochePage />)

    await waitFor(() => {
      // Rellenar campos obligatorios del coche
      fireEvent.change(screen.getByLabelText("Matrícula *"), { target: { value: "1234ABC" } })
      fireEvent.change(screen.getByLabelText("Marca *"), { target: { value: "Toyota" } })
      fireEvent.change(screen.getByLabelText("Modelo *"), { target: { value: "Corolla" } })

      // Rellenar datos de nueva tarjeta
      fireEvent.change(screen.getByLabelText("Número de Tarjeta (17 dígitos)"), {
        target: { value: "12345678901234567" },
      })
      fireEvent.change(screen.getByLabelText("PIN (4 dígitos)"), {
        target: { value: "1234" },
      })
      fireEvent.change(screen.getByLabelText("Fecha de Vencimiento"), {
        target: { value: "2025-12-31" },
      })

      // Enviar formulario
      fireEvent.click(screen.getByText("Crear Coche"))
    })

    await waitFor(() => {
      expect(mockCrearCoche).toHaveBeenCalledWith(expect.any(FormData))

      const formData = mockCrearCoche.mock.calls[0][0] as FormData
      expect(formData.get("nueva_tarjeta_numero")).toBe("12345678901234567")
      expect(formData.get("nueva_tarjeta_pin")).toBe("1234")
      expect(formData.get("nueva_tarjeta_vencimiento")).toBe("2025-12-31")
    })
  })
})
