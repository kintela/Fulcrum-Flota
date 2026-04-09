"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, KeyRound, DoorOpen, History, Loader2, Wifi } from "lucide-react"

interface AccessControl {
  uuid: string
  name: string
  type: string | null
  roomName: string | null
  categoryName: string | null
  accessOutputs: Record<string, string>
  availableOutputs: number[]
}

interface AccessCode {
  uuid: string
  name: string
  isActive: boolean
  isEmpty: boolean
  type: number
  outputs: number
  standardOutput: number
  timeFrom?: number
  timeTo?: number
  storedCodeValue?: string | null
  storedCodeHint?: string | null
  storedReservaId?: number | null
  storedEstado?: string | null
  storedFechaDesde?: string | null
  storedFechaHasta?: string | null
}

interface CodeWindowDraft {
  timeFrom: string
  timeTo: string
}

interface AccessHistoryEntry {
  ts: number
  output: number
  type: number
  user?: string
  description?: string
  extMedium?: string
  extAuthority?: string
}

interface LockerCarOption {
  matricula: string
  marca?: string | null
  modelo?: string | null
  asignadoa?: string | number | null
  donante?: boolean | null
  eliminado?: boolean | null
}

interface LockerAssignment {
  id: number
  codigo: string
  nombre: string
  matricula: string | null
  activo: boolean
  loxoneControlUuid: string
  loxoneOutputNumber: number
  loxoneOutputKey: string
  updatedAt?: string | null
}

interface ConnectionData {
  success: boolean
  message?: string
  error?: string
  connection?: {
    baseUrl: string
    hasCredentials: boolean
    username: string | null
  }
  apiKeyInfo?: {
    version?: string
    address?: string
    snr?: string
  } | null
  structure?: {
    lastModified?: string | number | null
    controlCount?: number
  } | null
  accessControls?: AccessControl[]
  loxoneStatus?: number
  loxoneCode?: number | null
  loxoneBody?: string | null
  cars?: LockerCarOption[]
  lockerAssignments?: LockerAssignment[]
}

type LockerFeedbackTone = "success" | "error" | "info"

function formatDateTimeInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function formatUnixDateTime(seconds?: number) {
  if (!seconds) return "-"
  return new Date(seconds * 1000).toLocaleString("es-ES")
}

function formatSavedAt(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("es-ES")
}

function formatIsoDateTimeInputValue(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return formatDateTimeInputValue(date)
}

function outputMaskIncludes(mask: number, outputNumber: number) {
  if (!Number.isInteger(mask) || !Number.isInteger(outputNumber) || outputNumber < 1) return false
  return (mask & (1 << (outputNumber - 1))) !== 0
}

function getOutputLabel(control: AccessControl | null, outputNumber: number) {
  if (!Number.isInteger(outputNumber) || outputNumber < 1) return "-"
  return control?.accessOutputs?.[`q${outputNumber}`] || `Q${outputNumber}`
}

function getAssignedOutputsLabel(code: AccessCode, control: AccessControl | null) {
  if (!control) return `Máscara ${code.outputs}`

  const outputs = control.availableOutputs.filter((output) => outputMaskIncludes(code.outputs, output))
  if (outputs.length === 0) return `Máscara ${code.outputs}`

  return outputs.map((output) => getOutputLabel(control, output)).join(", ")
}

function getKeypadInstruction(outputNumber: number) {
  if (outputNumber === 1) {
    return "En teclado: introduce solo el PIN."
  }

  return `En teclado: ${outputNumber} + confirmar + PIN.`
}

