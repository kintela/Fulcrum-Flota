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
}

function formatDateTimeInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function formatUnixDateTime(seconds?: number) {
  if (!seconds) return "-"
  return new Date(seconds * 1000).toLocaleString("es-ES")
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
    end.setHours(end.getHours() + 4, 0, 0, 0)
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

  const accessControls = connection?.accessControls || []
  const selectedControl = accessControls.find((control) => control.uuid === selectedControlUuid) || null
  const availableOutputs = selectedControl?.availableOutputs || []

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
  ) {
    setBusyAction(action)
    setActionError("")
    setActionMessage("")

    try {
      const response = await fetch("/api/admin/loxone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      })
      const payload = await readJson(response)

      if (!response.ok || payload.success === false) {
        setActionError(payload.error || `La acción ${action} ha fallado`)
        return null
      }

      setActionMessage(payload.message || `Acción ${action} ejecutada`)
      return payload
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Error inesperado en ${action}`)
      return null
    } finally {
      setBusyAction(null)
    }
  }

  function generateCode() {
    const value = String(Math.floor(100000 + Math.random() * 900000))
    setCodeValue(value)
  }

  async function handleLoadCodes() {
    if (!selectedControlUuid) return
    const payload = await runAction("listCodes", { controlUuid: selectedControlUuid })
    if (payload) {
      setCodes(Array.isArray(payload.codes) ? (payload.codes as AccessCode[]) : [])
    }
  }

  async function handleLoadHistory() {
    if (!selectedControlUuid) return
    const payload = await runAction("history", { controlUuid: selectedControlUuid })
    if (payload) {
      setHistory(Array.isArray(payload.history) ? (payload.history as AccessHistoryEntry[]) : [])
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

    const payload = await runAction("createCode", {
      controlUuid: selectedControlUuid,
      name: codeName,
      code: codeValue,
      type: Number(codeType),
      outputNumber: Number(selectedOutputNumber),
      standardOutput: Number(selectedOutputNumber),
      timeFrom: codeType === "2" ? new Date(timeFrom).toISOString() : undefined,
      timeTo: codeType === "2" ? new Date(timeTo).toISOString() : undefined,
    })

    if (payload) {
      await handleLoadCodes()
    }
  }

  async function handleToggleCode(code: AccessCode) {
    if (!selectedControlUuid) return

    const action = code.isActive ? "deactivateCode" : "activateCode"
    const payload = await runAction(action, {
      controlUuid: selectedControlUuid,
      codeUuid: code.uuid,
    })

    if (payload) {
      await handleLoadCodes()
    }
  }

  async function handleDeleteCode(code: AccessCode) {
    if (!selectedControlUuid) return

    const payload = await runAction("deleteCode", {
      controlUuid: selectedControlUuid,
      codeUuid: code.uuid,
    })

    if (payload) {
      await handleLoadCodes()
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

          <div className="md:col-span-2">
            <Button onClick={() => void handleTriggerOutput()} disabled={!selectedControlUuid || !selectedOutputNumber || busyAction !== null}>
              {isBusy("triggerOutput") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DoorOpen className="mr-2 h-4 w-4" />}
              Abrir casillero seleccionado
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crear código de acceso</CardTitle>
          <CardDescription>
            Permite generar códigos permanentes, de un solo uso o temporales para un casillero concreto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Códigos actuales</CardTitle>
            <CardDescription>
              Lista de códigos del control seleccionado. Carga manual para evitar lecturas innecesarias.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {codes.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                No hay códigos cargados todavía.
              </div>
            ) : (
              codes.map((code) => (
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
                    <div>Máscara de salidas: {code.outputs}</div>
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
