import { supabaseServer as supabase } from "@/lib/supabase-server"
import {
  buildSingleOutputMask,
  createAccessCode,
  deleteAccessCode,
  getAccessCodes,
  isLoxoneRequestError,
  sanitizeLoxoneAccessCodeName,
} from "@/lib/loxone"

type CodigoReservaEstado =
  | "pendiente_creacion"
  | "activo"
  | "revocado"
  | "expirado"
  | "error_creacion"
  | "error_revocacion"

type MotivoFinCodigoReserva = "completada" | "cancelada" | "manual" | "reemplazado" | "expirada" | "error"

interface CasilleroReservaRow {
  id: number
  codigo: string
  nombre: string
  matricula: string | null
  activo: boolean
  loxone_control_uuid: string
  loxone_output_number: number
  loxone_output_key: string
}

interface ReservaCodigoAccesoRow {
  id: number
  reserva_id: number
  casillero_id: number
  codigo_acceso: string
  codigo_hint: string | null
  nombre_loxone: string | null
  loxone_control_uuid: string
  loxone_output_number: number
  loxone_code_uuid: string | null
  fecha_desde: string
  fecha_hasta: string
  estado: CodigoReservaEstado
  motivo_fin: MotivoFinCodigoReserva | null
  email_enviado: boolean
  fecha_email_enviado: string | null
  revocado_en: string | null
  ultimo_error: string | null
  created_at: string
  updated_at: string
}

export interface CasilleroReserva {
  id: number
  codigo: string
  nombre: string
  matricula: string | null
  activo: boolean
  loxoneControlUuid: string
  loxoneOutputNumber: number
  loxoneOutputKey: string
}

export interface CodigoAccesoReserva {
  id: number
  reservaId: number
  casilleroId: number
  codigoAcceso: string
  codigoHint: string | null
  nombreLoxone: string | null
  loxoneControlUuid: string
  loxoneOutputNumber: number
  loxoneCodeUuid: string | null
  fechaDesde: string
  fechaHasta: string
  estado: CodigoReservaEstado
  motivoFin: MotivoFinCodigoReserva | null
  emailEnviado: boolean
  fechaEmailEnviado: string | null
  revocadoEn: string | null
  ultimoError: string | null
}

export interface AccesoReservaActivo {
  casillero: CasilleroReserva
  codigo: CodigoAccesoReserva
  keypadInstruction: string
}

function normalizeMatricula(matricula: string) {
  return String(matricula || "").trim().toUpperCase()
}

function mapCasillero(row: CasilleroReservaRow): CasilleroReserva {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    matricula: row.matricula,
    activo: row.activo,
    loxoneControlUuid: row.loxone_control_uuid,
    loxoneOutputNumber: row.loxone_output_number,
    loxoneOutputKey: row.loxone_output_key,
  }
}

function mapCodigoAcceso(row: ReservaCodigoAccesoRow): CodigoAccesoReserva {
  return {
    id: row.id,
    reservaId: row.reserva_id,
    casilleroId: row.casillero_id,
    codigoAcceso: row.codigo_acceso,
    codigoHint: row.codigo_hint,
    nombreLoxone: row.nombre_loxone,
    loxoneControlUuid: row.loxone_control_uuid,
    loxoneOutputNumber: row.loxone_output_number,
    loxoneCodeUuid: row.loxone_code_uuid,
    fechaDesde: row.fecha_desde,
    fechaHasta: row.fecha_hasta,
    estado: row.estado,
    motivoFin: row.motivo_fin,
    emailEnviado: row.email_enviado,
    fechaEmailEnviado: row.fecha_email_enviado,
    revocadoEn: row.revocado_en,
    ultimoError: row.ultimo_error,
  }
}

function getCodigoHint(codigo: string) {
  const normalized = String(codigo || "").trim()
  if (!normalized) return null
  return normalized.length <= 4 ? normalized : normalized.slice(-4)
}

function outputMaskIncludes(mask: number, outputNumber: number) {
  if (!Number.isInteger(mask) || !Number.isInteger(outputNumber) || outputNumber < 1) return false
  return (mask & (1 << (outputNumber - 1))) !== 0
}

function buildNombreLoxoneReserva(reservaId: number, matricula: string, casillero: CasilleroReserva) {
  return `RESERVA ${reservaId} ${normalizeMatricula(matricula)} ${casillero.nombre}`
}

function buildKeypadInstruction(outputNumber: number) {
  if (outputNumber === 1) {
    return "Introduce directamente el PIN en el teclado."
  }

  return `Introduce ${outputNumber}, pulsa confirmar y después el PIN.`
}

