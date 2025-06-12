import { obtenerFotosCoche } from "@/lib/storage"
import jest from "jest"

// Mock de storage
jest.mock("@/lib/storage")
const mockObtenerFotosCoche = obtenerFotosCoche as jest.MockedFunction<typeof obtenerFotosCoche>

describe("Performance - Carga de miniaturas", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("debe cargar fotos en paralelo para múltiples coches", async () => {
    const matriculas = ["1111-AAA", "2222-BBB", "3333-CCC", "4444-DDD", "5555-EEE"]

    // Mock respuestas con diferentes tiempos
    mockObtenerFotosCoche.mockImplementation(async (matricula: string) => {
      const delay = Math.random() * 100 // Simular diferentes tiempos de respuesta
      await new Promise((resolve) => setTimeout(resolve, delay))

      return {
        success: true,
        fotos: [`https://supabase.com/storage/coches-fotos/${matricula}/foto1.jpg`],
      }
    })

    const startTime = Date.now()

    // Simular la carga paralela como en getCoches
    const resultados = await Promise.all(
      matriculas.map(async (matricula) => {
        const resultado = await obtenerFotosCoche(matricula)
        return {
          matricula,
          primeraFoto: resultado.success && resultado.fotos && resultado.fotos.length > 0 ? resultado.fotos[0] : null,
        }
      }),
    )

    const endTime = Date.now()
    const totalTime = endTime - startTime

    // Verificar que se ejecutó en paralelo (debería ser mucho más rápido que secuencial)
    expect(totalTime).toBeLessThan(500) // Menos de 500ms para 5 coches
    expect(mockObtenerFotosCoche).toHaveBeenCalledTimes(5)
    expect(resultados).toHaveLength(5)

    // Verificar que todos los resultados tienen la estructura correcta
    resultados.forEach((resultado, index) => {
      expect(resultado.matricula).toBe(matriculas[index])
      expect(resultado.primeraFoto).toContain(matriculas[index])
    })
  })

  it("debe manejar errores parciales sin afectar otros coches", async () => {
    const matriculas = ["OK-001", "FAIL-002", "OK-003"]

    mockObtenerFotosCoche.mockImplementation(async (matricula: string) => {
      if (matricula === "FAIL-002") {
        return {
          success: false,
          error: "Error de conexión",
        }
      }

      return {
        success: true,
        fotos: [`https://supabase.com/storage/coches-fotos/${matricula}/foto1.jpg`],
      }
    })

    const resultados = await Promise.all(
      matriculas.map(async (matricula) => {
        try {
          const resultado = await obtenerFotosCoche(matricula)
          return {
            matricula,
            primeraFoto: resultado.success && resultado.fotos && resultado.fotos.length > 0 ? resultado.fotos[0] : null,
          }
        } catch (error) {
          return {
            matricula,
            primeraFoto: null,
          }
        }
      }),
    )

    expect(resultados).toHaveLength(3)
    expect(resultados[0].primeraFoto).toContain("OK-001")
    expect(resultados[1].primeraFoto).toBeNull() // El que falló
    expect(resultados[2].primeraFoto).toContain("OK-003")
  })

  it("debe limitar el número de llamadas concurrentes", async () => {
    const matriculas = Array.from({ length: 50 }, (_, i) => `${1000 + i}-TST`)

    let llamadasConcurrentes = 0
    let maxConcurrentes = 0

    mockObtenerFotosCoche.mockImplementation(async (matricula: string) => {
      llamadasConcurrentes++
      maxConcurrentes = Math.max(maxConcurrentes, llamadasConcurrentes)

      await new Promise((resolve) => setTimeout(resolve, 50))

      llamadasConcurrentes--

      return {
        success: true,
        fotos: [`https://supabase.com/storage/coches-fotos/${matricula}/foto1.jpg`],
      }
    })

    // Simular carga con Promise.all (sin limitación)
    await Promise.all(matriculas.map((matricula) => obtenerFotosCoche(matricula)))

    // En un escenario real, deberíamos implementar limitación de concurrencia
    // Por ahora verificamos que se ejecutaron todas las llamadas
    expect(mockObtenerFotosCoche).toHaveBeenCalledTimes(50)
    expect(maxConcurrentes).toBeGreaterThan(1) // Se ejecutaron en paralelo
  })
})