function sanitizeLoxoneAccessCodeNameForLookup(name: string) {
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

function hasPermanentAssignment(value: unknown) {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim() !== ""
  return true
}

function getCarOptionLabel(car: LockerCarOption | null | undefined) {
  if (!car?.matricula) return "-"

  const description = [car.marca, car.modelo].filter(Boolean).join(" ")
  return description ? `${car.matricula} · ${description}` : car.matricula
}

function getCodeTypeLabel(type: number) {
  switch (type) {
    case 0:
      return "Permanente"
    case 1:
      return "Un solo uso"
    case 2:
      return "Temporal"
    case 3:
      return "Válido hasta"
    case 4:
      return "Válido desde"
    case 5:
      return "Desactivado"
    default:
      return `Tipo ${type}`
  }
}

function formatDurationSeconds(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "-"

  const totalMinutes = Math.round(totalSeconds / 60)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []

  if (days > 0) parts.push(`${days} d`)
  if (hours > 0) parts.push(`${hours} h`)
  if (minutes > 0) parts.push(`${minutes} min`)

  return parts.length > 0 ? parts.join(" ") : "0 min"
}

function getCodeDurationLabel(code: AccessCode) {
  if (code.type === 2 && code.timeFrom && code.timeTo) {
    return formatDurationSeconds(code.timeTo - code.timeFrom)
  }

  if (code.type === 0) {
    return "Sin caducidad"
  }

  if (code.type === 1) {
    return "Un solo uso"
  }

  if (code.type === 3 && code.timeTo) {
    return `Hasta ${formatUnixDateTime(code.timeTo)}`
  }

  if (code.type === 4 && code.timeFrom) {
    return `Desde ${formatUnixDateTime(code.timeFrom)}`
  }

  return "-"
}

function getCodeWindowDraftValues(code: AccessCode): CodeWindowDraft {
  const storedTimeFrom = formatIsoDateTimeInputValue(code.storedFechaDesde)
  const storedTimeTo = formatIsoDateTimeInputValue(code.storedFechaHasta)

  return {
    timeFrom: code.timeFrom ? formatDateTimeInputValue(new Date(code.timeFrom * 1000)) : storedTimeFrom,
    timeTo: code.timeTo ? formatDateTimeInputValue(new Date(code.timeTo * 1000)) : storedTimeTo,
  }
}

function getHistoryTypeLabel(type: number) {
  switch (type) {
    case 0:
      return "Código"
    case 1:
      return "Código con nombre"
    case 3:
      return "NFC"
    case 6:
      return "App"
    case 7:
      return "Código denegado"
    case 8:
      return "NFC denegado"
    case 10:
      return "Externo permitido"
    case 11:
      return "Externo denegado"
    default:
      return `Evento ${type}`
  }
}

export default function LoxoneAdmin() {
  const defaultStart = useMemo(() => {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    return formatDateTimeInputValue(now)
  }, [])
  const defaultEnd = useMemo(() => {
    const end = new Date()
    end.setHours(end.getHours() + 24, 0, 0, 0)
    return formatDateTimeInputValue(end)
  }, [])

  const [connection, setConnection] = useState<ConnectionData | null>(null)
  const [loadingConnection, setLoadingConnection] = useState(false)
  const [selectedControlUuid, setSelectedControlUuid] = useState("")
  const [selectedOutputNumber, setSelectedOutputNumber] = useState("")
  const [actionMessage, setActionMessage] = useState<string>("")
  const [actionError, setActionError] = useState<string>("")
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [codes, setCodes] = useState<AccessCode[]>([])
  const [history, setHistory] = useState<AccessHistoryEntry[]>([])
  const [codeName, setCodeName] = useState("Prueba Flota")
  const [codeValue, setCodeValue] = useState("")
  const [codeType, setCodeType] = useState("2")
  const [timeFrom, setTimeFrom] = useState(defaultStart)
  const [timeTo, setTimeTo] = useState(defaultEnd)
  const [quickAssignMode, setQuickAssignMode] = useState("24h")
  const [lockerCodeValues, setLockerCodeValues] = useState<Record<number, string>>({})
  const [lockerFeedback, setLockerFeedback] = useState<Record<number, { tone: LockerFeedbackTone; message: string }>>({})
  const [cars, setCars] = useState<LockerCarOption[]>([])
  const [lockerAssignments, setLockerAssignments] = useState<LockerAssignment[]>([])
  const [lockerVehicleSelections, setLockerVehicleSelections] = useState<Record<number, string>>({})
  const [lockerVehicleFeedback, setLockerVehicleFeedback] = useState<Record<number, { tone: LockerFeedbackTone; message: string }>>({})
  const [codeWindowDrafts, setCodeWindowDrafts] = useState<Record<string, CodeWindowDraft>>({})

  const accessControls = connection?.accessControls || []
  const selectedControl = accessControls.find((control) => control.uuid === selectedControlUuid) || null
  const availableOutputs = selectedControl?.availableOutputs || []
  const selectedOutput = Number(selectedOutputNumber)
  const filteredCodes = codes.filter((code) =>
    selectedOutputNumber ? outputMaskIncludes(code.outputs, selectedOutput) : true,
  )
  const lockerAssignmentsByOutput = useMemo(() => {
    const entries = lockerAssignments
      .filter((assignment) => assignment.loxoneControlUuid === selectedControlUuid)
      .map((assignment) => [assignment.loxoneOutputNumber, assignment] as const)
    return new Map(entries)
  }, [lockerAssignments, selectedControlUuid])
  const lockerAssignmentByMatricula = useMemo(() => {
    const entries = lockerAssignments
      .filter((assignment) => assignment.matricula)
      .map((assignment) => [String(assignment.matricula), assignment] as const)
    return new Map(entries)
  }, [lockerAssignments])

  useEffect(() => {
    void loadConnection()
  }, [])

  useEffect(() => {
    if (accessControls.length === 0) {
      setSelectedControlUuid("")
      return
    }

    if (!accessControls.some((control) => control.uuid === selectedControlUuid)) {
      setSelectedControlUuid(accessControls[0].uuid)
    }
  }, [accessControls, selectedControlUuid])

  useEffect(() => {
    if (availableOutputs.length === 0) {
      setSelectedOutputNumber("")
      return
    }

    if (!availableOutputs.includes(Number(selectedOutputNumber))) {
      setSelectedOutputNumber(String(availableOutputs[0]))
    }
  }, [availableOutputs, selectedOutputNumber])

  useEffect(() => {
    if (!selectedControlUuid) {
      setCodes([])
      setHistory([])
      setLockerCodeValues({})
      setLockerFeedback({})
      setLockerVehicleSelections({})
      setLockerVehicleFeedback({})
      setCodeWindowDrafts({})
      return
    }

    setLockerCodeValues({})
    setLockerFeedback({})
    setLockerVehicleFeedback({})
    setCodeWindowDrafts({})
    void handleLoadCodes()
  }, [selectedControlUuid])

  useEffect(() => {
    if (!selectedControlUuid) {
      setLockerVehicleSelections({})
      return
    }

    const nextSelections: Record<number, string> = {}
    lockerAssignments
      .filter((assignment) => assignment.loxoneControlUuid === selectedControlUuid)
      .forEach((assignment) => {
        nextSelections[assignment.loxoneOutputNumber] = assignment.matricula || ""
      })

    setLockerVehicleSelections(nextSelections)
  }, [selectedControlUuid, lockerAssignments])

  async function readJson(response: Response) {
    try {
      return await response.json()
    } catch {
      return { success: false, error: `Respuesta no válida (${response.status})` }
    }
  }

  async function loadConnection() {
    setLoadingConnection(true)
    setActionError("")
    setActionMessage("")

    try {
      const response = await fetch("/api/admin/loxone", {
        method: "GET",
        cache: "no-store",
      })
      const payload = await readJson(response)
      setConnection(payload)
      setCars(Array.isArray(payload.cars) ? (payload.cars as LockerCarOption[]) : [])
      setLockerAssignments(Array.isArray(payload.lockerAssignments) ? (payload.lockerAssignments as LockerAssignment[]) : [])
      if (!response.ok || payload.success === false) {
        setActionError(payload.error || "No se pudo comprobar la conexión con Loxone")
        return
      }
      setActionMessage(payload.message || "Conexión Loxone comprobada")
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Error inesperado cargando la conexión")
    } finally {
      setLoadingConnection(false)
    }
  }

  async function runAction(
    action: string,
    body: Record<string, unknown>,
    options?: {
      busyKey?: string
      preserveStatus?: boolean
      silentSuccess?: boolean
    },
  ) {
    setBusyAction(options?.busyKey || action)
    if (!options?.preserveStatus) {
      setActionError("")
      setActionMessage("")
    }

    try {
      const response = await fetch("/api/admin/loxone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      })
      const payload = await readJson(response)

      if (!response.ok || payload.success === false) {
        const errorMessage = payload.error || `La acción ${action} ha fallado`
        setActionError(errorMessage)
        return { ok: false as const, error: errorMessage }
      }

      if (!options?.silentSuccess) {
        setActionMessage(payload.message || `Acción ${action} ejecutada`)
      }
      return { ok: true as const, payload }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Error inesperado en ${action}`
      setActionError(errorMessage)
      return { ok: false as const, error: errorMessage }
    } finally {
      setBusyAction(null)
    }
  }

  function generateCode() {
    const value = String(Math.floor(100000 + Math.random() * 900000))
    setCodeValue(value)
  }

  function updateLockerCodeValue(outputNumber: number, value: string) {
    setLockerCodeValues((current) => ({
      ...current,
      [outputNumber]: value.replace(/\D/g, ""),
    }))
  }

  function generateLockerCodeForOutput(outputNumber: number) {
    const value = String(Math.floor(1000 + Math.random() * 9000))
    setLockerCodeValues((current) => ({
      ...current,
      [outputNumber]: value,
    }))
  }

  function updateLockerVehicleSelection(outputNumber: number, value: string) {
    setLockerVehicleSelections((current) => ({
      ...current,
      [outputNumber]: value.toUpperCase(),
    }))
    setLockerVehicleFeedback((current) => {
      const next = { ...current }
      delete next[outputNumber]
      return next
    })
  }

  function getCodeWindowDraft(code: AccessCode) {
    return codeWindowDrafts[code.uuid] || getCodeWindowDraftValues(code)
  }

  function updateCodeWindowDraft(code: AccessCode, field: keyof CodeWindowDraft, value: string) {
    setCodeWindowDrafts((current) => ({
      ...current,
      [code.uuid]: {
        ...(current[code.uuid] || getCodeWindowDraftValues(code)),
        [field]: value,
      },
    }))
  }

  function resetCodeWindowDraft(code: AccessCode) {
    setCodeWindowDrafts((current) => ({
      ...current,
      [code.uuid]: getCodeWindowDraftValues(code),
    }))
  }

  async function handleLoadCodes(options?: { preserveStatus?: boolean; silentSuccess?: boolean }) {
    if (!selectedControlUuid) return []
    const result = await runAction("listCodes", { controlUuid: selectedControlUuid }, {
      preserveStatus: options?.preserveStatus,
      silentSuccess: options?.silentSuccess,
    })

    if (result.ok) {
      const nextCodes = Array.isArray(result.payload.codes) ? (result.payload.codes as AccessCode[]) : []
      setCodes(nextCodes)
      setCodeWindowDrafts({})
      return nextCodes
    }

    return []
  }

  async function handleLoadHistory(options?: { preserveStatus?: boolean; silentSuccess?: boolean }) {
    if (!selectedControlUuid) return
    const result = await runAction("history", { controlUuid: selectedControlUuid }, {
      preserveStatus: options?.preserveStatus,
      silentSuccess: options?.silentSuccess,
    })
    if (result.ok) {
      setHistory(Array.isArray(result.payload.history) ? (result.payload.history as AccessHistoryEntry[]) : [])
    }
  }

  async function handleTriggerOutput() {
    if (!selectedControlUuid || !selectedOutputNumber) return
    await runAction("triggerOutput", {
      controlUuid: selectedControlUuid,
      outputNumber: Number(selectedOutputNumber),
    })
  }

  async function handleCreateCode() {
    if (!selectedControlUuid || !selectedOutputNumber) return

    const result = await runAction("createCode", {
      controlUuid: selectedControlUuid,
      name: codeName,
      code: codeValue,
      type: Number(codeType),
      outputNumber: Number(selectedOutputNumber),
      standardOutput: Number(selectedOutputNumber),
      timeFrom: codeType === "2" ? new Date(timeFrom).toISOString() : undefined,
      timeTo: codeType === "2" ? new Date(timeTo).toISOString() : undefined,
    })

    if (result.ok) {
      await handleLoadCodes({ preserveStatus: true, silentSuccess: true })
    }
  }

  async function handleAssignLockerCode(outputNumber: number) {
    if (!selectedControlUuid) return
    const code = lockerCodeValues[outputNumber]?.trim()
    if (!code) return

    setLockerFeedback((current) => {
      const next = { ...current }
      delete next[outputNumber]
      return next
    })
    setSelectedOutputNumber(String(outputNumber))
    const now = new Date()
    const start = new Date(now.getTime() - 60_000)
    const outputLabel = getOutputLabel(selectedControl, outputNumber)
    const safeLocalStamp = formatDateTimeInputValue(now).replace("T", " ").replace(/:/g, "-")
    const name = `${outputLabel} ${safeLocalStamp}`
    const expectedStoredName = sanitizeLoxoneAccessCodeNameForLookup(name)
    const durationMinutes =
      quickAssignMode === "15m"
        ? 15
        : quickAssignMode === "4h"
          ? 240
          : 24 * 60
    const end = new Date(start.getTime() + durationMinutes * 60_000)

    const result = await runAction(
      "createCode",
      {
        controlUuid: selectedControlUuid,
        name,
        code,
        type: 2,
        outputNumber,
        standardOutput: outputNumber,
        timeFrom: start.toISOString(),
        timeTo: end.toISOString(),
      },
      {
        busyKey: `assignLockerCode-${outputNumber}`,
      },
    )

    if (!result.ok) {
      setLockerFeedback((current) => ({
        ...current,
        [outputNumber]: {
          tone: "error",
          message: result.error,
        },
      }))
      return
    }

    const refreshedCodes = await handleLoadCodes({ preserveStatus: true, silentSuccess: true })
    const createdCode = refreshedCodes.find(
      (entry) => entry.name === expectedStoredName && outputMaskIncludes(entry.outputs, outputNumber),
    )

    if (createdCode?.isActive) {
      setLockerCodeValues((current) => ({
        ...current,
        [outputNumber]: "",
      }))
      setLockerFeedback((current) => ({
        ...current,
        [outputNumber]: {
          tone: "success",
          message: `Asignado correctamente. ${getKeypadInstruction(outputNumber)}`,
        },
      }))
      setActionMessage(
        `Código ${code} asignado a ${outputLabel}. Válido hasta ${end.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        })}.`,
      )
      return
    }

    setLockerFeedback((current) => ({
      ...current,
      [outputNumber]: {
        tone: "error",
        message: "Loxone respondió OK, pero el código no aparece activo en la lista real del casillero.",
      },
    }))
  }

  async function handleSaveLockerVehicle(outputNumber: number) {
    if (!selectedControlUuid || !selectedControl) return

    const matricula = (lockerVehicleSelections[outputNumber] || "").trim().toUpperCase()
    const outputLabel = getOutputLabel(selectedControl, outputNumber)

    setLockerVehicleFeedback((current) => {
      const next = { ...current }
      delete next[outputNumber]
      return next
    })

    const result = await runAction(
      "saveLockerVehicle",
      {
        controlUuid: selectedControlUuid,
        outputNumber,
        outputKey: `q${outputNumber}`,
        outputLabel,
        controlName: selectedControl.name,
        matricula: matricula || null,
      },
      {
        busyKey: `saveLockerVehicle-${outputNumber}`,
      },
    )

    if (!result.ok) {
      setLockerVehicleFeedback((current) => ({
        ...current,
        [outputNumber]: {
          tone: "error",
          message: result.error,
        },
      }))
      return
    }

    const savedAssignment = result.payload.lockerAssignment as LockerAssignment | undefined
    if (savedAssignment) {
      setLockerAssignments((current) => {
        const next = current.filter(
          (assignment) =>
            !(
              assignment.loxoneControlUuid === savedAssignment.loxoneControlUuid &&
              assignment.loxoneOutputNumber === savedAssignment.loxoneOutputNumber
            ),
        )

        return [...next, savedAssignment].sort((a, b) => {
          if (a.loxoneControlUuid !== b.loxoneControlUuid) {
            return a.loxoneControlUuid.localeCompare(b.loxoneControlUuid)
          }
          return a.loxoneOutputNumber - b.loxoneOutputNumber
        })
      })
    }

    const selectedCar = cars.find((car) => car.matricula === savedAssignment?.matricula)
    const successMessage = savedAssignment?.matricula
      ? `Coche asociado: ${getCarOptionLabel(selectedCar || { matricula: savedAssignment.matricula })}.`
      : "Casillero guardado sin coche asociado."

    setLockerVehicleSelections((current) => ({
      ...current,
      [outputNumber]: savedAssignment?.matricula || "",
    }))
    setLockerVehicleFeedback((current) => ({
      ...current,
      [outputNumber]: {
        tone: "success",
        message: successMessage,
      },
    }))
  }

  async function handleToggleCode(code: AccessCode) {
    if (!selectedControlUuid) return

    const action = code.isActive ? "deactivateCode" : "activateCode"
    const result = await runAction(action, {
      controlUuid: selectedControlUuid,
      codeUuid: code.uuid,
    })

    if (result.ok) {
      await handleLoadCodes({ preserveStatus: true, silentSuccess: true })
    }
  }

  async function handleDeleteCode(code: AccessCode) {
    if (!selectedControlUuid) return

    const result = await runAction("deleteCode", {
      controlUuid: selectedControlUuid,
      codeUuid: code.uuid,
    })

    if (result.ok) {
      await handleLoadCodes({ preserveStatus: true, silentSuccess: true })
    }
  }

  async function handleDeleteCodesForOutput(outputNumber: number, codesToDelete: AccessCode[]) {
    if (!selectedControlUuid || codesToDelete.length === 0) return

    const outputLabel = getOutputLabel(selectedControl, outputNumber)
    const isBatch = codesToDelete.length > 1
    const confirmed = window.confirm(
      isBatch
        ? `Se van a borrar ${codesToDelete.length} códigos activos de ${outputLabel}. ¿Continuar?`
        : `Se va a borrar el código "${codesToDelete[0]?.name || codesToDelete[0]?.uuid}". ¿Continuar?`,
    )

    if (!confirmed) return

    let deletedCount = 0

    for (const code of codesToDelete) {
      const result = await runAction(
        "deleteCode",
        {
          controlUuid: selectedControlUuid,
          codeUuid: code.uuid,
        },
        {
          busyKey: `deleteCodes-${outputNumber}`,
          preserveStatus: true,
          silentSuccess: true,
        },
      )

      if (!result.ok) {
        setActionError(
          deletedCount > 0
            ? `${result.error}. Se borraron ${deletedCount} de ${codesToDelete.length} antes del fallo.`
            : result.error,
        )
        await handleLoadCodes({ preserveStatus: true, silentSuccess: true })
        return
      }

      deletedCount += 1
    }

    await handleLoadCodes({ preserveStatus: true, silentSuccess: true })
    setActionMessage(
      isBatch
        ? `${deletedCount} códigos activos borrados de ${outputLabel}.`
        : `Código borrado de ${outputLabel}.`,
    )
  }

  async function handleUpdateCodeWindow(code: AccessCode) {
    if (!selectedControlUuid) return

    const draft = getCodeWindowDraft(code)
    const start = new Date(draft.timeFrom)
    const end = new Date(draft.timeTo)

    if (!draft.timeFrom || !draft.timeTo || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setActionError("Debes indicar una fecha de inicio y una fecha de fin válidas")
      return
    }

    if (end <= start) {
      setActionError("La fecha fin debe ser posterior a la fecha inicio")
      return
    }

    const result = await runAction(
      "updateCodeWindow",
      {
        controlUuid: selectedControlUuid,
        codeUuid: code.uuid,
        timeFrom: start.toISOString(),
        timeTo: end.toISOString(),
      },
      {
        busyKey: `updateCodeWindow-${code.uuid}`,
      },
    )

    if (result.ok) {
      setCodeWindowDrafts((current) => {
        const next = { ...current }
        delete next[code.uuid]
        return next
      })
      await handleLoadCodes({ preserveStatus: true, silentSuccess: true })
    }
  }

  const isBusy = (action: string) => busyAction === action

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-emerald-600" />
            Conexión Loxone
          </CardTitle>
          <CardDescription>
            Diagnóstico del Miniserver, detección de controles NFC Code Touch y estado de credenciales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void loadConnection()} disabled={loadingConnection}>
              {loadingConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Probar conexión
            </Button>
            <Button variant="outline" onClick={() => void handleLoadCodes()} disabled={!selectedControlUuid || busyAction !== null}>
              <KeyRound className="mr-2 h-4 w-4" />
              Cargar códigos
            </Button>
            <Button variant="outline" onClick={() => void handleLoadHistory()} disabled={!selectedControlUuid || busyAction !== null}>
              <History className="mr-2 h-4 w-4" />
              Cargar historial
            </Button>
          </div>

          {actionMessage && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {actionMessage}
            </div>
          )}

          {actionError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {actionError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Base URL</div>
              <div className="mt-1 break-all font-medium">{connection?.connection?.baseUrl || "No disponible"}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Credenciales</div>
              <div className="mt-1">
                <Badge variant={connection?.connection?.hasCredentials ? "default" : "secondary"}>
                  {connection?.connection?.hasCredentials ? "Configuradas" : "Pendientes"}
                </Badge>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Miniserver</div>
              <div className="mt-1 font-medium">{connection?.apiKeyInfo?.version || "-"}</div>
              <div className="text-xs text-muted-foreground">{connection?.apiKeyInfo?.address || "-"}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Controles detectados</div>
              <div className="mt-1 font-medium">{accessControls.length}</div>
              <div className="text-xs text-muted-foreground">
                {connection?.structure?.controlCount ? `${connection.structure.controlCount} controles en LoxAPP3` : "Sin estructura"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Control de acceso</CardTitle>
          <CardDescription>
            Selecciona el bloque del Miniserver y la salida/casillero con la que quieres trabajar.
            El disparo manual de salida no valida ningún PIN ni comprueba códigos asignados.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="loxone-control">Control NFC Code Touch</Label>
            <select
              id="loxone-control"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedControlUuid}
              onChange={(event) => setSelectedControlUuid(event.target.value)}
            >
              <option value="">Selecciona un control</option>
              {accessControls.map((control) => (
                <option key={control.uuid} value={control.uuid}>
                  {control.name} {control.roomName ? `· ${control.roomName}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loxone-output">Casillero / salida</Label>
            <select
              id="loxone-output"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedOutputNumber}
              onChange={(event) => setSelectedOutputNumber(event.target.value)}
              disabled={!selectedControl}
            >
              <option value="">Selecciona una salida</option>
              {availableOutputs.map((output) => {
                const key = `q${output}`
                const label = selectedControl?.accessOutputs?.[key] || `Salida ${output}`
                return (
                  <option key={output} value={String(output)}>
                    {label} ({key})
                  </option>
                )
              })}
            </select>
          </div>

          {selectedControl && (
            <div className="md:col-span-2 rounded-lg border bg-muted/20 p-4 text-sm">
              <div><strong>UUID:</strong> {selectedControl.uuid}</div>
              <div><strong>Tipo:</strong> {selectedControl.type || "-"}</div>
              <div><strong>Categoría:</strong> {selectedControl.categoryName || "-"}</div>
              <div><strong>Habitación:</strong> {selectedControl.roomName || "-"}</div>
            </div>
          )}

          <div className="md:col-span-2 space-y-2">
            <Button onClick={() => void handleTriggerOutput()} disabled={!selectedControlUuid || !selectedOutputNumber || busyAction !== null}>
              {isBusy("triggerOutput") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DoorOpen className="mr-2 h-4 w-4" />}
              Disparar salida seleccionada
            </Button>
            <div className="text-sm text-muted-foreground">
              Envía el comando directo <code>output/{selectedOutputNumber || "n"}</code> al bloque NFC Code Touch. Sirve para probar la salida física, no para autenticar un código.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Asignar códigos a casilleros</CardTitle>
          <CardDescription>
            Lista de casilleros del control seleccionado con alta rápida de PIN. Por defecto se crean como temporales de 24 horas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="text-sm font-medium">Casilleros disponibles</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Introduce el PIN junto al casillero que quieras y asígnalo directamente.
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                En Loxone, `CASILLERO 1` usa solo el PIN. Para `CASILLERO 2-6`, primero va el número del casillero, luego confirmar y después el PIN.
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loxone-quick-assign-mode">Vigencia máxima</Label>
              <select
                id="loxone-quick-assign-mode"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={quickAssignMode}
                onChange={(event) => setQuickAssignMode(event.target.value)}
              >
                <option value="15m">Temporal 15 min</option>
                <option value="4h">Temporal 4 h</option>
                <option value="24h">Temporal 24 h</option>
              </select>
            </div>
          </div>

          {!selectedControl || availableOutputs.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              Selecciona primero un control NFC Code Touch con casilleros disponibles.
            </div>
          ) : (
            <div className="space-y-3">
              {availableOutputs.map((output) => {
                const outputLabel = getOutputLabel(selectedControl, output)
                const outputCodes = codes.filter((code) => outputMaskIncludes(code.outputs, output))
                const activeCodes = outputCodes
                  .filter((code) => code.isActive)
                  .sort((a, b) => {
                    const aUntil = a.timeTo || Number.MAX_SAFE_INTEGER
                    const bUntil = b.timeTo || Number.MAX_SAFE_INTEGER
                    return aUntil - bUntil
                  })
                const currentAssignment = lockerAssignmentsByOutput.get(output) || null
                const selectedMatricula = lockerVehicleSelections[output] || ""
                const assignedCar = cars.find((car) => car.matricula === (currentAssignment?.matricula || selectedMatricula)) || null
                const currentSelectedCarMissing =
                  !!selectedMatricula && !cars.some((car) => car.matricula === selectedMatricula)
                const feedback = lockerFeedback[output]
                const vehicleFeedback = lockerVehicleFeedback[output]
                return (
                  <div key={output} className="space-y-3 rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{outputLabel}</div>
                        <div className="text-sm text-muted-foreground">q{output}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={activeCodes.length > 0 ? "default" : "secondary"}>
                          {activeCodes.length > 0 ? `${activeCodes.length} activo${activeCodes.length > 1 ? "s" : ""}` : "Sin códigos activos"}
                        </Badge>
                        <Badge variant={currentAssignment?.matricula ? "secondary" : "outline"}>
                          {currentAssignment?.matricula || "Sin coche"}
                        </Badge>
                        <Badge variant="outline">{output === 1 ? "PIN directo" : `${output} + confirmar + PIN`}</Badge>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selectedMatricula}
                        onChange={(event) => updateLockerVehicleSelection(output, event.target.value)}
                        disabled={busyAction !== null}
                      >
                        <option value="">Sin coche asociado</option>
                        {currentSelectedCarMissing && (
                          <option value={selectedMatricula}>
                            {selectedMatricula} · no disponible en el catálogo actual
                          </option>
                        )}
                        {cars.map((car) => {
                          const existingAssignment = lockerAssignmentByMatricula.get(car.matricula)
                          const isCurrentSelection = selectedMatricula === car.matricula || currentAssignment?.matricula === car.matricula
                          const assignedElsewhere =
                            existingAssignment &&
                            !(
                              existingAssignment.loxoneControlUuid === selectedControlUuid &&
                              existingAssignment.loxoneOutputNumber === output
                            )
                          const disabled = Boolean(assignedElsewhere && !isCurrentSelection)
                          const labelParts = [getCarOptionLabel(car)]

                          if (hasPermanentAssignment(car.asignadoa)) {
                            labelParts.push("asignado permanente")
                          }

                          if (assignedElsewhere) {
                            labelParts.push(
                              `ligado a ${existingAssignment.nombre || `q${existingAssignment.loxoneOutputNumber}`}`,
                            )
                          }

                          return (
                            <option key={car.matricula} value={car.matricula} disabled={disabled}>
                              {labelParts.join(" · ")}
                            </option>
                          )
                        })}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleSaveLockerVehicle(output)}
                        disabled={!selectedControlUuid || busyAction !== null}
                      >
                        {isBusy(`saveLockerVehicle-${output}`) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Guardar coche
                      </Button>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {currentAssignment?.matricula ? (
                        <>
                          Coche asociado:{" "}
                          {getCarOptionLabel(
                            assignedCar || { matricula: currentAssignment.matricula },
                          )}{" "}
                          · guardado {formatSavedAt(currentAssignment.updatedAt)}
                        </>
                      ) : (
                        "Todavía no hay ningún coche asociado a este casillero en la tabla casilleros."
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                      <Input
                        value={lockerCodeValues[output] || ""}
                        onChange={(event) => updateLockerCodeValue(output, event.target.value)}
                        placeholder="Código numérico"
                        inputMode="numeric"
                      />
                      <Button type="button" variant="outline" onClick={() => generateLockerCodeForOutput(output)} disabled={busyAction !== null}>
                        Generar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void handleAssignLockerCode(output)}
                        disabled={!selectedControlUuid || !(lockerCodeValues[output] || "").trim() || busyAction !== null}
                      >
                        {isBusy(`assignLockerCode-${output}`) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                        Asignar
                      </Button>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground">{getKeypadInstruction(output)}</div>
                      {activeCodes.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-medium">Activos ahora</div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => void handleDeleteCodesForOutput(output, activeCodes)}
                              disabled={busyAction !== null}
                            >
                              {isBusy(`deleteCodes-${output}`) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Borrar todos
                            </Button>
                          </div>
                          {activeCodes.map((code) => (
                            <div key={code.uuid} className="rounded-md border bg-muted/20 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="text-sm font-medium">{code.name || "(sin nombre)"}</div>
                                  <div className="text-xs text-muted-foreground">{code.uuid}</div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline">{getCodeTypeLabel(code.type)}</Badge>
                                  <Badge variant="secondary">{getCodeDurationLabel(code)}</Badge>
                                </div>
                              </div>
                              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                {code.storedCodeValue ? <div>PIN guardado en app: <span className="font-medium text-foreground">{code.storedCodeValue}</span></div> : null}
                                {code.storedReservaId ? <div>Reserva vinculada: {code.storedReservaId}</div> : null}
                                <div>Válido desde: {formatUnixDateTime(code.timeFrom)}</div>
                                <div>Válido hasta: {formatUnixDateTime(code.timeTo)}</div>
                              </div>
                              {code.type === 2 ? (
                                <div className="mt-3 space-y-3 rounded-md border bg-background/80 p-3">
                                  <div className="text-sm font-medium">Editar vigencia</div>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-1">
                                      <Label htmlFor={`code-window-from-${code.uuid}`}>Válido desde</Label>
                                      <Input
                                        id={`code-window-from-${code.uuid}`}
                                        type="datetime-local"
                                        value={getCodeWindowDraft(code).timeFrom}
                                        onChange={(event) => updateCodeWindowDraft(code, "timeFrom", event.target.value)}
                                        disabled={busyAction !== null}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label htmlFor={`code-window-to-${code.uuid}`}>Válido hasta</Label>
                                      <Input
                                        id={`code-window-to-${code.uuid}`}
                                        type="datetime-local"
                                        value={getCodeWindowDraft(code).timeTo}
                                        onChange={(event) => updateCodeWindowDraft(code, "timeTo", event.target.value)}
                                        disabled={busyAction !== null}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => resetCodeWindowDraft(code)}
                                      disabled={busyAction !== null}
                                    >
                                      Restablecer
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => void handleUpdateCodeWindow(code)}
                                      disabled={busyAction !== null}
                                    >
                                      {isBusy(`updateCodeWindow-${code.uuid}`) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                      Guardar vigencia
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => void handleDeleteCodesForOutput(output, [code])}
                                      disabled={busyAction !== null}
                                    >
                                      {isBusy(`deleteCodes-${output}`) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                      Borrar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => void handleDeleteCodesForOutput(output, [code])}
                                    disabled={busyAction !== null}
                                  >
                                    {isBusy(`deleteCodes-${output}`) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Borrar
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1 text-sm text-muted-foreground">
                          No hay ningún código activo visible para este casillero.
                        </div>
                      )}
                    </div>

                    {vehicleFeedback && (
                      <div
                        className={
                          vehicleFeedback.tone === "success"
                            ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                            : vehicleFeedback.tone === "error"
                              ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                              : "rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800"
                        }
                      >
                        {vehicleFeedback.message}
                      </div>
                    )}

                    {feedback && (
                      <div
                        className={
                          feedback.tone === "success"
                            ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                            : feedback.tone === "error"
                              ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                              : "rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800"
                        }
                      >
                        {feedback.message}
                      </div>
                    )}
                  </div>
                )
              })}

              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer font-medium">Opciones avanzadas</summary>
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="loxone-code-name">Nombre</Label>
                      <Input
                        id="loxone-code-name"
                        value={codeName}
                        onChange={(event) => setCodeName(event.target.value)}
                        placeholder="Reserva 1234"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loxone-code-value">Código numérico</Label>
                      <div className="flex gap-2">
                        <Input
                          id="loxone-code-value"
                          value={codeValue}
                          onChange={(event) => setCodeValue(event.target.value.replace(/\D/g, ""))}
                          placeholder="123456"
                        />
                        <Button type="button" variant="outline" onClick={generateCode}>
                          Generar
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loxone-code-type">Tipo</Label>
                      <select
                        id="loxone-code-type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={codeType}
                        onChange={(event) => setCodeType(event.target.value)}
                      >
                        <option value="0">Permanente</option>
                        <option value="1">Un solo uso</option>
                        <option value="2">Temporal</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <Button
                        onClick={() => void handleCreateCode()}
                        disabled={!selectedControlUuid || !selectedOutputNumber || !codeName.trim() || !codeValue.trim() || busyAction !== null}
                      >
                        {isBusy("createCode") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                        Crear código
                      </Button>
                    </div>
                  </div>

                  {codeType === "2" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="loxone-time-from">Válido desde</Label>
                        <Input
                          id="loxone-time-from"
                          type="datetime-local"
                          value={timeFrom}
                          onChange={(event) => setTimeFrom(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="loxone-time-to">Válido hasta</Label>
                        <Input
                          id="loxone-time-to"
                          type="datetime-local"
                          value={timeTo}
                          onChange={(event) => setTimeTo(event.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Códigos actuales</CardTitle>
              <Button variant="outline" size="sm" onClick={() => void handleLoadCodes()} disabled={!selectedControlUuid || busyAction !== null}>
                {isBusy("listCodes") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Recargar
              </Button>
            </div>
            <CardDescription>
              Muestra los códigos asignados al casillero seleccionado. Loxone no devuelve el PIN en claro, solo sus metadatos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredCodes.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                {codes.length === 0
                  ? "No hay códigos cargados todavía."
                  : "No hay códigos asignados al casillero seleccionado."}
              </div>
            ) : (
              filteredCodes.map((code) => (
                <div key={code.uuid} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{code.name || "(sin nombre)"}</div>
                      <div className="text-xs text-muted-foreground">{code.uuid}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={code.isActive ? "default" : "secondary"}>
                        {code.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                      <Badge variant="outline">{getCodeTypeLabel(code.type)}</Badge>
                      <Badge variant="outline">Q{code.standardOutput}</Badge>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {code.storedCodeValue ? <div>PIN guardado en app: <span className="font-medium text-foreground">{code.storedCodeValue}</span></div> : null}
                    {code.storedReservaId ? <div>Reserva vinculada: {code.storedReservaId}</div> : null}
                    <div>Casilleros asignados: {getAssignedOutputsLabel(code, selectedControl)}</div>
                    <div>Válido desde: {formatUnixDateTime(code.timeFrom)}</div>
                    <div>Válido hasta: {formatUnixDateTime(code.timeTo)}</div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => void handleToggleCode(code)} disabled={busyAction !== null}>
                      {code.isActive ? "Desactivar" : "Activar"}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => void handleDeleteCode(code)} disabled={busyAction !== null}>
                      Borrar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial reciente</CardTitle>
            <CardDescription>
              Últimos eventos devueltos por el control de acceso seleccionado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                No hay historial cargado todavía.
              </div>
            ) : (
              history.slice(0, 20).map((entry, index) => (
                <div key={`${entry.ts}-${entry.output}-${index}`} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{formatUnixDateTime(entry.ts)}</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{getHistoryTypeLabel(entry.type)}</Badge>
                      <Badge variant="outline">Salida {entry.output}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div>Usuario: {entry.user || "-"}</div>
                    <div>Descripción: {entry.description || "-"}</div>
                    <div>Medio externo: {entry.extMedium || "-"}</div>
                    <div>Autoridad: {entry.extAuthority || "-"}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
