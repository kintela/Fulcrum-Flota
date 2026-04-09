export const RESERVA_ACTIVACION_ANTELACION_MINUTOS = 30

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value)
}

export function getReservaBloqueoDesde(
  fechaInicio: Date | string,
  margenBloqueoMinutos = RESERVA_ACTIVACION_ANTELACION_MINUTOS,
) {
  const inicio = toDate(fechaInicio)
  return new Date(inicio.getTime() - margenBloqueoMinutos * 60 * 1000)
}

export function getReservaActivacionDesde(reserva: {
  fecha_inicio: Date | string
  bloqueo_desde?: Date | string | null
  margen_bloqueo?: number | null
}) {
  if (reserva.bloqueo_desde) {
    return toDate(reserva.bloqueo_desde)
  }

  return getReservaBloqueoDesde(
    reserva.fecha_inicio,
    typeof reserva.margen_bloqueo === "number" && Number.isFinite(reserva.margen_bloqueo)
      ? reserva.margen_bloqueo
      : RESERVA_ACTIVACION_ANTELACION_MINUTOS,
  )
}

export function isReservaListaParaActivacion(
  reserva: {
    fecha_inicio: Date | string
    bloqueo_desde?: Date | string | null
    margen_bloqueo?: number | null
  },
  ahora = new Date(),
) {
  return getReservaActivacionDesde(reserva).getTime() <= ahora.getTime()
}

export function getNextHalfHourCronTick(base = new Date()) {
  const next = new Date(base)
  next.setSeconds(0, 0)

  const minutes = next.getMinutes()
  const isExactTick = (minutes === 0 || minutes === 30) && base.getSeconds() === 0 && base.getMilliseconds() === 0
  if (isExactTick) {
    return next
  }

  if (minutes < 30) {
    next.setMinutes(30, 0, 0)
  } else {
    next.setHours(next.getHours() + 1, 0, 0, 0)
  }

  return next
}
