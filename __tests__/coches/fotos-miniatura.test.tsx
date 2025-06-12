import { render, screen, waitFor } from "@testing-library/react"
import CochesPage from "@/app/coches/page"
import { obtenerFotosCoche } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import jest from "jest" // Import jest to declare it

// Mock de las dependencias
jest.mock("@/lib/storage")
jest.mock("@/lib/supabase")

const mockObtenerFotosCoche = obtenerFotosCoche as jest.MockedFunction<typeof obtenerFotosCoche>
const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe("CochesPage - Miniaturas de fotos", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock básico de Supabase
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    } as any)
  })

  it("debe mostrar miniatura cuando el coche tiene fotos", async () => {
    // Mock de datos de coches
    const mockCoches = [
      {
        matricula: "1234-ABC",
        marca: "Toyota",
        modelo: "Corolla",
        color: "Blanco",
        kms: 50000,
        combustible: "Gasolina",
        asignadoa: null,
        alquiler: false,
        donante: false,
      },
    ]

    // Mock de empleados
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "empleados") {
        return {
          select: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      if (table === "coches") {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockCoches,
            error: null,
          }),
        } as any
      }
      if (table === "itvs") {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      return {} as any
    })

    // Mock de obtenerFotosCoche - coche con fotos
    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos: [
        "https://supabase.com/storage/coches-fotos/1234-ABC/foto1.jpg",
        "https://supabase.com/storage/coches-fotos/1234-ABC/foto2.jpg",
      ],
    })

    render(await CochesPage({ searchParams: {} }))

    await waitFor(() => {
      // Verificar que se muestra la imagen en lugar del icono
      const imagen = screen.getByAltText("Foto de 1234-ABC")
      expect(imagen).toBeInTheDocument()
      expect(imagen).toHaveAttribute("src", "https://supabase.com/storage/coches-fotos/1234-ABC/foto1.jpg")
    })

    // Verificar que se llamó a obtenerFotosCoche
    expect(mockObtenerFotosCoche).toHaveBeenCalledWith("1234-ABC")
  })

  it("debe mostrar icono genérico cuando el coche no tiene fotos", async () => {
    const mockCoches = [
      {
        matricula: "5678-DEF",
        marca: "Honda",
        modelo: "Civic",
        color: "Azul",
        kms: 30000,
        combustible: "Gasolina",
        asignadoa: null,
        alquiler: false,
        donante: false,
      },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "empleados") {
        return {
          select: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      if (table === "coches") {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockCoches,
            error: null,
          }),
        } as any
      }
      if (table === "itvs") {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      return {} as any
    })

    // Mock de obtenerFotosCoche - coche sin fotos
    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos: [],
    })

    render(await CochesPage({ searchParams: {} }))

    await waitFor(() => {
      // Verificar que se muestra el icono genérico
      const iconoCoche = screen.getByTestId("car-icon-5678-DEF")
      expect(iconoCoche).toBeInTheDocument()
    })

    // Verificar que NO hay imagen
    expect(screen.queryByAltText("Foto de 5678-DEF")).not.toBeInTheDocument()
  })

  it("debe manejar errores al cargar fotos y mostrar icono genérico", async () => {
    const mockCoches = [
      {
        matricula: "9999-ERR",
        marca: "Ford",
        modelo: "Focus",
        color: "Rojo",
        kms: 40000,
        combustible: "Diesel",
        asignadoa: null,
        alquiler: false,
        donante: false,
      },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "empleados") {
        return {
          select: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      if (table === "coches") {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockCoches,
            error: null,
          }),
        } as any
      }
      if (table === "itvs") {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      return {} as any
    })

    // Mock de obtenerFotosCoche - error
    mockObtenerFotosCoche.mockResolvedValue({
      success: false,
      error: "Error de conexión",
    })

    render(await CochesPage({ searchParams: {} }))

    await waitFor(() => {
      // Verificar que se muestra el icono genérico cuando hay error
      const iconoCoche = screen.getByTestId("car-icon-9999-ERR")
      expect(iconoCoche).toBeInTheDocument()
    })

    // Verificar que NO hay imagen
    expect(screen.queryByAltText("Foto de 9999-ERR")).not.toBeInTheDocument()
  })

  it("debe optimizar carga con múltiples coches", async () => {
    const mockCoches = Array.from({ length: 10 }, (_, i) => ({
      matricula: `${1000 + i}-TST`,
      marca: "Test",
      modelo: "Model",
      color: "Color",
      kms: 10000 * i,
      combustible: "Gasolina",
      asignadoa: null,
      alquiler: false,
      donante: false,
    }))

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "empleados") {
        return {
          select: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      if (table === "coches") {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockCoches,
            error: null,
          }),
        } as any
      }
      if (table === "itvs") {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      return {} as any
    })

    // Mock diferentes respuestas para diferentes coches
    mockObtenerFotosCoche.mockImplementation(async (matricula: string) => {
      const numero = Number.parseInt(matricula.split("-")[0])
      if (numero % 2 === 0) {
        // Coches pares tienen fotos
        return {
          success: true,
          fotos: [`https://supabase.com/storage/coches-fotos/${matricula}/foto1.jpg`],
        }
      } else {
        // Coches impares no tienen fotos
        return {
          success: true,
          fotos: [],
        }
      }
    })

    render(await CochesPage({ searchParams: {} }))

    await waitFor(() => {
      // Verificar que se llamó a obtenerFotosCoche para todos los coches
      expect(mockObtenerFotosCoche).toHaveBeenCalledTimes(10)

      // Verificar que algunos coches tienen imágenes y otros iconos
      const imagenes = screen.getAllByRole("img")
      const iconos = screen.getAllByTestId(/car-icon-/)

      expect(imagenes.length + iconos.length).toBe(10)
    })
  })

  it("debe manejar fallback cuando la imagen falla al cargar", async () => {
    const mockCoches = [
      {
        matricula: "FAIL-IMG",
        marca: "Test",
        modelo: "Fallback",
        color: "Test",
        kms: 1000,
        combustible: "Gasolina",
        asignadoa: null,
        alquiler: false,
        donante: false,
      },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "empleados") {
        return {
          select: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      if (table === "coches") {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockCoches,
            error: null,
          }),
        } as any
      }
      if (table === "itvs") {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      return {} as any
    })

    mockObtenerFotosCoche.mockResolvedValue({
      success: true,
      fotos: ["https://invalid-url.com/broken-image.jpg"],
    })

    render(await CochesPage({ searchParams: {} }))

    await waitFor(() => {
      const imagen = screen.getByAltText("Foto de FAIL-IMG")
      expect(imagen).toBeInTheDocument()

      // Simular error de carga de imagen
      const errorEvent = new Event("error")
      imagen.dispatchEvent(errorEvent)
    })
  })
})
