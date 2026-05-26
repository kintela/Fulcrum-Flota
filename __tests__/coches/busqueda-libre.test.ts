import { coincideBusquedaLibre } from "@/lib/coches-busqueda"

describe("busqueda libre de coches", () => {
  const coche = {
    id: 3565,
    matricula: "9903-LXR",
    marca: "Renault",
    modelo: "Dacia Duxter 4x4",
    color: "Blanco",
    kms: 0,
    combustible: "Diesel",
    empleadoNombre: null,
    tarjetaSolred: null,
    tarjetaViat: null,
    seguroActivo: null,
  }

  it("no coincide por campos internos no visibles como id", () => {
    expect(coincideBusquedaLibre(coche, "3565")).toBe(false)
  })

  it("coincide por matricula aunque el usuario omita el guion", () => {
    expect(coincideBusquedaLibre(coche, "9903lxr")).toBe(true)
  })

  it("coincide por tarjeta y pin cuando existen en la ficha", () => {
    expect(
      coincideBusquedaLibre(
        {
          matricula: "1234-ABC",
          tarjetaSolred: {
            numero_tarjeta: "600012341234",
            pin: "3565",
          },
        },
        "3565",
      ),
    ).toBe(true)
  })
})
