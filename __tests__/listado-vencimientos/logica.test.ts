/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals"
import {
  calcularEstadoPlazo,
  coincideBusqueda,
  filtrarPorAlquiler,
  formatearFecha,
  ordenarFilas,
  ORDEN_INICIAL,
  siguienteOrden,
  type FilaVencimiento,
} from "@/lib/listado-vencimientos"

function fila(parcial: Partial<FilaVencimiento> & { matricula: string }): FilaVencimiento {
  return {
    modelo: null,
    asignado: null,
    alquiler: false,
    seguro: null,
    solred: null,
    itv: null,
    ...parcial,
  }
}

const filas: FilaVencimiento[] = [
  fila({ matricula: "3333-CCC", modelo: "Seat León", asignado: "Íñigo Pérez", alquiler: true, seguro: "2026-03-01", itv: "2027-01-10" }),
  fila({ matricula: "1111-AAA", modelo: "Renault Clio", asignado: "Ana López", alquiler: false, seguro: "2025-12-01", solred: "2026-06-30" }),
  fila({ matricula: "2222-BBB", modelo: "audi A3", asignado: null, alquiler: false, seguro: null, solred: "2026-01-15", itv: "2026-02-01" }),
]

describe("filtrarPorAlquiler (RF-10)", () => {
  it("'todos' deja pasar todas las filas", () => {
    expect(filas.filter((f) => filtrarPorAlquiler(f, "todos"))).toHaveLength(3)
  })

  it("'alquiler' solo deja los de alquiler", () => {
    expect(filas.filter((f) => filtrarPorAlquiler(f, "alquiler")).map((f) => f.matricula)).toEqual(["3333-CCC"])
  })

  it("'no_alquiler' solo deja los que no son de alquiler", () => {
    expect(filas.filter((f) => filtrarPorAlquiler(f, "no_alquiler")).map((f) => f.matricula)).toEqual([
      "1111-AAA",
      "2222-BBB",
    ])
  })
})

describe("coincideBusqueda (RF-12)", () => {
  const leon = filas[0]

  it("texto vacío o solo espacios coincide con todo", () => {
    expect(coincideBusqueda(leon, "")).toBe(true)
    expect(coincideBusqueda(leon, "   ")).toBe(true)
  })

  it("busca por matrícula con y sin guion", () => {
    expect(coincideBusqueda(leon, "3333-ccc")).toBe(true)
    expect(coincideBusqueda(leon, "3333ccc")).toBe(true)
  })

  it("busca por marca y por modelo", () => {
    expect(coincideBusqueda(leon, "seat")).toBe(true)
    expect(coincideBusqueda(leon, "LEON")).toBe(true)
  })

  it("busca por persona asignada sin distinguir acentos ni mayúsculas, ignorando espacios alrededor", () => {
    expect(coincideBusqueda(leon, "  inigo perez ")).toBe(true)
  })

  it("no coincide si el texto no aparece en los campos buscables", () => {
    expect(coincideBusqueda(leon, "clio")).toBe(false)
    // Las fechas no son campo de búsqueda
    expect(coincideBusqueda(leon, "2026")).toBe(false)
  })

  it("se combina con el filtro de alquiler", () => {
    const resultado = filas.filter((f) => filtrarPorAlquiler(f, "no_alquiler") && coincideBusqueda(f, "ana"))
    expect(resultado.map((f) => f.matricula)).toEqual(["1111-AAA"])
  })
})

