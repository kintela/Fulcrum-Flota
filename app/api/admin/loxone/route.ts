import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabaseServer as supabase } from "@/lib/supabase-server"
import {
  activateAccessCode,
  buildSingleOutputMask,
  createAccessCode,
  deactivateAccessCode,
  deleteAccessCode,
  findAccessCodeTouchControls,
  getAccessCodes,
  getAccessHistory,
  getLoxoneApiKeyInfo,
  getLoxoneConfig,
  getLoxoneStructureFile,
  isLoxoneRequestError,
  triggerAccessOutput,
  updateAccessCode,
} from "@/lib/loxone"

function noStoreHeaders() {
  return { "Cache-Control": "no-store" }
}

interface LockerAssignmentRow {
  id: number
  codigo: string
  nombre: string
  matricula: string | null
  activo: boolean
  loxone_control_uuid: string
  loxone_output_number: number
  loxone_output_key: string
  updated_at?: string | null
}

interface StoredReservationCodeRow {
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
  estado: string
}

function mapLockerAssignment(row: LockerAssignmentRow) {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    matricula: row.matricula,
    activo: row.activo,
    loxoneControlUuid: row.loxone_control_uuid,
    loxoneOutputNumber: row.loxone_output_number,
    loxoneOutputKey: row.loxone_output_key,
    updatedAt: row.updated_at || null,
  }
}

function normalizeMatricula(value: unknown) {
  return String(value || "").trim().toUpperCase()
}

function buildLockerInternalCode(controlUuid: string, outputNumber: number) {
  return `LOXONE_${controlUuid.trim().toUpperCase()}_Q${outputNumber}`
}

async function loadLockerAdminData() {
  const [{ data: cars, error: carsError }, { data: lockerAssignments, error: lockersError }] = await Promise.all([
    supabase.from("coches").select("matricula, marca, modelo, asignadoa, donante, eliminado").order("matricula", {
      ascending: true,
    }),
    supabase
      .from("casilleros")
      .select("id, codigo, nombre, matricula, activo, loxone_control_uuid, loxone_output_number, loxone_output_key, updated_at")
      .order("loxone_control_uuid", { ascending: true })
      .order("loxone_output_number", { ascending: true }),
  ])

  if (carsError) {
    throw new Error(`No se pudieron cargar los coches: ${carsError.message}`)
  }

  if (lockersError) {
    throw new Error(`No se pudieron cargar los casilleros: ${lockersError.message}`)
  }

  return {
    cars: (cars || []).filter((car) => car.eliminado !== true && car.donante !== true),
    lockerAssignments: ((lockerAssignments || []) as LockerAssignmentRow[]).map(mapLockerAssignment),
  }
}

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const role = String(session?.user?.role || "").toLowerCase()
  const isAdmin = role === "administrador" || role === "admin"

  if (!session?.user?.email || !isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Acceso no autorizado",
        },
        { status: 403, headers: noStoreHeaders() },
      ),
    }
  }

  return { ok: true as const, session }
}

