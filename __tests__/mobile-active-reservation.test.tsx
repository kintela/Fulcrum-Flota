import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { MockedFunction } from "jest-mock"

import { MobileActiveReservation } from "@/components/mobile-active-reservation"
import { cancelarReserva, obtenerReservasUsuario } from "@/app/actions/reservas-temporales"
import { capturarYAsignarUbicacion } from "@/lib/ubicacion-utils"

jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}))

jest.mock("@/app/actions/reservas-temporales", () => ({
  obtenerReservasUsuario: jest.fn(),
  cancelarReserva: jest.fn(),
}))

jest.mock("@/lib/ubicacion-utils", () => ({
  capturarYAsignarUbicacion: jest.fn(),
}))

const mockObtenerReservas = obtenerReservasUsuario as MockedFunction<typeof obtenerReservasUsuario>
const mockCancelarReserva = cancelarReserva as MockedFunction<typeof cancelarReserva>
const mockCapturarUbicacion = capturarYAsignarUbicacion as MockedFunction<typeof capturarYAsignarUbicacion>

function reservaEnCurso() {
  const ahora = Date.now()
  return {
    id: 42,
    matricula: "1234-ABC",
    fecha_inicio: new Date(ahora - 60_000).toISOString(),
    fecha_fin: new Date(ahora + 60_000).toISOString(),
    estado: "activa",
    created_at: new Date(ahora - 60_000).toISOString(),
    coches: {
      matricula: "1234-ABC",
      marca: "Renault",
      modelo: "Clio",
    },
  }
}

describe("MobileActiveReservation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockObtenerReservas.mockResolvedValue({ success: true, reservas: [reservaEnCurso()] } as any)
  })

  it("muestra la devolución rápida para una reserva en curso", async () => {
    render(<MobileActiveReservation />)

    expect(await screen.findByText("¿Quieres devolver el coche ahora?")).toBeInTheDocument()
    expect(screen.getByText("1234-ABC")).toBeInTheDocument()
    expect(screen.getByText("Renault Clio")).toBeInTheDocument()
  })

  it("guarda la ubicación antes de cancelar la reserva", async () => {
    const orden: string[] = []
    mockCapturarUbicacion.mockImplementation(async () => {
      orden.push("ubicacion")
      return {
        success: true,
        mensaje: "ok",
        ubicacion: { latitud: 40.4, longitud: -3.7 },
      }
    })
    mockCancelarReserva.mockImplementation(async () => {
      orden.push("cancelacion")
      return { success: true, message: "ok" }
    })

    render(<MobileActiveReservation />)
    fireEvent.click(await screen.findByRole("button", { name: "Ubicar coche y cancelar reserva" }))

    expect(await screen.findByText("Coche ubicado")).toBeInTheDocument()
    expect(orden).toEqual(["ubicacion", "cancelacion"])
    expect(mockCapturarUbicacion).toHaveBeenCalledWith("1234-ABC")
    expect(mockCancelarReserva).toHaveBeenCalledWith(42)
  })

  it("no cancela la reserva cuando falla la ubicación", async () => {
    mockCapturarUbicacion.mockResolvedValue({
      success: false,
      mensaje: "Permiso denegado para acceder a la ubicación",
    })

    render(<MobileActiveReservation />)
    fireEvent.click(await screen.findByRole("button", { name: "Ubicar coche y cancelar reserva" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Permiso denegado")
    await waitFor(() => expect(mockCancelarReserva).not.toHaveBeenCalled())
  })
})