describe("ordenarFilas (RF-14 a RF-16)", () => {
  const matriculas = (lista: FilaVencimiento[]) => lista.map((f) => f.matricula)

  it("ordena por matrícula ascendente y no muta el array original", () => {
    const copia = [...filas]
    expect(matriculas(ordenarFilas(filas, { columna: "matricula", sentido: "asc" }))).toEqual([
      "1111-AAA",
      "2222-BBB",
      "3333-CCC",
    ])
    expect(filas).toEqual(copia)
  })

  it("invierte el sentido en descendente", () => {
    expect(matriculas(ordenarFilas(filas, { columna: "matricula", sentido: "desc" }))).toEqual([
      "3333-CCC",
      "2222-BBB",
      "1111-AAA",
    ])
  })

  it("ordena textos sin distinguir mayúsculas ni acentos", () => {
    expect(matriculas(ordenarFilas(filas, { columna: "modelo", sentido: "asc" }))).toEqual([
      "2222-BBB", // audi
      "1111-AAA", // Renault
      "3333-CCC", // Seat
    ])
  })

  it("coloca al final las filas sin dato de texto en ambos sentidos", () => {
    expect(matriculas(ordenarFilas(filas, { columna: "asignado", sentido: "asc" }))).toEqual([
      "1111-AAA",
      "3333-CCC",
      "2222-BBB",
    ])
    expect(matriculas(ordenarFilas(filas, { columna: "asignado", sentido: "desc" }))).toEqual([
      "3333-CCC",
      "1111-AAA",
      "2222-BBB",
    ])
  })

  it("ordena fechas cronológicamente con las vacías al final en ambos sentidos", () => {
    expect(matriculas(ordenarFilas(filas, { columna: "seguro", sentido: "asc" }))).toEqual([
      "1111-AAA",
      "3333-CCC",
      "2222-BBB",
    ])
    expect(matriculas(ordenarFilas(filas, { columna: "seguro", sentido: "desc" }))).toEqual([
      "3333-CCC",
      "1111-AAA",
      "2222-BBB",
    ])
    expect(matriculas(ordenarFilas(filas, { columna: "solred", sentido: "asc" }))).toEqual([
      "2222-BBB",
      "1111-AAA",
      "3333-CCC",
    ])
    expect(matriculas(ordenarFilas(filas, { columna: "itv", sentido: "desc" }))).toEqual([
      "3333-CCC",
      "2222-BBB",
      "1111-AAA",
    ])
  })

  it("desempata por matrícula ascendente", () => {
    const empatadas = [
      fila({ matricula: "9999-ZZZ", itv: "2026-05-01" }),
      fila({ matricula: "0001-AAA", itv: "2026-05-01" }),
    ]
    expect(matriculas(ordenarFilas(empatadas, { columna: "itv", sentido: "desc" }))).toEqual(["0001-AAA", "9999-ZZZ"])
  })
})

describe("siguienteOrden (RF-15)", () => {
  it("misma columna invierte el sentido; otra columna empieza en ascendente", () => {
    expect(siguienteOrden(ORDEN_INICIAL, "matricula")).toEqual({ columna: "matricula", sentido: "desc" })
    expect(siguienteOrden({ columna: "matricula", sentido: "desc" }, "matricula")).toEqual({
      columna: "matricula",
      sentido: "asc",
    })
    expect(siguienteOrden({ columna: "matricula", sentido: "desc" }, "itv")).toEqual({ columna: "itv", sentido: "asc" })
  })

  it("el orden inicial es por matrícula ascendente (RF-14)", () => {
    expect(ORDEN_INICIAL).toEqual({ columna: "matricula", sentido: "asc" })
  })
})

describe("calcularEstadoPlazo (RF-18)", () => {
  const hoy = new Date(2026, 10, 16, 15, 30) // 16/11/2026 15:30 local

  it("fecha anterior a hoy → vencida", () => {
    expect(calcularEstadoPlazo("2026-11-15", hoy)).toEqual({ estado: "vencida", dias: -1 })
  })

  it("fecha de hoy → próxima (0 días)", () => {
    expect(calcularEstadoPlazo("2026-11-16", hoy)).toEqual({ estado: "proxima", dias: 0 })
  })

  it("dentro de 30 días → próxima", () => {
    expect(calcularEstadoPlazo("2026-12-16", hoy)).toEqual({ estado: "proxima", dias: 30 })
  })

  it("a 31 días → normal", () => {
    expect(calcularEstadoPlazo("2026-12-17", hoy)).toEqual({ estado: "normal", dias: 31 })
  })

  it("acepta fechas con hora (timestamp) usando solo el día", () => {
    expect(calcularEstadoPlazo("2026-11-16T00:00:00+00:00", hoy)).toEqual({ estado: "proxima", dias: 0 })
  })

  it("sin fecha o fecha no válida → null", () => {
    expect(calcularEstadoPlazo(null, hoy)).toBeNull()
    expect(calcularEstadoPlazo("no-es-fecha", hoy)).toBeNull()
  })
})

describe("formatearFecha (RF-19)", () => {
  it("formatea como dd/mm/aaaa sin desfase de día", () => {
    expect(formatearFecha("2026-01-01")).toBe("01/01/2026")
    expect(formatearFecha("2026-12-31T23:00:00+00:00")).toBe("31/12/2026")
  })

  it("devuelve cadena vacía si no hay fecha válida", () => {
    expect(formatearFecha(null)).toBe("")
    expect(formatearFecha("xx")).toBe("")
  })
})
