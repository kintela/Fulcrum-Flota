import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SolredManager } from "@/components/solred-manager"
import { crearTarjetaSolred } from "@/app/actions/solred"
import { jest } from "@jest/globals"

// Mock de las acciones de SOLRED
jest.mock("@/app/actions/solred", () => ({
  crearTarjetaSolred: jest.fn(),
}))

const mockCrearTarjetaSolred = crearTarjetaSolred as jest.MockedFunction<typeof crearTarjetaSolred>

describe("SolredManager", () => {
  const mockTarjetas = [
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
  ]

  const mockSetTarjetasSolred = jest.fn()
  const mockSetTarjetaSeleccionada = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renderiza correctamente con tarjetas existentes", () => {
    render(
      <SolredManager
        tarjetasSolred={mockTarjetas}
        setTarjetasSolred={mockSetTarjetasSolred}
        tarjetaSeleccionada=""
        setTarjetaSeleccionada={mockSetTarjetaSeleccionada}
      />,
    )

    // Verificar que el selector de tarjetas existentes se muestra
    expect(screen.getByLabelText("Seleccionar Tarjeta Existente")).toBeInTheDocument()

    // Verificar que las tarjetas existentes están en el desplegable
    const selector = screen.getByLabelText("Seleccionar Tarjeta Existente") as HTMLSelectElement
    expect(selector.options.length).toBe(3) // 2 tarjetas + opción "Sin tarjeta asignada"
    expect(selector.options[1].value).toBe("12345678901234567")
    expect(selector.options[2].value).toBe("76543210987654321")

    // Verificar que los campos para nueva tarjeta están presentes
    expect(screen.getByLabelText("Número de Tarjeta (17 dígitos)")).toBeInTheDocument()
    expect(screen.getByLabelText("PIN (4 dígitos)")).toBeInTheDocument()
    expect(screen.getByLabelText("Fecha de Vencimiento")).toBeInTheDocument()
    expect(screen.getByText("Añadir Tarjeta")).toBeInTheDocument()
  })

  it("el botón de añadir está deshabilitado cuando los campos están vacíos", () => {
    render(
      <SolredManager
        tarjetasSolred={mockTarjetas}
        setTarjetasSolred={mockSetTarjetasSolred}
        tarjetaSeleccionada=""
        setTarjetaSeleccionada={mockSetTarjetaSeleccionada}
      />,
    )

    const botonAnadir = screen.getByText("Añadir Tarjeta")
    expect(botonAnadir).toBeDisabled()
  })

  it("el botón de añadir está deshabilitado cuando los campos están incompletos", async () => {
    render(
      <SolredManager
        tarjetasSolred={mockTarjetas}
        setTarjetasSolred={mockSetTarjetasSolred}
        tarjetaSeleccionada=""
        setTarjetaSeleccionada={mockSetTarjetaSeleccionada}
      />,
    )

    // Rellenar solo el número de tarjeta
    const numeroInput = screen.getByLabelText("Número de Tarjeta (17 dígitos)")
    fireEvent.change(numeroInput, { target: { value: "11112222333344445" } })

    // El botón debe seguir deshabilitado
    const botonAnadir = screen.getByText("Añadir Tarjeta")
    expect(botonAnadir).toBeDisabled()
  })

  it("el botón de añadir se habilita cuando todos los campos están correctamente rellenados", async () => {
    render(
      <SolredManager
        tarjetasSolred={mockTarjetas}
        setTarjetasSolred={mockSetTarjetasSolred}
        tarjetaSeleccionada=""
        setTarjetaSeleccionada={mockSetTarjetaSeleccionada}
      />,
    )

    // Rellenar todos los campos
    const numeroInput = screen.getByLabelText("Número de Tarjeta (17 dígitos)")
    const pinInput = screen.getByLabelText("PIN (4 dígitos)")
    const fechaInput = screen.getByLabelText("Fecha de Vencimiento")

    fireEvent.change(numeroInput, { target: { value: "11112222333344445" } })
    fireEvent.change(pinInput, { target: { value: "5678" } })
    fireEvent.change(fechaInput, { target: { value: "2027-12-31" } })

    // El botón debe estar habilitado
    const botonAnadir = screen.getByText("Añadir Tarjeta")
    expect(botonAnadir).toBeEnabled()
  })

  it("filtra caracteres no numéricos en los campos de número y PIN", async () => {
    render(
      <SolredManager
        tarjetasSolred={mockTarjetas}
        setTarjetasSolred={mockSetTarjetasSolred}
        tarjetaSeleccionada=""
        setTarjetaSeleccionada={mockSetTarjetaSeleccionada}
      />,
    )

    // Intentar introducir caracteres no numéricos
    const numeroInput = screen.getByLabelText("Número de Tarjeta (17 dígitos)") as HTMLInputElement
    const pinInput = screen.getByLabelText("PIN (4 dígitos)") as HTMLInputElement

    fireEvent.change(numeroInput, { target: { value: "1234abc5678def90" } })
    fireEvent.change(pinInput, { target: { value: "12xy" } })

    // Verificar que solo se han guardado los dígitos
    expect(numeroInput.value).toBe("1234567890")
    expect(pinInput.value).toBe("12")
  })

  it("limita la longitud de los campos de número y PIN", async () => {
    render(
      <SolredManager
        tarjetasSolred={mockTarjetas}
        setTarjetasSolred={mockSetTarjetasSolred}
        tarjetaSeleccionada=""
        setTarjetaSeleccionada={mockSetTarjetaSeleccionada}
      />,
    )

    // Intentar introducir más caracteres de los permitidos
    const numeroInput = screen.getByLabelText("Número de Tarjeta (17 dígitos)") as HTMLInputElement
    const pinInput = screen.getByLabelText("PIN (4 dígitos)") as HTMLInputElement

    fireEvent.change(numeroInput, { target: { value: "123456789012345678901234" } })
    fireEvent.change(pinInput, { target: { value: "123456789" } })

    // Verificar que se ha limitado la longitud
    expect(numeroInput.value).toBe("12345678901234567")
    expect(pinInput.value).toBe("1234")
  })

  it("crea una nueva tarjeta y actualiza el desplegable", async () => {
    // Mock de respuesta exitosa
    mockCrearTarjetaSolred.mockResolvedValue({
      success: true,
      data: {
        numero_tarjeta: "99999888887777666",
        pin: "9876",
        fechavencimiento: "2028-10-15",
        activa: true,
      },
    })

    render(
      <SolredManager
        tarjetasSolred={mockTarjetas}
        setTarjetasSolred={mockSetTarjetasSolred}
        tarjetaSeleccionada=""
        setTarjetaSeleccionada={mockSetTarjetaSeleccionada}
      />,
    )

    // Rellenar todos los campos
    const numeroInput = screen.getByLabelText("Número de Tarjeta (17 dígitos)")
    const pinInput = screen.getByLabelText("PIN (4 dígitos)")
    const fechaInput = screen.getByLabelText("Fecha de Vencimiento")

    fireEvent.change(numeroInput, { target: { value: "99999888887777666" } })
    fireEvent.change(pinInput, { target: { value: "9876" } })
    fireEvent.change(fechaInput, { target: { value: "2028-10-15" } })

    // Hacer clic en el botón de añadir
    const botonAnadir = screen.getByText("Añadir Tarjeta")
    fireEvent.click(botonAnadir)

    // Verificar que se ha llamado a la función de crear tarjeta
    await waitFor(() => {
      expect(mockCrearTarjetaSolred).toHaveBeenCalledWith("99999888887777666", "9876", "2028-10-15")
    })

    // Verificar que se ha actualizado la lista de tarjetas
    await waitFor(() => {
      expect(mockSetTarjetasSolred).toHaveBeenCalled()
      const nuevasTarjetas = mockSetTarjetasSolred.mock.calls[0][0]
      expect(nuevasTarjetas.length).toBe(3) // Las 2 originales + la nueva
      expect(nuevasTarjetas[2].numero_tarjeta).toBe("99999888887777666")
    })

    // Verificar que se ha seleccionado la nueva tarjeta
    await waitFor(() => {
      expect(mockSetTarjetaSeleccionada).toHaveBeenCalledWith("99999888887777666")
    })

    // Verificar que se muestra el mensaje de éxito
    await waitFor(() => {
      expect(screen.getByText("Operación exitosa")).toBeInTheDocument()
      expect(screen.getByText("Tarjeta SOLRED creada y seleccionada correctamente")).toBeInTheDocument()
    })

    // Verificar que los campos se han limpiado
    await waitFor(() => {
      expect(numeroInput).toHaveValue("")
      expect(pinInput).toHaveValue("")
      expect(fechaInput).toHaveValue("")
    })
  })

  it("muestra un mensaje de error cuando falla la creación de la tarjeta", async () => {
    // Mock de respuesta con error
    mockCrearTarjetaSolred.mockResolvedValue({
      success: false,
      error: "Ya existe una tarjeta con ese número",
    })

    render(
      <SolredManager
        tarjetasSolred={mockTarjetas}
        setTarjetasSolred={mockSetTarjetasSolred}
        tarjetaSeleccionada=""
        setTarjetaSeleccionada={mockSetTarjetaSeleccionada}
      />,
    )

    // Rellenar todos los campos
    const numeroInput = screen.getByLabelText("Número de Tarjeta (17 dígitos)")
    const pinInput = screen.getByLabelText("PIN (4 dígitos)")
    const fechaInput = screen.getByLabelText("Fecha de Vencimiento")

    fireEvent.change(numeroInput, { target: { value: "12345678901234567" } }) // Número que ya existe
    fireEvent.change(pinInput, { target: { value: "9876" } })
    fireEvent.change(fechaInput, { target: { value: "2028-10-15" } })

    // Hacer clic en el botón de añadir
    const botonAnadir = screen.getByText("Añadir Tarjeta")
    fireEvent.click(botonAnadir)

    // Verificar que se muestra el mensaje de error
    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument()
      expect(screen.getByText("Ya existe una tarjeta con ese número")).toBeInTheDocument()
    })

    // Verificar que no se ha actualizado la lista de tarjetas
    expect(mockSetTarjetasSolred).not.toHaveBeenCalled()
    expect(mockSetTarjetaSeleccionada).not.toHaveBeenCalled()
  })

  it("permite seleccionar una tarjeta existente del desplegable", async () => {
    render(
      <SolredManager
        tarjetasSolred={mockTarjetas}
        setTarjetasSolred={mockSetTarjetasSolred}
        tarjetaSeleccionada=""
        setTarjetaSeleccionada={mockSetTarjetaSeleccionada}
      />,
    )

    // Seleccionar una tarjeta del desplegable
    const selector = screen.getByLabelText("Seleccionar Tarjeta Existente")
    fireEvent.change(selector, { target: { value: "76543210987654321" } })

    // Verificar que se ha llamado a la función de selección
    expect(mockSetTarjetaSeleccionada).toHaveBeenCalledWith("76543210987654321")
  })
})