async function registrarEventoCasillero(params: {
  casilleroId: number
  reservaId: number
  reservaCodigoAccesoId?: number | null
  origen: "loxone" | "app" | "system" | "manual"
  tipoEvento: "codigo_creado" | "codigo_revocado" | "apertura_permitida" | "codigo_denegado" | "salida_disparada" | "historial_sync" | "otro"
  fechaEvento?: string
  loxoneOutputNumber?: number | null
  detalles?: Record<string, unknown>
}) {
  const { error } = await supabase.from("casilleros_eventos").insert([
    {
      casillero_id: params.casilleroId,
      reserva_id: params.reservaId,
      reserva_codigo_acceso_id: params.reservaCodigoAccesoId || null,
      origen: params.origen,
      tipo_evento: params.tipoEvento,
      fecha_evento: params.fechaEvento || new Date().toISOString(),
      loxone_output_number: params.loxoneOutputNumber || null,
      detalles: params.detalles || {},
    },
  ])

  if (error) {
    console.error("Error registrando evento de casillero:", error)
  }
}

async function findLockerById(id: number) {
  const { data, error } = await supabase
    .from("casilleros")
    .select("id, codigo, nombre, matricula, activo, loxone_control_uuid, loxone_output_number, loxone_output_key")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo cargar el casillero ${id}: ${error.message}`)
  }

  return data ? mapCasillero(data as CasilleroReservaRow) : null
}

export async function obtenerCasilleroActivoPorMatricula(matricula: string) {
  const matriculaNormalizada = normalizeMatricula(matricula)

  if (!matriculaNormalizada) {
    return null
  }

  const { data, error } = await supabase
    .from("casilleros")
    .select("id, codigo, nombre, matricula, activo, loxone_control_uuid, loxone_output_number, loxone_output_key")
    .eq("matricula", matriculaNormalizada)
    .eq("activo", true)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo resolver el casillero de ${matriculaNormalizada}: ${error.message}`)
  }

  return data ? mapCasillero(data as CasilleroReservaRow) : null
}

export async function resolverCasilleroReserva(params: {
  matricula: string
  casilleroId?: number | null
}) {
  const casillero =
    params.casilleroId && Number.isInteger(params.casilleroId)
      ? await findLockerById(params.casilleroId)
      : await obtenerCasilleroActivoPorMatricula(params.matricula)

  if (!casillero || !casillero.activo) {
    return null
  }

  return casillero
}

export async function asegurarCasilleroReserva(params: {
  reservaId: number
  matricula: string
  casilleroId?: number | null
}) {
  const casillero = await resolverCasilleroReserva({
    matricula: params.matricula,
    casilleroId: params.casilleroId,
  })

  if (!casillero || !casillero.activo) {
    throw new Error(`No hay ningún casillero activo configurado para la matrícula ${normalizeMatricula(params.matricula)}`)
  }

  const { error } = await supabase
    .from("reservas")
    .update({ casillero_id: casillero.id })
    .eq("id", params.reservaId)

  if (error) {
    throw new Error(`No se pudo fijar el casillero de la reserva ${params.reservaId}: ${error.message}`)
  }

  return casillero
}

async function obtenerCodigoAbiertoReserva(reservaId: number) {
  const { data, error } = await supabase
    .from("reservas_codigos_acceso")
    .select(
      "id, reserva_id, casillero_id, codigo_acceso, codigo_hint, nombre_loxone, loxone_control_uuid, loxone_output_number, loxone_code_uuid, fecha_desde, fecha_hasta, estado, motivo_fin, email_enviado, fecha_email_enviado, revocado_en, ultimo_error, created_at, updated_at",
    )
    .eq("reserva_id", reservaId)
    .in("estado", ["pendiente_creacion", "activo"])
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`No se pudo consultar el código activo de la reserva ${reservaId}: ${error.message}`)
  }

  return (data?.[0] as ReservaCodigoAccesoRow | undefined) || null
}

async function generarCodigoReserva(controlUuid: string, outputNumber: number) {
  const { data, error } = await supabase
    .from("reservas_codigos_acceso")
    .select("codigo_acceso")
    .eq("loxone_control_uuid", controlUuid)
    .eq("loxone_output_number", outputNumber)
    .in("estado", ["pendiente_creacion", "activo"])

  if (error) {
    throw new Error(`No se pudo calcular un PIN libre para el casillero: ${error.message}`)
  }

  const usados = new Set((data || []).map((row) => String((row as { codigo_acceso?: string }).codigo_acceso || "")))

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = String(Math.floor(1000 + Math.random() * 9000))
    if (!usados.has(candidate)) {
      return candidate
    }
  }

  throw new Error("No se pudo generar un PIN libre para el casillero")
}

