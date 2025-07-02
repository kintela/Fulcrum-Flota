import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SeguroManager } from "@/components/seguro-manager"
import { obtenerHistorialSeguros, crearSeguro, actualizarSeguro, eliminarSeguro } from "@/app/actions/seguros"
import jest from "jest"

// Mock de las acciones del servidor
jest.mock("@/app/actions/seguros", () => ({
  obtenerHistorialSeguros: jest.fn(),
  crearSeguro: jest.fn(),
  actualizarSeguro: jest.fn(),
  eliminarSeguro: jest.fn(),
}))

// Mock de confirm para pruebas de eliminación
global.confirm = jest.fn(() => true)

const mockObtenerHistorialSeguros = obtenerHistorialSeguros as jest.MockedFunction<typeof obtenerHistorialSeguros>
const mockCrearSeguro = crearSeguro as jest.MockedFunction<typeof crearSeguro>
const mockActualizarSeguro = actualizarSeguro as jest.MockedFunction<typeof actualizarSeguro>
const mockEliminarSeguro = eliminarSeguro as jest.MockedFunction<typeof eliminarSeguro>

const mockSeguros = [
  {
    id: 1,
    matricula: "1234ABC",
    numero_poliza: "POL-12345",
    fecha_contratacion: "2023-01-01",
    fecha_vencimiento: "2024-01-01",
    compania: "Mapfre",
    tipo: "Todo Riesgo",
    importe_anual: 500,
    telefono_asistencia1: "900123456",
    telefono_asistencia2: "900654321",
    observaciones: "Observaciones de prueba",
    activo: true,
  },
  {
    id: 2,
    matricula: "1234ABC",
    numero_poliza: "POL-67890",
    fecha_contratacion: "2022-01-01",
    fecha_vencimiento: "2023-01-01",
    compania: "Allianz",
    tipo: "Terceros",
    importe_anual: 300,
    telefono_asistencia1: "900111222",
    telefono_asistencia2: null,
    observaciones: "",
    activo: false,
  },
]

