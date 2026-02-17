export const TIPOS_SEGURO = [
  "Terceros",
  "Terceros Ampliado",
  "Todo Riesgo",
  "Todo Riesgo con Franquicia",
] as const

export type TipoSeguro = (typeof TIPOS_SEGURO)[number]

export function esTipoSeguroValido(tipo: string): tipo is TipoSeguro {
  return TIPOS_SEGURO.includes(tipo as TipoSeguro)
}