function buildConnectionPayload(baseUrl: string, hasCredentials: boolean, username: string) {
  return {
    baseUrl,
    hasCredentials,
    username: username || null,
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const adminData = await loadLockerAdminData()
    const config = getLoxoneConfig()
    const apiKeyInfo = await getLoxoneApiKeyInfo()

    if (!config.hasCredentials) {
      return NextResponse.json(
        {
          success: true,
          message: "Conectividad básica OK. Faltan credenciales para descargar la estructura del Miniserver.",
          connection: buildConnectionPayload(config.baseUrl, false, config.username),
          apiKeyInfo,
          cars: adminData.cars,
          lockerAssignments: adminData.lockerAssignments,
          accessControls: [],
        },
        { headers: noStoreHeaders() },
      )
    }

    const structure = await getLoxoneStructureFile()
    const accessControls = findAccessCodeTouchControls(structure)

    return NextResponse.json(
      {
        success: true,
        message:
          accessControls.length > 0
            ? "Conexión autenticada OK. Se detectaron controles de acceso compatibles."
            : "Conexión autenticada OK, pero no se detectaron controles NFC Code Touch con accessOutputs.",
        connection: buildConnectionPayload(config.baseUrl, true, config.username),
        apiKeyInfo,
        structure: {
          lastModified: structure.lastModified || null,
          controlCount: Object.keys(structure.controls || {}).length,
          msInfo: structure.msInfo || null,
        },
        cars: adminData.cars,
        lockerAssignments: adminData.lockerAssignments,
        accessControls,
      },
      { headers: noStoreHeaders() },
    )
  } catch (error) {
    console.error("Error en conexión Loxone:", error)

    if (isLoxoneRequestError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          loxoneStatus: error.status,
          loxoneCode: error.loxoneCode ?? null,
          loxoneBody: error.body || null,
        },
        { status: 502, headers: noStoreHeaders() },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error inesperado conectando con Loxone",
      },
      { status: 500, headers: noStoreHeaders() },
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const action = String(body?.action || "")
    const controlUuid = String(body?.controlUuid || "").trim()

    if (action !== "connection" && controlUuid.length === 0) {
      return NextResponse.json(
        { success: false, error: "controlUuid es obligatorio" },
        { status: 400, headers: noStoreHeaders() },
      )
    }

    if (action === "connection") {
      return await GET()
    }

    if (action === "listCodes") {
      const result = await getAccessCodes(controlUuid)
      const codes = Array.isArray(result.value) ? result.value : []
      const codeUuids = codes
        .map((code) => String(code?.uuid || "").trim())
        .filter(Boolean)

      let storedCodesByUuid = new Map<string, StoredReservationCodeRow>()

      if (codeUuids.length > 0) {
        const { data: storedCodes, error: storedCodesError } = await supabase
          .from("reservas_codigos_acceso")
          .select(
            "id, reserva_id, casillero_id, codigo_acceso, codigo_hint, nombre_loxone, loxone_control_uuid, loxone_output_number, loxone_code_uuid, fecha_desde, fecha_hasta, estado",
          )
          .eq("loxone_control_uuid", controlUuid)
          .in("loxone_code_uuid", codeUuids)
          .order("id", { ascending: false })

        if (storedCodesError) {
          throw new Error(`No se pudieron cargar los códigos guardados en base de datos: ${storedCodesError.message}`)
        }

        storedCodesByUuid = new Map(
          ((storedCodes || []) as StoredReservationCodeRow[])
            .filter((row) => row.loxone_code_uuid)
            .map((row) => [String(row.loxone_code_uuid), row] as const),
        )
      }

      return NextResponse.json(
        {
          success: true,
          message: "Códigos cargados correctamente",
          control: result.control,
          loxoneCode: result.code,
          codes: codes.map((code) => {
            const stored = storedCodesByUuid.get(String(code.uuid || ""))
            return {
              ...code,
              storedCodeValue: stored?.codigo_acceso || null,
              storedCodeHint: stored?.codigo_hint || null,
              storedReservaId: stored?.reserva_id || null,
              storedEstado: stored?.estado || null,
              storedFechaDesde: stored?.fecha_desde || null,
              storedFechaHasta: stored?.fecha_hasta || null,
            }
          }),
        },
        { headers: noStoreHeaders() },
      )
    }

    if (action === "history") {
      const result = await getAccessHistory(controlUuid)
      return NextResponse.json(
        {
          success: true,
          message: "Historial cargado correctamente",
          control: result.control,
          loxoneCode: result.code,
          history: result.value || [],
        },
        { headers: noStoreHeaders() },
      )
    }

    if (action === "triggerOutput") {
      const outputNumber = Number(body?.outputNumber)
      if (!Number.isInteger(outputNumber) || outputNumber < 1) {
        return NextResponse.json(
          { success: false, error: "outputNumber debe ser un entero positivo" },
          { status: 400, headers: noStoreHeaders() },
        )
      }

      const result = await triggerAccessOutput(controlUuid, outputNumber)
      return NextResponse.json(
        {
          success: true,
          message: `Salida ${outputNumber} accionada correctamente`,
          control: result.control,
          loxoneCode: result.code,
          value: result.value,
          rawValue: result.rawValue,
        },
        { headers: noStoreHeaders() },
      )
    }

    if (action === "createCode") {
      const name = String(body?.name || "").trim()
      const code = String(body?.code || "").trim()
      const type = Number(body?.type)
      const outputNumber = Number(body?.outputNumber)
      const standardOutput = Number(body?.standardOutput || outputNumber)

      if (name.length === 0) {
        return NextResponse.json(
          { success: false, error: "El nombre del código es obligatorio" },
          { status: 400, headers: noStoreHeaders() },
        )
      }

      if (!/^\d+$/.test(code)) {
        return NextResponse.json(
          { success: false, error: "El código debe ser numérico" },
          { status: 400, headers: noStoreHeaders() },
        )
      }

      if (![0, 1, 2].includes(type)) {
        return NextResponse.json(
          { success: false, error: "El tipo debe ser 0, 1 o 2" },
          { status: 400, headers: noStoreHeaders() },
        )
      }

      if (!Number.isInteger(outputNumber) || outputNumber < 1 || outputNumber > 31) {
        return NextResponse.json(
          { success: false, error: "outputNumber debe estar entre 1 y 31" },
          { status: 400, headers: noStoreHeaders() },
        )
      }

      let timeFrom: Date | undefined
      let timeTo: Date | undefined

      if (type === 2) {
        timeFrom = new Date(String(body?.timeFrom || ""))
        timeTo = new Date(String(body?.timeTo || ""))

        if (Number.isNaN(timeFrom.getTime()) || Number.isNaN(timeTo.getTime())) {
          return NextResponse.json(
            { success: false, error: "Los códigos temporales requieren timeFrom y timeTo válidos" },
            { status: 400, headers: noStoreHeaders() },
          )
        }

        if (timeTo <= timeFrom) {
          return NextResponse.json(
            { success: false, error: "timeTo debe ser posterior a timeFrom" },
            { status: 400, headers: noStoreHeaders() },
          )
        }
      }

      const result = await createAccessCode({
        controlUuid,
        name,
        code,
        type: type as 0 | 1 | 2,
        outputsMask: buildSingleOutputMask(outputNumber),
        standardOutput,
        timeFrom,
        timeTo,
      })

      return NextResponse.json(
        {
          success: true,
          message: "Código creado correctamente",
          control: result.control,
          loxoneCode: result.code,
          value: result.value,
          rawValue: result.rawValue,
        },
        { headers: noStoreHeaders() },
      )
    }

    if (action === "saveLockerVehicle") {
      const outputNumber = Number(body?.outputNumber)
      const outputKey = String(body?.outputKey || `q${outputNumber}`).trim() || `q${outputNumber}`
      const outputLabel = String(body?.outputLabel || outputKey).trim() || outputKey
      const matricula = normalizeMatricula(body?.matricula)

      if (!Number.isInteger(outputNumber) || outputNumber < 1 || outputNumber > 31) {
        return NextResponse.json(
          { success: false, error: "outputNumber debe estar entre 1 y 31" },
          { status: 400, headers: noStoreHeaders() },
        )
      }

      if (matricula) {
        const { data: car, error: carError } = await supabase
          .from("coches")
          .select("matricula, marca, modelo, donante, eliminado")
          .eq("matricula", matricula)
          .maybeSingle()

        if (carError) {
          throw new Error(`No se pudo validar el coche ${matricula}: ${carError.message}`)
        }

        if (!car) {
          return NextResponse.json(
            { success: false, error: `No existe ningún coche con matrícula ${matricula}` },
            { status: 400, headers: noStoreHeaders() },
          )
        }

        if (car.eliminado === true) {
          return NextResponse.json(
            { success: false, error: `El coche ${matricula} está eliminado y no se puede asociar al casillero` },
            { status: 400, headers: noStoreHeaders() },
          )
        }

        if (car.donante === true) {
          return NextResponse.json(
            { success: false, error: `El coche ${matricula} es donante y no se puede asociar a un casillero` },
            { status: 400, headers: noStoreHeaders() },
          )
        }
      }

      const { data: lockerAssignment, error: lockerError } = await supabase
        .from("casilleros")
        .upsert(
          {
            codigo: buildLockerInternalCode(controlUuid, outputNumber),
            nombre: outputLabel,
            matricula: matricula || null,
            activo: true,
            loxone_control_uuid: controlUuid,
            loxone_output_number: outputNumber,
            loxone_output_key: outputKey,
          },
          { onConflict: "loxone_control_uuid,loxone_output_number" },
        )
        .select("id, codigo, nombre, matricula, activo, loxone_control_uuid, loxone_output_number, loxone_output_key, updated_at")
        .single()

      if (lockerError) {
        if (lockerError.code === "23505") {
          return NextResponse.json(
            {
              success: false,
              error: matricula
                ? `La matrícula ${matricula} ya está asociada a otro casillero`
                : "Ya existe un casillero con esos datos",
            },
            { status: 409, headers: noStoreHeaders() },
          )
        }

        throw new Error(`No se pudo guardar la asociación del casillero: ${lockerError.message}`)
      }

      return NextResponse.json(
        {
          success: true,
          message: matricula
            ? `Casillero ${outputLabel} asociado a ${matricula}`
            : `Casillero ${outputLabel} actualizado sin coche asociado`,
          lockerAssignment: mapLockerAssignment(lockerAssignment as LockerAssignmentRow),
        },
        { headers: noStoreHeaders() },
      )
    }

    if (action === "updateCodeWindow") {
      const codeUuid = String(body?.codeUuid || "").trim()
      if (codeUuid.length === 0) {
        return NextResponse.json(
          { success: false, error: "codeUuid es obligatorio" },
          { status: 400, headers: noStoreHeaders() },
        )
      }

      const timeFrom = new Date(String(body?.timeFrom || ""))
      const timeTo = new Date(String(body?.timeTo || ""))

      if (Number.isNaN(timeFrom.getTime()) || Number.isNaN(timeTo.getTime())) {
        return NextResponse.json(
          { success: false, error: "Debes indicar una fecha de inicio y una fecha de fin válidas" },
          { status: 400, headers: noStoreHeaders() },
        )
      }

      if (timeTo <= timeFrom) {
        return NextResponse.json(
          { success: false, error: "La fecha fin debe ser posterior a la fecha inicio" },
          { status: 400, headers: noStoreHeaders() },
        )
      }

      const codesResult = await getAccessCodes(controlUuid)
      const currentCode = (Array.isArray(codesResult.value) ? codesResult.value : []).find(
        (entry) => String(entry?.uuid || "").trim() === codeUuid,
      )

      if (!currentCode) {
        return NextResponse.json(
          { success: false, error: "No existe ningún código con ese UUID en Loxone" },
          { status: 404, headers: noStoreHeaders() },
        )
      }

      if (Number(currentCode.type) !== 2) {
        return NextResponse.json(
          { success: false, error: "Solo se puede editar la vigencia de códigos temporales" },
          { status: 400, headers: noStoreHeaders() },
        )
      }

      const { data: storedReservationCode, error: storedReservationCodeError } = await supabase
        .from("reservas_codigos_acceso")
        .select("id, reserva_id, casillero_id, fecha_desde, fecha_hasta")
        .eq("loxone_control_uuid", controlUuid)
        .eq("loxone_code_uuid", codeUuid)
        .maybeSingle()

      if (storedReservationCodeError) {
        throw new Error(
          `No se pudo cargar el metadato del código en base de datos: ${storedReservationCodeError.message}`,
        )
      }

      const result = await updateAccessCode({
        controlUuid,
        codeUuid,
        isActive: Boolean(currentCode.isActive),
        name: String(currentCode.name || codeUuid),
        code: "-1",
        type: Number(currentCode.type),
        outputsMask: Number(currentCode.outputs),
        standardOutput: Number(currentCode.standardOutput),
        timeFrom,
        timeTo,
      })

      if (storedReservationCode) {
        const { error: updateStoredReservationCodeError } = await supabase
          .from("reservas_codigos_acceso")
          .update({
            fecha_desde: timeFrom.toISOString(),
            fecha_hasta: timeTo.toISOString(),
          })
          .eq("id", storedReservationCode.id)

        if (updateStoredReservationCodeError) {
          throw new Error(
            `Loxone actualizó el código, pero no se pudo sincronizar reservas_codigos_acceso: ${updateStoredReservationCodeError.message}`,
          )
        }

        if (storedReservationCode.casillero_id) {
          const { error: auditEventError } = await supabase.from("casilleros_eventos").insert({
            casillero_id: storedReservationCode.casillero_id,
            reserva_id: storedReservationCode.reserva_id,
            reserva_codigo_acceso_id: storedReservationCode.id,
            origen: "manual",
            tipo_evento: "otro",
            fecha_evento: new Date().toISOString(),
            detalles: {
              accion: "codigo_actualizado_vigencia",
              loxone_code_uuid: codeUuid,
              anterior: {
                fecha_desde: storedReservationCode.fecha_desde,
                fecha_hasta: storedReservationCode.fecha_hasta,
              },
              nuevo: {
                fecha_desde: timeFrom.toISOString(),
                fecha_hasta: timeTo.toISOString(),
              },
            },
          })

          if (auditEventError) {
            console.warn("No se pudo auditar la actualización manual de vigencia:", auditEventError)
          }
        }
      }

      return NextResponse.json(
        {
          success: true,
          message: storedReservationCode
            ? "Vigencia actualizada en Loxone y sincronizada en la app"
            : "Vigencia actualizada en Loxone",
          control: result.control,
          loxoneCode: result.code,
          value: result.value,
          rawValue: result.rawValue,
        },
        { headers: noStoreHeaders() },
      )
    }

    if (action === "deleteCode" || action === "activateCode" || action === "deactivateCode") {
      const codeUuid = String(body?.codeUuid || "").trim()
      if (codeUuid.length === 0) {
        return NextResponse.json(
          { success: false, error: "codeUuid es obligatorio" },
          { status: 400, headers: noStoreHeaders() },
        )
      }

      const result =
        action === "deleteCode"
          ? await deleteAccessCode(controlUuid, codeUuid)
          : action === "activateCode"
            ? await activateAccessCode(controlUuid, codeUuid)
            : await deactivateAccessCode(controlUuid, codeUuid)

      const message =
        action === "deleteCode"
          ? "Código eliminado correctamente"
          : action === "activateCode"
            ? "Código activado correctamente"
            : "Código desactivado correctamente"

      return NextResponse.json(
        {
          success: true,
          message,
          control: result.control,
          loxoneCode: result.code,
          value: result.value,
          rawValue: result.rawValue,
        },
        { headers: noStoreHeaders() },
      )
    }

    return NextResponse.json(
      { success: false, error: "Acción no válida" },
      { status: 400, headers: noStoreHeaders() },
    )
  } catch (error) {
    console.error("Error ejecutando acción Loxone:", error)

    if (isLoxoneRequestError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          loxoneStatus: error.status,
          loxoneCode: error.loxoneCode ?? null,
          loxoneBody: error.body || null,
        },
        { status: 502, headers: noStoreHeaders() },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error inesperado ejecutando acción Loxone",
      },
      { status: 500, headers: noStoreHeaders() },
    )
  }
}
