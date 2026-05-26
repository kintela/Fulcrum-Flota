function normalizarTexto(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function normalizarCompacto(value: unknown): string {
  return normalizarTexto(value).replace(/[\s-]/g, "")
}

function valoresBuscablesCoche(coche: Record<string, unknown>): string[] {
  const tarjetaSolred = coche.tarjetaSolred as Record<string, unknown> | null | undefined
  const tarjetaViat = coche.tarjetaViat as Record<string, unknown> | null | undefined
  const seguroActivo = coche.seguroActivo as Record<string, unknown> | null | undefined

  return [
    coche.matricula,
    normalizarCompacto(coche.matricula),
    coche.marca,
    coche.modelo,
    coche.color,
    coche.combustible,
    coche.kms,
    coche.empleadoNombre,
    coche.proximaRevisionITV,
    tarjetaSolred?.numero_tarjeta,
    tarjetaSolred?.pin,
    tarjetaViat?.id,
    seguroActivo?.fecha_vencimiento,
    seguroActivo?.telefono_asistencia1,
    seguroActivo?.telefono_asistencia2,
  ]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(String)
}

export function coincideBusquedaLibre(coche: Record<string, unknown>, query: string): boolean {
  const queryNormalizada = normalizarTexto(query)
  if (!queryNormalizada) {
    return true
  }

  const queryCompacta = normalizarCompacto(query)

  return valoresBuscablesCoche(coche).some((value) => {
    const valueNormalizado = normalizarTexto(value)
    return valueNormalizado.includes(queryNormalizada) || normalizarCompacto(value).includes(queryCompacta)
  })
}
