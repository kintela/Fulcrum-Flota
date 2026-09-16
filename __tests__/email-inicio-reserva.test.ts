import { afterEach, describe, expect, it } from "@jest/globals"
import { crearContenidoEmailInicioReserva } from "@/lib/email"

describe("email de inicio de reserva", () => {
  const apiKeyAnterior = process.env.GOOGLE_MAPS_STATIC_API_KEY

  afterEach(() => {
    if (apiKeyAnterior === undefined) {
      delete process.env.GOOGLE_MAPS_STATIC_API_KEY
    } else {
      process.env.GOOGLE_MAPS_STATIC_API_KEY = apiKeyAnterior
    }
  })

  it("incluye la dirección, el enlace y la imagen del mapa", () => {
    process.env.GOOGLE_MAPS_STATIC_API_KEY = "clave-prueba"

    const contenido = crearContenidoEmailInicioReserva(
      "Ana",
      {
        matricula: "1234-ABC",
        marca: "Seat",
        modelo: "León",
        direccion_actual: "Calle Mayor 1, Madrid",
        latitud: 40.4168,
        longitud: -3.7038,
      },
      new Date("2026-09-16T08:00:00Z"),
      new Date("2026-09-16T10:00:00Z")
    )

    expect(contenido.texto).toContain("DÓNDE ESTÁ APARCADO")
    expect(contenido.texto).toContain("Calle Mayor 1, Madrid")
    expect(contenido.texto).toContain("Coordenadas: 40.4168,-3.7038")
    expect(contenido.html).toContain("Dónde está aparcado")
    expect(contenido.html).toContain("Abrir ubicación en Google Maps")
    expect(contenido.html).toContain("maps.googleapis.com/maps/api/staticmap")
    expect(contenido.html).toContain("key=clave-prueba")
  })

  it("muestra un aviso claro si el coche no tiene ubicación", () => {
    delete process.env.GOOGLE_MAPS_STATIC_API_KEY

    const contenido = crearContenidoEmailInicioReserva(
      "Ana",
      { matricula: "1234-ABC", marca: "Seat", modelo: "León" },
      new Date("2026-09-16T08:00:00Z"),
      new Date("2026-09-16T10:00:00Z")
    )

    expect(contenido.texto).toContain("No hay una ubicación registrada")
    expect(contenido.html).toContain("No hay una ubicación registrada")
    expect(contenido.html).not.toContain("<img")
  })
})
