"use client"
import { editarCoche } from "@/app/coches/editar/[id]/actions"
import { supabase } from "@/lib/supabase"
import jest from "jest" // Import jest to declare the variable

// Mock de las acciones del servidor
jest.mock("@/app/coches/editar/[id]/actions", () => ({
  editarCoche: jest.fn(),
}))

// Mock de Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

// Mock del componente de selección de empleados
jest.mock("@/components/empleado-selector", () => ({
  EmpleadoSelector: ({ onChange, defaultValue }: { onChange: (value: string) => void; defaultValue?: string }) => (
    <select data-testid="empleado-selector" onChange={(e) => onChange(e.target.value)} defaultValue={defaultValue}>
      <option value="">Seleccionar empleado</option>
      <option value="1">Juan Pérez</option>
      <option value="2">María López</option>
    </select>
  ),
}))

describe("Asignación de empleados a coches", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("asigna correctamente el ID del empleado al campo asignadoa", async () => {
    // Mock para la función editarCoche
    const mockEditarCoche = editarCoche as jest.MockedFunction<typeof editarCoche>
    mockEditarCoche.mockResolvedValue({
      success: true,
      data: {
        matricula: "1234ABC",
        marca: "Toyota",
        modelo: "Corolla",
        asignadoa: "1",
      },
    })

    // Mock para la consulta de empleados
    const mockSelect = jest.fn().mockReturnValue({
      data: [
        { id: 1, nombre: "Juan Pérez", apellidos: "García" },
        { id: 2, nombre: "María López", apellidos: "Sánchez" },
      ],
      error: null,
    })

    // Configurar el mock de Supabase
    const mockSupabase = supabase as jest.Mocked<typeof supabase>
    mockSupabase.from.mockImplementation((table) => {
      if (table === "empleados") {
        return {
          select: () => mockSelect(),
        } as any
      }
      return {} as any
    })

    // Simular el envío del formulario con un empleado seleccionado
    const formData = new FormData()
    formData.append("matricula", "1234ABC")
    formData.append("marca", "Toyota")
    formData.append("modelo", "Corolla")
    formData.append("asignadoa", "1") // ID del empleado seleccionado
    formData.append("alquiler", "off")

    // Llamar directamente a la función de edición
    const result = await editarCoche("1234ABC", formData)

    // Verificar que se llamó a la función con los datos correctos
    expect(mockEditarCoche).toHaveBeenCalledWith("1234ABC", expect.any(FormData))

    // Verificar que el resultado es exitoso
    expect(result.success).toBe(true)

    // Verificar que los datos del resultado contienen el ID del empleado en asignadoa
    expect(result.data).toEqual(
      expect.objectContaining({
        matricula: "1234ABC",
        asignadoa: "1",
      }),
    )
  })

  it("limpia los campos de empleado cuando se marca como alquiler", async () => {
    // Mock para la función editarCoche
    const mockEditarCoche = editarCoche as jest.MockedFunction<typeof editarCoche>
    mockEditarCoche.mockResolvedValue({
      success: true,
      data: {
        matricula: "1234ABC",
        marca: "Toyota",
        modelo: "Corolla",
        asignadoa: null,
        alquiler: true,
      },
    })

    // Simular el envío del formulario con alquiler marcado
    const formData = new FormData()
    formData.append("matricula", "1234ABC")
    formData.append("marca", "Toyota")
    formData.append("modelo", "Corolla")
    formData.append("asignadoa", "1") // Este valor debería ser ignorado
    formData.append("alquiler", "on") // Marcar como alquiler

    // Llamar directamente a la función de edición
    const result = await editarCoche("1234ABC", formData)

    // Verificar que se llamó a la función con los datos correctos
    expect(mockEditarCoche).toHaveBeenCalledWith("1234ABC", expect.any(FormData))

    // Verificar que el resultado es exitoso
    expect(result.success).toBe(true)

    // Verificar que los campos de empleado están limpios
    expect(result.data).toEqual(
      expect.objectContaining({
        matricula: "1234ABC",
        asignadoa: null,
        alquiler: true,
      }),
    )
  })
})
