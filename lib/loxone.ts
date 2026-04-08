import { Buffer } from "node:buffer"

const DEFAULT_LOXONE_BASE_URL = "http://192.168.100.180:8810"

export interface LoxoneApiKeyInfo {
  snr?: string
  version?: string
  key?: string
  isInTrust?: boolean
  local?: boolean
  address?: string
}

export interface LoxoneControlLike {
  name?: string
  type?: string
  room?: string
  cat?: string
  details?: Record<string, unknown>
  states?: Record<string, unknown>
}

export interface LoxoneStructureFile {
  lastModified?: string | number
  msInfo?: Record<string, unknown>
  controls?: Record<string, LoxoneControlLike>
  rooms?: Record<string, { name?: string }>
  cats?: Record<string, { name?: string }>
}

export interface LoxoneAccessControlCandidate {
  uuid: string
  name: string
  type: string | null
  roomUuid: string | null
  roomName: string | null
  categoryUuid: string | null
  categoryName: string | null
  accessOutputs: Record<string, string>
  availableOutputs: number[]
}

export interface LoxoneCreateCodeParams {
  controlUuid: string
  name: string
  code: string
  type: 0 | 1 | 2
  outputsMask: number
  standardOutput: number
  timeFrom?: Date
  timeTo?: Date
}

export interface LoxoneEnvelope {
  LL?: {
    control?: string
    value?: string
    Code?: string | number
  }
}

export interface LoxoneCommandResult<T = unknown> {
  control: string | null
  code: number | null
  rawValue: string | null
  value: T | null
  raw: LoxoneEnvelope
}

export interface LoxoneAccessCode {
  uuid: string
  name: string
  isActive: boolean
  isEmpty: boolean
  type: number
  outputs: number
  standardOutput: number
  timeFrom?: number
  timeTo?: number
}

export interface LoxoneAccessHistoryEntry {
  ts: number
  output: number
  type: number
  user?: string
  description?: string
  extMedium?: string
  extAuthority?: string
}

class LoxoneRequestError extends Error {
  status: number
  body: string
  loxoneCode?: number | null

  constructor(message: string, status: number, body: string, loxoneCode?: number | null) {
    super(message)
    this.name = "LoxoneRequestError"
    this.status = status
    this.body = body
    this.loxoneCode = loxoneCode
  }
}

export function getLoxoneConfig() {
  const baseUrl = (process.env.LOXONE_BASE_URL || DEFAULT_LOXONE_BASE_URL).trim()
  const username = (process.env.LOXONE_USERNAME || process.env.LOXONE_USER || "").trim()
  const password = process.env.LOXONE_PASSWORD || ""

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    username,
    password,
    hasBaseUrl: baseUrl.length > 0,
    hasCredentials: username.length > 0 && password.length > 0,
  }
}

export function parseLoxoneValuePayload<T = Record<string, unknown>>(value: string | null | undefined): T | null {
  if (!value) return null

  try {
    return JSON.parse(value) as T
  } catch {
    try {
      return JSON.parse(value.replace(/'/g, '"')) as T
    } catch {
      return null
    }
  }
}

function getBasicAuthHeader(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
}

function getEntityName(
  entities: Record<string, { name?: string }> | undefined,
  uuid: string | undefined,
) {
  if (!uuid || !entities) return null
  return entities[uuid]?.name || null
}

async function readResponseBody(response: Response) {
  try {
    return await response.text()
  } catch {
    return ""
  }
}

export async function fetchLoxoneJson<T>(
  path: string,
  options?: { requireAuth?: boolean; signal?: AbortSignal },
): Promise<T> {
  const config = getLoxoneConfig()

  if (!config.hasBaseUrl) {
    throw new Error("LOXONE_BASE_URL no está configurada")
  }

  const headers = new Headers({
    Accept: "application/json, text/plain, */*",
  })

  if (options?.requireAuth) {
    if (!config.hasCredentials) {
      throw new Error("Faltan credenciales de Loxone: LOXONE_USERNAME y LOXONE_PASSWORD")
    }

    headers.set("Authorization", getBasicAuthHeader(config.username, config.password))
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    method: "GET",
    headers,
    cache: "no-store",
    signal: options?.signal,
  })

  if (!response.ok) {
    const body = await readResponseBody(response)
    throw new LoxoneRequestError(
      `Loxone respondió ${response.status} en ${path}`,
      response.status,
      body,
    )
  }

  return await response.json() as T
}

export async function getLoxoneApiKeyInfo() {
  const response = await fetchLoxoneJson<LoxoneEnvelope>("/jdev/cfg/apiKey")
  return parseLoxoneValuePayload<LoxoneApiKeyInfo>(response?.LL?.value)
}

export async function getLoxoneStructureFile() {
  return await fetchLoxoneJson<LoxoneStructureFile>("/data/LoxAPP3.json", { requireAuth: true })
}

function toLoxoneCommandResult<T>(envelope: LoxoneEnvelope): LoxoneCommandResult<T> {
  const control = envelope?.LL?.control || null
  const rawValue = envelope?.LL?.value || null
  const code = Number(envelope?.LL?.Code ?? NaN)

  if (!Number.isFinite(code)) {
    throw new Error("Respuesta inválida de Loxone: falta LL.Code")
  }

  if (code < 200 || code >= 300) {
    throw new LoxoneRequestError(
      `Loxone devolvió código lógico ${code} para ${control || "comando desconocido"}`,
      200,
      rawValue || "",
      code,
    )
  }

  return {
    control,
    code,
    rawValue,
    value: parseLoxoneValuePayload<T>(rawValue),
    raw: envelope,
  }
}

export async function fetchLoxoneCommand<T = unknown>(path: string) {
  const envelope = await fetchLoxoneJson<LoxoneEnvelope>(path, { requireAuth: true })
  return toLoxoneCommandResult<T>(envelope)
}

export function findAccessCodeTouchControls(structure: LoxoneStructureFile) {
  const controls = structure.controls || {}
  const candidates: LoxoneAccessControlCandidate[] = []

  for (const [uuid, control] of Object.entries(controls)) {
    const rawOutputs = control?.details?.accessOutputs
    if (!rawOutputs || typeof rawOutputs !== "object" || Array.isArray(rawOutputs)) continue

    const accessOutputs = Object.entries(rawOutputs).reduce(
      (acc, [key, value]) => {
        if (typeof value === "string" && value.trim() !== "") {
          acc[key] = value
        }
        return acc
      },
      {} as Record<string, string>,
    )

    const availableOutputs = Object.keys(accessOutputs)
      .map((key) => Number(key.replace(/\D/g, "")))
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 9999)
      .sort((a, b) => a - b)

    candidates.push({
      uuid,
      name: control?.name || uuid,
      type: control?.type || null,
      roomUuid: control?.room || null,
      roomName: getEntityName(structure.rooms, control?.room),
      categoryUuid: control?.cat || null,
      categoryName: getEntityName(structure.cats, control?.cat),
      accessOutputs,
      availableOutputs,
    })
  }

  return candidates.sort((a, b) => a.name.localeCompare(b.name, "es"))
}