describe("SeguroManager", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockObtenerHistorialSeguros.mockResolvedValue({
      success: true,
      data: mockSeguros,
    })
    mockCrearSeguro.mockResolvedValue({
      success: true,
      data: mockSeguros[0],
    })
    mockActualizarSeguro.mockResolvedValue({
      success: true,
      data: { ...mockSeguros[0], compania: "Actualizada" },
    })
    mockEliminarSeguro.mockResolvedValue({
      success: true,
    })
  })

  it("muestra mensaje cuando no hay matrícula", () => {
    render(<SeguroManager matricula="" isEditing={true} />)
    expect(screen.getByText("Guarda el coche primero para poder gestionar los seguros")).toBeInTheDocument()
  })

  it("carga y muestra la lista de seguros correctamente", async () => {
    render(<SeguroManager matricula="1234ABC" isEditing={true} />)

    // Inicialmente muestra el estado de carga
    expect(screen.getByText("Cargando seguros...")).toBeInTheDocument()

    // Espera a que se carguen los seguros
    await waitFor(() => {
      expect(mockObtenerHistorialSeguros).toHaveBeenCalledWith("1234ABC")
      expect(screen.getByText("Mapfre - POL-12345")).toBeInTheDocument()
      expect(screen.getByText("Allianz - POL-67890")).toBeInTheDocument()
    })

    // Verifica que se muestre el badge de activo solo en el seguro activo
    expect(screen.getByText("Activo")).toBeInTheDocument()

    // Verifica que se muestren los tipos de seguro
    expect(screen.getByText("Todo Riesgo")).toBeInTheDocument()
    expect(screen.getByText("Terceros")).toBeInTheDocument()

    // Verifica que se muestren los teléfonos de asistencia
    expect(screen.getByText("900123456")).toBeInTheDocument()
  })

  it("muestra mensaje cuando no hay seguros", async () => {
    mockObtenerHistorialSeguros.mockResolvedValue({
      success: true,
      data: [],
    })

    render(<SeguroManager matricula="5678DEF" isEditing={true} />)

    await waitFor(() => {
      expect(screen.getByText("No hay seguros registrados para este vehículo")).toBeInTheDocument()
    })
  })

  it("muestra el formulario para crear un nuevo seguro", async () => {
    render(<SeguroManager matricula="1234ABC" isEditing={true} />)

    await waitFor(() => {
      expect(screen.getByText("Nuevo Seguro")).toBeInTheDocument()
    })

    // Click en el botón para mostrar el formulario
    fireEvent.click(screen.getByText("Nuevo Seguro"))

    // Verifica que se muestre el formulario
    expect(screen.getByLabelText("Número de Póliza *")).toBeInTheDocument()
    expect(screen.getByLabelText("Compañía Aseguradora *")).toBeInTheDocument()
    expect(screen.getByLabelText("Fecha de Contratación *")).toBeInTheDocument()
    expect(screen.getByLabelText("Fecha de Vencimiento *")).toBeInTheDocument()
    expect(screen.getByLabelText("Tipo de Seguro")).toBeInTheDocument()
    expect(screen.getByLabelText("Importe Anual (€)")).toBeInTheDocument()
    expect(screen.getByLabelText("Teléfono de Asistencia")).toBeInTheDocument()
    expect(screen.getByLabelText("Teléfono de Asistencia Alternativo")).toBeInTheDocument()
    expect(screen.getByLabelText("Observaciones")).toBeInTheDocument()
    expect(screen.getByLabelText("Póliza activa actualmente")).toBeInTheDocument()
  })

  it("crea un nuevo seguro correctamente", async () => {
    render(<SeguroManager matricula="1234ABC" isEditing={true} />)

    await waitFor(() => {
      expect(screen.getByText("Nuevo Seguro")).toBeInTheDocument()
    })

    // Click en el botón para mostrar el formulario
    fireEvent.click(screen.getByText("Nuevo Seguro"))

    // Rellenar el formulario
    fireEvent.change(screen.getByLabelText("Número de Póliza *"), { target: { value: "POL-TEST" } })
    fireEvent.change(screen.getByLabelText("Compañía Aseguradora *"), { target: { value: "Test Insurance" } })
    fireEvent.change(screen.getByLabelText("Fecha de Contratación *"), { target: { value: "2023-06-01" } })
    fireEvent.change(screen.getByLabelText("Fecha de Vencimiento *"), { target: { value: "2024-06-01" } })
    fireEvent.change(screen.getByLabelText("Importe Anual (€)"), { target: { value: "450" } })
    fireEvent.change(screen.getByLabelText("Teléfono de Asistencia"), { target: { value: "900999888" } })
    fireEvent.change(screen.getByLabelText("Observaciones"), {
      target: { value: "Observaciones de prueba para el test" },
    })

    // Enviar el formulario
    fireEvent.click(screen.getByRole("button", { name: "Crear" }))

    await waitFor(() => {
      expect(mockCrearSeguro).toHaveBeenCalled()
      const formData = mockCrearSeguro.mock.calls[0][0] as FormData
      expect(formData.get("numero_poliza")).toBe("POL-TEST")
      expect(formData.get("compania")).toBe("Test Insurance")
      expect(formData.get("fecha_contratacion")).toBe("2023-06-01")
      expect(formData.get("fecha_vencimiento")).toBe("2024-06-01")
      expect(formData.get("importe_anual")).toBe("450")
      expect(formData.get("telefono_asistencia")).toBe("900999888")
      expect(formData.get("observaciones")).toBe("Observaciones de prueba para el test")
      expect(formData.get("activo")).toBe("on")
    })

    // Verifica que se haya recargado la lista de seguros
    expect(mockObtenerHistorialSeguros).toHaveBeenCalledTimes(2)
  })

  it("valida los campos obligatorios al crear un seguro", async () => {
    render(<SeguroManager matricula="1234ABC" isEditing={true} />)

    await waitFor(() => {
      expect(screen.getByText("Nuevo Seguro")).toBeInTheDocument()
    })

    // Click en el botón para mostrar el formulario
    fireEvent.click(screen.getByText("Nuevo Seguro"))

    // Enviar el formulario sin rellenar campos obligatorios
    fireEvent.click(screen.getByRole("button", { name: "Crear" }))

    await waitFor(() => {
      expect(
        screen.getByText(
          "Los campos número de póliza, fecha de contratación, fecha de vencimiento y compañía son obligatorios",
        ),
      ).toBeInTheDocument()
    })

    // Verifica que no se haya llamado a crearSeguro
    expect(mockCrearSeguro).not.toHaveBeenCalled()
  })

  it("edita un seguro existente correctamente", async () => {
    render(<SeguroManager matricula="1234ABC" isEditing={true} />)

    await waitFor(() => {
      expect(screen.getByText("Mapfre - POL-12345")).toBeInTheDocument()
    })

    // Buscar y hacer clic en el botón de editar del primer seguro
    const editButtons = screen.getAllByRole("button")
    const editButton = editButtons.find((button) => button.innerHTML.includes("Edit2"))
    fireEvent.click(editButton!)

    // Verificar que se carguen los datos del seguro en el formulario
    await waitFor(() => {
      expect(screen.getByDisplayValue("POL-12345")).toBeInTheDocument()
      expect(screen.getByDisplayValue("Mapfre")).toBeInTheDocument()
    })

    // Modificar algunos campos
    fireEvent.change(screen.getByDisplayValue("Mapfre"), { target: { value: "Mapfre Actualizada" } })
    fireEvent.change(screen.getByDisplayValue("900123456"), { target: { value: "900123457" } })

    // Enviar el formulario
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }))

    await waitFor(() => {
      expect(mockActualizarSeguro).toHaveBeenCalled()
      const id = mockActualizarSeguro.mock.calls[0][0]
      const formData = mockActualizarSeguro.mock.calls[0][1] as FormData
      expect(id).toBe(1) // ID del seguro que estamos editando
      expect(formData.get("compania")).toBe("Mapfre Actualizada")
      expect(formData.get("telefono_asistencia")).toBe("900123457")
    })

    // Verifica que se haya recargado la lista de seguros
    expect(mockObtenerHistorialSeguros).toHaveBeenCalledTimes(2)
  })

  it("elimina un seguro correctamente", async () => {
    render(<SeguroManager matricula="1234ABC" isEditing={true} />)

    await waitFor(() => {
      expect(screen.getByText("Mapfre - POL-12345")).toBeInTheDocument()
    })

    // Buscar y hacer clic en el botón de eliminar del primer seguro
    const deleteButtons = screen.getAllByRole("button")
    const deleteButton = deleteButtons.find((button) => button.innerHTML.includes("Trash2"))
    fireEvent.click(deleteButton!)

    await waitFor(() => {
      expect(mockEliminarSeguro).toHaveBeenCalledWith(1, "1234ABC")
    })

    // Verifica que se haya recargado la lista de seguros
    expect(mockObtenerHistorialSeguros).toHaveBeenCalledTimes(2)
  })

  it("maneja errores al cargar seguros", async () => {
    mockObtenerHistorialSeguros.mockResolvedValue({
      success: false,
      error: "Error al cargar los seguros",
    })

    render(<SeguroManager matricula="1234ABC" isEditing={true} />)

    await waitFor(() => {
      expect(screen.getByText("Error al cargar los seguros")).toBeInTheDocument()
    })
  })

  it("maneja errores al crear un seguro", async () => {
    mockCrearSeguro.mockResolvedValue({
      success: false,
      error: "Error al crear el seguro",
    })

    render(<SeguroManager matricula="1234ABC" isEditing={true} />)

    await waitFor(() => {
      expect(screen.getByText("Nuevo Seguro")).toBeInTheDocument()
    })

    // Click en el botón para mostrar el formulario
    fireEvent.click(screen.getByText("Nuevo Seguro"))

    // Rellenar el formulario con datos válidos
    fireEvent.change(screen.getByLabelText("Número de Póliza *"), { target: { value: "POL-TEST" } })
    fireEvent.change(screen.getByLabelText("Compañía Aseguradora *"), { target: { value: "Test Insurance" } })
    fireEvent.change(screen.getByLabelText("Fecha de Contratación *"), { target: { value: "2023-06-01" } })
    fireEvent.change(screen.getByLabelText("Fecha de Vencimiento *"), { target: { value: "2024-06-01" } })

    // Enviar el formulario
    fireEvent.click(screen.getByRole("button", { name: "Crear" }))

    await waitFor(() => {
      expect(screen.getByText("Error al crear el seguro")).toBeInTheDocument()
    })
  })

  it("no muestra el botón de nuevo seguro cuando no está en modo edición", async () => {
    render(<SeguroManager matricula="1234ABC" isEditing={false} />)

    await waitFor(() => {
      expect(screen.getByText("Mapfre - POL-12345")).toBeInTheDocument()
    })

    expect(screen.queryByText("Nuevo Seguro")).not.toBeInTheDocument()
  })

  it("muestra correctamente los seguros vencidos", async () => {
    const fechaVencida = new Date()
    fechaVencida.setFullYear(fechaVencida.getFullYear() - 1) // Un año en el pasado
    const fechaVencidaStr = fechaVencida.toISOString().split("T")[0]

    mockObtenerHistorialSeguros.mockResolvedValue({
      success: true,
      data: [
        {
          ...mockSeguros[0],
          fecha_vencimiento: fechaVencidaStr,
        },
      ],
    })

    render(<SeguroManager matricula="1234ABC" isEditing={true} />)

    await waitFor(() => {
      expect(screen.getByText("Vencido")).toBeInTheDocument()
    })
  })
})
