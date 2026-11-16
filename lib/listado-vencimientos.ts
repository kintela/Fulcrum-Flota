// Lógica pura del listado de vencimientos de la flota (spec 016).
// No importa nada de servidor: se usa desde el componente cliente.

export type FiltroAlquiler = "todos" | "alquiler" | "no_alquiler"

export type ColumnaOrden = "matricula" | "modelo" | "asignado" | "seguro" | "solred" | "itv"

export type SentidoOrden = "asc" | "desc"

export interface Orden {
  columna: ColumnaOrden
  sentido: SentidoOrden
}

export interface FilaVencimiento {
  matricula: string
  /** Marca y modelo juntos, p. ej. "Seat León". */
  modelo: string | null
  /** Nombre de la persona asignada, resuelto como en la página de coches. */
  asignado: string | null
  alquiler: boolean
  /** Fecha de vencimiento del seguro activo (AAAA-MM-DD o timestamp). */
  seguro: string | null
  /** Fecha de vencimiento de la tarjeta Solred asignada. */
  solred: string | null
  /** Fecha de la próxima revisión ITV. */
  itv: string | null
}

export type EstadoPlazo = "vencida" | "proxima" | "normal"

export const DIAS_AVISO_VENCIMIENTO = 30

export const ORDEN_INICIAL: Orden = { columna: "matricula", sentido: "asc" }

const COLUMNAS_FECHA: ReadonlySet<ColumnaOrden> = new Set<ColumnaOrden>(["seguro", "solred", "itv"])

const MS_POR_DIA = 1000 * 60 * 60 * 24

function normalizarTexto(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
}

function normalizarCompacto(value: unknown): string {
  return normalizarTexto(value).replace(/[\s-]/g, "")
}

/**
 * Interpreta "AAAA-MM-DD" (con o sin hora detrás) como fecha local a las 00:00,
 * evitando que `new Date("AAAA-MM-DD")` la tome como UTC y cambie de día.
 */
function parsearFechaLocal(fecha: string | null | undefined): Date | null {
  if (!fecha) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(fecha).trim())
  if (!match) return null
  const [, anio, mes, dia] = match
  const resultado = new Date(Number(anio), Number(mes) - 1, Number(dia))
  return Number.isNaN(resultado.getTime()) ? null : resultado
}

export function filtrarPorAlquiler(fila: FilaVencimiento, filtro: FiltroAlquiler): boolean {
  if (filtro === "alquiler") return fila.alquiler === true
  if (filtro === "no_alquiler") return fila.alquiler !== true
  return true
}

export function coincideBusqueda(fila: FilaVencimiento, texto: string): boolean {
  const query = normalizarTexto(texto)
  if (!query) return true
  const queryCompacta = normalizarCompacto(texto)

  const valores = [fila.matricula, fila.modelo, fila.asignado].filter(
    (value): value is string => typeof value === "string" && value.trim() !== "",
  )

  return valores.some(
    (value) => normalizarTexto(value).includes(query) || normalizarCompacto(value).includes(queryCompacta),
  )
}

function compararTexto(a: string, b: string): number {
  return a.localeCompare(b, "es", { sensitivity: "base" })
}

function valorTexto(fila: FilaVencimiento, columna: ColumnaOrden): string | null {
  const value = fila[columna as "matricula" | "modelo" | "asignado"]
  return typeof value === "string" && value.trim() !== "" ? value : null
}

function valorFecha(fila: FilaVencimiento, columna: ColumnaOrden): number | null {
  const fecha = parsearFechaLocal(fila[columna as "seguro" | "solred" | "itv"])
  return fecha ? fecha.getTime() : null
}

/**
 * Devuelve una copia ordenada. Las filas sin dato en la columna van siempre al final
 * (en ambos sentidos); los empates se resuelven por matrícula ascendente.
 */
export function ordenarFilas(filas: readonly FilaVencimiento[], orden: Orden): FilaVencimiento[] {
  const factor = orden.sentido === "asc" ? 1 : -1
  const esFecha = COLUMNAS_FECHA.has(orden.columna)

  return [...filas].sort((a, b) => {
    let comparacion = 0

    if (esFecha) {
      const va = valorFecha(a, orden.columna)
      const vb = valorFecha(b, orden.columna)
      if (va === null && vb !== null) return 1
      if (va !== null && vb === null) return -1
      if (va !== null && vb !== null) comparacion = (va - vb) * factor
    } else {
      const va = valorTexto(a, orden.columna)
      const vb = valorTexto(b, orden.columna)
      if (va === null && vb !== null) return 1
      if (va !== null && vb === null) return -1
      if (va !== null && vb !== null) comparacion = compararTexto(va, vb) * factor
    }

    if (comparacion !== 0) return comparacion
    return compararTexto(a.matricula, b.matricula)
  })
}

/** Al pulsar una cabecera: misma columna → invierte el sentido; otra columna → ascendente. */
export function siguienteOrden(actual: Orden, columna: ColumnaOrden): Orden {
  if (actual.columna === columna) {
    return { columna, sentido: actual.sentido === "asc" ? "desc" : "asc" }
  }
  return { columna, sentido: "asc" }
}

export function calcularEstadoPlazo(
  fecha: string | null | undefined,
  hoy: Date = new Date(),
): { estado: EstadoPlazo; dias: number } | null {
  const objetivo = parsearFechaLocal(fecha)
  if (!objetivo) return null

  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  // Math.round absorbe la hora de diferencia en los cambios de horario de verano.
  const dias = Math.round((objetivo.getTime() - inicioHoy.getTime()) / MS_POR_DIA)

  if (dias < 0) return { estado: "vencida", dias }
  if (dias <= DIAS_AVISO_VENCIMIENTO) return { estado: "proxima", dias }
  return { estado: "normal", dias }
}

export function formatearFecha(fecha: string | null | undefined): string {
  const parsed = parsearFechaLocal(fecha)
  if (!parsed) return ""
  const dia = String(parsed.getDate()).padStart(2, "0")
  const mes = String(parsed.getMonth() + 1).padStart(2, "0")
  return `${dia}/${mes}/${parsed.getFullYear()}`
}