async function buscarCodigoCreadoEnLoxone(controlUuid: string, nombreLoxone: string, outputNumber: number) {
  const result = await getAccessCodes(controlUuid)
  const nombreSaneado = sanitizeLoxoneAccessCodeName(nombreLoxone)
  const codes = result.value || []

  return (
    codes.find((entry) => entry.name === nombreSaneado && outputMaskIncludes(entry.outputs, outputNumber) && entry.isActive) ||
    null
  )
}

export async function asegurarCodigoAccesoReserva(params: {
  reservaId: number
  matricula: string
  fechaInicio: Date
  fechaFin: Date
  casilleroId?: number | null
}) {
  const casillero = await asegurarCasilleroReserva(params)
  const codigoAbierto = await obtenerCodigoAbiertoReserva(params.reservaId)

  if (codigoAbierto?.estado === "activo" && codigoAbierto.loxone_code_uuid) {
    return {
      created: false,
      casillero,
      codigo: mapCodigoAcceso(codigoAbierto),
      keypadInstruction: buildKeypadInstruction(casillero.loxoneOutputNumber),
    }
  }

  const nombreLoxone =
    codigoAbierto?.nombre_loxone || buildNombreLoxoneReserva(params.reservaId, params.matricula, casillero)
  const codigoAcceso = codigoAbierto?.codigo_acceso || (await generarCodigoReserva(casillero.loxoneControlUuid, casillero.loxoneOutputNumber))
  const fechaDesdeIso = params.fechaInicio.toISOString()
  const fechaHastaIso = params.fechaFin.toISOString()

  let row = codigoAbierto

  if (!row) {
    const { data, error } = await supabase
      .from("reservas_codigos_acceso")
      .insert([
        {
          reserva_id: params.reservaId,
          casillero_id: casillero.id,
          codigo_acceso: codigoAcceso,
          codigo_hint: getCodigoHint(codigoAcceso),
          nombre_loxone: nombreLoxone,
          loxone_control_uuid: casillero.loxoneControlUuid,
          loxone_output_number: casillero.loxoneOutputNumber,
          fecha_desde: fechaDesdeIso,
          fecha_hasta: fechaHastaIso,
          estado: "pendiente_creacion",
        },
      ])
      .select(
        "id, reserva_id, casillero_id, codigo_acceso, codigo_hint, nombre_loxone, loxone_control_uuid, loxone_output_number, loxone_code_uuid, fecha_desde, fecha_hasta, estado, motivo_fin, email_enviado, fecha_email_enviado, revocado_en, ultimo_error, created_at, updated_at",
      )
      .single()

    if (error) {
      throw new Error(`No se pudo registrar el código de acceso para la reserva ${params.reservaId}: ${error.message}`)
    }

    row = data as ReservaCodigoAccesoRow
  }

  let loxoneCodeUuid: string | null = row.loxone_code_uuid || null

  try {
    if (!loxoneCodeUuid) {
      const outputsMask = buildSingleOutputMask(casillero.loxoneOutputNumber)

      let lastError: unknown = null
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await createAccessCode({
            controlUuid: casillero.loxoneControlUuid,
            name: nombreLoxone,
            code: codigoAcceso,
            type: 2,
            outputsMask,
            standardOutput: casillero.loxoneOutputNumber,
            timeFrom: params.fechaInicio,
            timeTo: params.fechaFin,
          })

          break
        } catch (error) {
          lastError = error
          const shouldRetry = isLoxoneRequestError(error) && /keycode/i.test(`${error.message} ${error.body}`)
          if (!shouldRetry || attempt === 2) {
            throw error
          }
        }
      }

      if (lastError && !loxoneCodeUuid) {
        const codeInLoxone = await buscarCodigoCreadoEnLoxone(
          casillero.loxoneControlUuid,
          nombreLoxone,
          casillero.loxoneOutputNumber,
        )
        loxoneCodeUuid = codeInLoxone?.uuid || null
      }

      if (!loxoneCodeUuid) {
        const codeInLoxone = await buscarCodigoCreadoEnLoxone(
          casillero.loxoneControlUuid,
          nombreLoxone,
          casillero.loxoneOutputNumber,
        )
        loxoneCodeUuid = codeInLoxone?.uuid || null
      }
    }

    if (!loxoneCodeUuid) {
      throw new Error("Loxone confirmó la creación, pero no devolvió un UUID activo para el código")
    }

    const { data: updated, error: updateError } = await supabase
      .from("reservas_codigos_acceso")
      .update({
        casillero_id: casillero.id,
        codigo_acceso: codigoAcceso,
        codigo_hint: getCodigoHint(codigoAcceso),
        nombre_loxone: nombreLoxone,
        loxone_control_uuid: casillero.loxoneControlUuid,
        loxone_output_number: casillero.loxoneOutputNumber,
        loxone_code_uuid: loxoneCodeUuid,
        fecha_desde: fechaDesdeIso,
        fecha_hasta: fechaHastaIso,
        estado: "activo",
        motivo_fin: null,
        ultimo_error: null,
      })
      .eq("id", row.id)
      .select(
        "id, reserva_id, casillero_id, codigo_acceso, codigo_hint, nombre_loxone, loxone_control_uuid, loxone_output_number, loxone_code_uuid, fecha_desde, fecha_hasta, estado, motivo_fin, email_enviado, fecha_email_enviado, revocado_en, ultimo_error, created_at, updated_at",
      )
      .single()

    if (updateError) {
      try {
        await deleteAccessCode(casillero.loxoneControlUuid, loxoneCodeUuid)
      } catch (cleanupError) {
        console.error("No se pudo revertir el código Loxone tras un fallo de DB:", cleanupError)
      }

      throw new Error(`No se pudo guardar el UUID Loxone del código de reserva: ${updateError.message}`)
    }

    await registrarEventoCasillero({
      casilleroId: casillero.id,
      reservaId: params.reservaId,
      reservaCodigoAccesoId: updated.id,
      origen: "system",
      tipoEvento: "codigo_creado",
      loxoneOutputNumber: casillero.loxoneOutputNumber,
      detalles: {
        codigo_hint: getCodigoHint(codigoAcceso),
        loxone_code_uuid: loxoneCodeUuid,
        nombre_loxone: nombreLoxone,
      },
    })

    return {
      created: true,
      casillero,
      codigo: mapCodigoAcceso(updated as ReservaCodigoAccesoRow),
      keypadInstruction: buildKeypadInstruction(casillero.loxoneOutputNumber),
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido creando el código en Loxone"

    const { error: markError } = await supabase
      .from("reservas_codigos_acceso")
      .update({
        estado: "error_creacion",
        ultimo_error: errorMessage,
        nombre_loxone: nombreLoxone,
      })
      .eq("id", row.id)

    if (markError) {
      console.error("No se pudo marcar el error de creación del código de reserva:", markError)
    }

    throw new Error(errorMessage)
  }
}

