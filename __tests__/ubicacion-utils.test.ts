import { describe, expect, it, jest } from "@jest/globals"

import { obtenerUbicacionActual } from "@/lib/ubicacion-utils"

describe("obtenerUbicacionActual", () => {
  it("prioriza una ubicación disponible por red y da tiempo suficiente al móvil", async () => {
    const getCurrentPosition = jest.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 40.4168,
          longitude: -3.7038,
          accuracy: 45,
        },
        timestamp: 1234,
      } as GeolocationPosition)
    })

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    })

    await expect(obtenerUbicacionActual()).resolves.toEqual({
      latitud: 40.4168,
      longitud: -3.7038,
      precision: 45,
      timestamp: 1234,
    })
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 120000,
      },
    )
  })

  it("devuelve una indicación útil cuando se agota el tiempo", async () => {
    const getCurrentPosition = jest.fn(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 3, message: "Timeout" } as GeolocationPositionError)
      },
    )

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    })

    await expect(obtenerUbicacionActual()).rejects.toThrow(
      "La ubicación está tardando demasiado",
    )
  })
})