export function buildControlCommand(controlUuid: string, command: string) {
  return `/jdev/sps/io/${controlUuid}/${command}`
}

export function buildSingleOutputMask(outputNumber: number) {
  if (!Number.isInteger(outputNumber) || outputNumber < 1 || outputNumber > 31) {
    throw new Error("El número de salida debe ser un entero entre 1 y 31")
  }

  return 1 << (outputNumber - 1)
}

export function toUnixTimestampSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000)
}

export function sanitizeLoxoneAccessCodeName(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 _-]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ /g, "-")
    .replace(/-+/g, "-")

  return normalized || "codigo-acceso"
}

export function buildCreateAccessCodeCommand(params: LoxoneCreateCodeParams) {
  const encodedName = encodeURIComponent(sanitizeLoxoneAccessCodeName(params.name))
  const encodedCode = encodeURIComponent(params.code)
  const basePath =
    buildControlCommand(params.controlUuid, "code/create") +
    "/" +
    `${encodedName}/${encodedCode}/${params.type}/${params.outputsMask}/${params.standardOutput}`

  if (params.type === 2) {
    if (!params.timeFrom || !params.timeTo) {
      throw new Error("Los códigos temporales requieren timeFrom y timeTo")
    }

    return (
      `${basePath}/${toUnixTimestampSeconds(params.timeFrom)}` +
      `/${toUnixTimestampSeconds(params.timeTo)}`
    )
  }

  return basePath
}

export async function createAccessCode(params: LoxoneCreateCodeParams) {
  const path = buildCreateAccessCodeCommand(params)
  return await fetchLoxoneCommand(path)
}

export async function getAccessCodes(controlUuid: string) {
  return await fetchLoxoneCommand<LoxoneAccessCode[]>(buildControlCommand(controlUuid, "codes"))
}

export async function getAccessHistory(controlUuid: string) {
  return await fetchLoxoneCommand<LoxoneAccessHistoryEntry[]>(buildControlCommand(controlUuid, "history"))
}

export async function triggerAccessOutput(controlUuid: string, outputNumber: number) {
  return await fetchLoxoneCommand(buildControlCommand(controlUuid, `output/${outputNumber}`))
}

export async function deleteAccessCode(controlUuid: string, codeUuid: string) {
  return await fetchLoxoneCommand(buildControlCommand(controlUuid, `code/delete/${codeUuid}`))
}

export async function activateAccessCode(controlUuid: string, codeUuid: string) {
  return await fetchLoxoneCommand(buildControlCommand(controlUuid, `code/activate/${codeUuid}`))
}

export async function deactivateAccessCode(controlUuid: string, codeUuid: string) {
  return await fetchLoxoneCommand(buildControlCommand(controlUuid, `code/deactivate/${codeUuid}`))
}

export function isLoxoneRequestError(error: unknown): error is LoxoneRequestError {
  return error instanceof LoxoneRequestError
}