export async function marcarEmailCodigoReservaEnviado(reservaId: number) {
  const { error } = await supabase
    .from("reservas_codigos_acceso")
    .update({
      email_enviado: true,
      fecha_email_enviado: new Date().toISOString(),
      ultimo_error: null,
    })
    .eq("reserva_id", reservaId)
    .eq("estado", "activo")

  if (error) {
    throw new Error(`No se pudo marcar el email del código como enviado: ${error.message}`)
  }
}

export async function revocarCodigoAccesoReserva(params: {
  reservaId: number
  motivoFin: MotivoFinCodigoReserva
  origen?: "loxone" | "app" | "system" | "manual"
}) {
  const row = await obtenerCodigoAbiertoReserva(params.reservaId)

  if (!row) {
    return { success: true as const, revoked: false as const }
  }

  const casillero = await findLockerById(row.casillero_id)

  try {
    if (row.loxone_code_uuid) {
      await deleteAccessCode(row.loxone_control_uuid, row.loxone_code_uuid)
    }

    const { error } = await supabase
      .from("reservas_codigos_acceso")
      .update({
        estado: "revocado",
        motivo_fin: params.motivoFin,
        revocado_en: new Date().toISOString(),
        ultimo_error: null,
      })
      .eq("id", row.id)

    if (error) {
      throw new Error(`No se pudo marcar el código de reserva como revocado: ${error.message}`)
    }

    if (casillero) {
      await registrarEventoCasillero({
        casilleroId: casillero.id,
        reservaId: params.reservaId,
        reservaCodigoAccesoId: row.id,
        origen: params.origen || "app",
        tipoEvento: "codigo_revocado",
        loxoneOutputNumber: casillero.loxoneOutputNumber,
        detalles: {
          loxone_code_uuid: row.loxone_code_uuid,
          motivo_fin: params.motivoFin,
        },
      })
    }

    return { success: true as const, revoked: true as const }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido revocando el código de reserva"

    const { error: markError } = await supabase
      .from("reservas_codigos_acceso")
      .update({
        estado: "error_revocacion",
        motivo_fin: "error",
        ultimo_error: errorMessage,
      })
      .eq("id", row.id)

    if (markError) {
      console.error("No se pudo marcar el error de revocación del código de reserva:", markError)
    }

    throw new Error(errorMessage)
  }
}
