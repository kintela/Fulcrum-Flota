import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
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
} from "@/lib/loxone"

function noStoreHeaders() {
  return { "Cache-Control": "no-store" }
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
    const config = getLoxoneConfig()
    const apiKeyInfo = await getLoxoneApiKeyInfo()

    if (!config.hasCredentials) {
      return NextResponse.json(
        {
          success: true,
          message: "Conectividad básica OK. Faltan credenciales para descargar la estructura del Miniserver.",
          connection: buildConnectionPayload(config.baseUrl, false, config.username),
          apiKeyInfo,
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
      return NextResponse.json(
        {
          success: true,
          message: "Códigos cargados correctamente",
          control: result.control,
          loxoneCode: result.code,
          codes: result.value || [],
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
