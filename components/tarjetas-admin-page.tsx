"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { AlertCircle, CheckCircle2, CreditCard, RefreshCw, Trash2, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  actualizarTarjetaSolredAdmin,
  actualizarTarjetaViatAdmin,
  crearTarjetaSolredAdmin,
  crearTarjetaViatAdmin,
  eliminarTarjetaSolredAdmin,
  eliminarTarjetaViatAdmin,
  obtenerTarjetasSolredAdmin,
  obtenerTarjetasViatAdmin,
  type TarjetaSolredAdmin,
  type TarjetaViatAdmin,
} from "@/app/actions/tarjetas-admin"

interface MensajeEstado {
  tipo: "success" | "error"
  texto: string
}

type CampoSolredEditable = "numero_tarjeta" | "pin" | "fechavencimiento" | "activa"
type CampoViatEditable = "id" | "fechacaducidad" | "activo"

interface EdicionSolred {
  rowKey: string
  field: CampoSolredEditable
  value: string
}

interface EdicionViat {
  rowKey: string
  field: CampoViatEditable
  value: string
}

interface EliminacionPendiente {
  tipo: "solred" | "viat"
  id: string
}

export default function TarjetasAdminPage() {
  const { data: session, status } = useSession()
  const [tarjetasSolred, setTarjetasSolred] = useState<TarjetaSolredAdmin[]>([])
  const [tarjetasViat, setTarjetasViat] = useState<TarjetaViatAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [mensaje, setMensaje] = useState<MensajeEstado | null>(null)
  const [edicionSolred, setEdicionSolred] = useState<EdicionSolred | null>(null)
  const [edicionViat, setEdicionViat] = useState<EdicionViat | null>(null)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [eliminacionPendiente, setEliminacionPendiente] = useState<EliminacionPendiente | null>(null)
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminacion, setErrorEliminacion] = useState("")

  const [solredNumero, setSolredNumero] = useState("")
  const [solredPin, setSolredPin] = useState("")
  const [solredFecha, setSolredFecha] = useState("")
  const [creandoSolred, setCreandoSolred] = useState(false)

  const [viatId, setViatId] = useState("")
  const [viatFecha, setViatFecha] = useState("")
  const [creandoViat, setCreandoViat] = useState(false)

  const isAdmin = useMemo(() => {
    const role = String(session?.user?.role || "").toLowerCase()
    return role === "administrador" || role === "admin"
  }, [session?.user?.role])

  const formatearFecha = (fecha?: string | null) => {
    if (!fecha) return "-"
    const parsed = new Date(fecha)
    if (!Number.isFinite(parsed.getTime())) return "-"
    return parsed.toLocaleDateString("es-ES")
  }

  const cargarDatos = async (silencioso = false) => {
    try {
      if (silencioso) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError("")

      const [solredResult, viatResult] = await Promise.all([
        obtenerTarjetasSolredAdmin(),
        obtenerTarjetasViatAdmin(),
      ])

      if (!solredResult.success) {
        setError(solredResult.error || "No se pudieron cargar las tarjetas SOLRED")
      } else {
        setTarjetasSolred(solredResult.tarjetas)
      }

      if (!viatResult.success) {
        setError(viatResult.error || "No se pudieron cargar las tarjetas ViaT")
      } else {
        setTarjetasViat(viatResult.tarjetas)
      }
    } catch (loadError) {
      console.error("Error cargando tarjetas:", loadError)
      setError("Error inesperado al cargar las tarjetas")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      setError("Acceso no autorizado")
      setLoading(false)
      return
    }

    if (!isAdmin) {
      setError("Acceso no autorizado - Solo administradores")
      setLoading(false)
      return
    }

    cargarDatos()
  }, [status, isAdmin])

  const handleCrearSolred = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensaje(null)
    setCreandoSolred(true)

    try {
      const resultado = await crearTarjetaSolredAdmin(solredNumero, solredPin, solredFecha)
      if (!resultado.success) {
        setMensaje({ tipo: "error", texto: resultado.error || "Error al crear tarjeta SOLRED" })
        return
      }

      setMensaje({ tipo: "success", texto: resultado.message || "Tarjeta SOLRED creada correctamente" })
      setSolredNumero("")
      setSolredPin("")
      setSolredFecha("")
      await cargarDatos(true)
    } catch (createError) {
      console.error("Error creando tarjeta SOLRED:", createError)
      setMensaje({ tipo: "error", texto: "Error inesperado al crear tarjeta SOLRED" })
    } finally {
      setCreandoSolred(false)
    }
  }

  const handleCrearViat = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensaje(null)
    setCreandoViat(true)

    try {
      const resultado = await crearTarjetaViatAdmin(viatId, viatFecha)
      if (!resultado.success) {
        setMensaje({ tipo: "error", texto: resultado.error || "Error al crear tarjeta ViaT" })
        return
      }

      setMensaje({ tipo: "success", texto: resultado.message || "Tarjeta ViaT creada correctamente" })
      setViatId("")
      setViatFecha("")
      await cargarDatos(true)
    } catch (createError) {
      console.error("Error creando tarjeta ViaT:", createError)
      setMensaje({ tipo: "error", texto: "Error inesperado al crear tarjeta ViaT" })
    } finally {
      setCreandoViat(false)
    }
  }

  const iniciarEdicionSolred = (tarjeta: TarjetaSolredAdmin, field: CampoSolredEditable) => {
    if (guardandoEdicion) return
    const value =
      field === "activa"
        ? String(Boolean(tarjeta.activa))
        : String((tarjeta as Record<string, unknown>)[field] ?? "")

    setEdicionViat(null)
    setEdicionSolred({
      rowKey: tarjeta.numero_tarjeta,
      field,
      value,
    })
  }

  const iniciarEdicionViat = (tarjeta: TarjetaViatAdmin, field: CampoViatEditable) => {
    if (guardandoEdicion) return
    const value =
      field === "activo" ? String(Boolean(tarjeta.activo)) : String((tarjeta as Record<string, unknown>)[field] ?? "")

    setEdicionSolred(null)
    setEdicionViat({
      rowKey: tarjeta.id,
      field,
      value,
    })
  }

  const cancelarEdicion = () => {
    setEdicionSolred(null)
    setEdicionViat(null)
  }

  const guardarEdicionSolred = async (tarjeta: TarjetaSolredAdmin) => {
    if (!edicionSolred || guardandoEdicion) return

    const numeroNuevo = edicionSolred.field === "numero_tarjeta" ? edicionSolred.value : tarjeta.numero_tarjeta
    const pinNuevo = edicionSolred.field === "pin" ? edicionSolred.value : String(tarjeta.pin || "").trim()
    const fechaNueva = edicionSolred.field === "fechavencimiento" ? edicionSolred.value : tarjeta.fechavencimiento
    const activaNueva =
      edicionSolred.field === "activa" ? edicionSolred.value === "true" : Boolean(tarjeta.activa)

    setGuardandoEdicion(true)
    setMensaje(null)
    try {
      const resultado = await actualizarTarjetaSolredAdmin({
        numeroTarjetaActual: tarjeta.numero_tarjeta,
        numeroTarjetaNuevo: numeroNuevo,
        pin: pinNuevo,
        fechaVencimiento: fechaNueva,
        activa: activaNueva,
      })

      if (!resultado.success) {
        setMensaje({ tipo: "error", texto: resultado.error || "No se pudo actualizar la tarjeta SOLRED" })
        return
      }

      setMensaje({ tipo: "success", texto: resultado.message || "Tarjeta SOLRED actualizada correctamente" })
      setEdicionSolred(null)
      await cargarDatos(true)
    } catch (saveError) {
      console.error("Error guardando edición SOLRED:", saveError)
      setMensaje({ tipo: "error", texto: "Error inesperado al actualizar tarjeta SOLRED" })
    } finally {
      setGuardandoEdicion(false)
    }
  }

  const guardarEdicionViat = async (tarjeta: TarjetaViatAdmin) => {
    if (!edicionViat || guardandoEdicion) return

    const idNuevo = edicionViat.field === "id" ? edicionViat.value : tarjeta.id
    const fechaNueva = edicionViat.field === "fechacaducidad" ? edicionViat.value : tarjeta.fechacaducidad
    const activoNuevo = edicionViat.field === "activo" ? edicionViat.value === "true" : Boolean(tarjeta.activo)

    setGuardandoEdicion(true)
    setMensaje(null)
    try {
      const resultado = await actualizarTarjetaViatAdmin({
        idActual: tarjeta.id,
        idNuevo,
        fechaCaducidad: fechaNueva,
        activo: activoNuevo,
      })

      if (!resultado.success) {
        setMensaje({ tipo: "error", texto: resultado.error || "No se pudo actualizar la tarjeta ViaT" })
        return
      }

      setMensaje({ tipo: "success", texto: resultado.message || "Tarjeta ViaT actualizada correctamente" })
      setEdicionViat(null)
      await cargarDatos(true)
    } catch (saveError) {
      console.error("Error guardando edición ViaT:", saveError)
      setMensaje({ tipo: "error", texto: "Error inesperado al actualizar tarjeta ViaT" })
    } finally {
      setGuardandoEdicion(false)
    }
  }

  const abrirConfirmacionEliminacion = (tipo: "solred" | "viat", id: string) => {
    if (guardandoEdicion || eliminando) return
    cancelarEdicion()
    setMensaje(null)
    setErrorEliminacion("")
    setEliminacionPendiente({ tipo, id })
    setModalEliminarAbierto(true)
  }

  const confirmarEliminacion = async () => {
    if (!eliminacionPendiente || eliminando) return

    setEliminando(true)
    setErrorEliminacion("")
    setMensaje(null)
    try {
      const resultado =
        eliminacionPendiente.tipo === "solred"
          ? await eliminarTarjetaSolredAdmin(eliminacionPendiente.id)
          : await eliminarTarjetaViatAdmin(eliminacionPendiente.id)

      if (!resultado.success) {
        const errorTexto = resultado.error || "No se pudo eliminar la tarjeta"
        setErrorEliminacion(errorTexto)
        setMensaje({ tipo: "error", texto: errorTexto })
        return
      }

      setMensaje({ tipo: "success", texto: resultado.message || "Tarjeta eliminada correctamente" })
      setModalEliminarAbierto(false)
      setEliminacionPendiente(null)
      await cargarDatos(true)
    } catch (deleteError) {
      console.error("Error eliminando tarjeta:", deleteError)
      const errorTexto = "Error inesperado al eliminar tarjeta"
      setErrorEliminacion(errorTexto)
      setMensaje({ tipo: "error", texto: errorTexto })
    } finally {
      setEliminando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center text-gray-600">Cargando gestión de tarjetas...</CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error de acceso</h3>
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Tarjetas</h1>
            <p className="text-gray-600">Administración de tarjetas SOLRED y ViaT</p>
          </div>
          <Button type="button" variant="outline" onClick={() => cargarDatos(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white px-4 py-3 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-blue-600">{tarjetasSolred.length}</div>
            <div className="text-xs text-gray-600">Tarjetas SOLRED</div>
          </div>
          <div className="bg-white px-4 py-3 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-green-600">{tarjetasViat.length}</div>
            <div className="text-xs text-gray-600">Tarjetas ViaT</div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>
        )}

        {mensaje && (
          <div
            className={`p-4 rounded-md text-sm flex items-center gap-2 ${
              mensaje.tipo === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {mensaje.tipo === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{mensaje.texto}</span>
          </div>
        )}

        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Tarjetas SOLRED
              </CardTitle>
              <CardDescription>Alta y consulta de tarjetas SOLRED</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={handleCrearSolred} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="solred-numero">Número</Label>
                  <Input
                    id="solred-numero"
                    value={solredNumero}
                    onChange={(e) => setSolredNumero(e.target.value.replace(/\D/g, "").slice(0, 20))}
                    placeholder="Solo dígitos"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="solred-pin">PIN</Label>
                  <Input
                    id="solred-pin"
                    value={solredPin}
                    onChange={(e) => setSolredPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="4 dígitos"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="solred-fecha">Vencimiento</Label>
                  <Input
                    id="solred-fecha"
                    type="date"
                    value={solredFecha}
                    onChange={(e) => setSolredFecha(e.target.value)}
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <Button type="submit" disabled={creandoSolred}>
                    {creandoSolred ? "Creando..." : "Añadir Tarjeta SOLRED"}
                  </Button>
                </div>
              </form>

              <Table className="text-xs sm:text-sm [&_th]:px-2 [&_td]:px-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>PIN</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[120px]">Matrícula</TableHead>
                    <TableHead className="w-[88px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tarjetasSolred.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        No hay tarjetas SOLRED registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tarjetasSolred.map((tarjeta) => (
                      <TableRow key={tarjeta.numero_tarjeta}>
                        <TableCell
                          className="font-medium cursor-pointer"
                          title="Doble clic para editar"
                          onDoubleClick={() => iniciarEdicionSolred(tarjeta, "numero_tarjeta")}
                        >
                          {edicionSolred?.rowKey === tarjeta.numero_tarjeta && edicionSolred.field === "numero_tarjeta" ? (
                            <Input
                              autoFocus
                              value={edicionSolred.value}
                              onChange={(e) =>
                                setEdicionSolred((prev) =>
                                  prev
                                    ? { ...prev, value: e.target.value.replace(/\D/g, "").slice(0, 20) }
                                    : prev,
                                )
                              }
                              onBlur={() => {
                                void guardarEdicionSolred(tarjeta)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  void guardarEdicionSolred(tarjeta)
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault()
                                  cancelarEdicion()
                                }
                              }}
                            />
                          ) : (
                            tarjeta.numero_tarjeta
                          )}
                        </TableCell>
                        <TableCell
                          className="cursor-pointer"
                          title="Doble clic para editar"
                          onDoubleClick={() => iniciarEdicionSolred(tarjeta, "pin")}
                        >
                          {edicionSolred?.rowKey === tarjeta.numero_tarjeta && edicionSolred.field === "pin" ? (
                            <Input
                              autoFocus
                              value={edicionSolred.value}
                              onChange={(e) =>
                                setEdicionSolred((prev) =>
                                  prev ? { ...prev, value: e.target.value.replace(/\D/g, "").slice(0, 4) } : prev,
                                )
                              }
                              onBlur={() => {
                                void guardarEdicionSolred(tarjeta)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  void guardarEdicionSolred(tarjeta)
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault()
                                  cancelarEdicion()
                                }
                              }}
                            />
                          ) : (
                            String(tarjeta.pin || "").trim()
                          )}
                        </TableCell>
                        <TableCell
                          className="cursor-pointer"
                          title="Doble clic para editar"
                          onDoubleClick={() => iniciarEdicionSolred(tarjeta, "fechavencimiento")}
                        >
                          {edicionSolred?.rowKey === tarjeta.numero_tarjeta && edicionSolred.field === "fechavencimiento" ? (
                            <Input
                              autoFocus
                              type="date"
                              value={edicionSolred.value}
                              onChange={(e) =>
                                setEdicionSolred((prev) => (prev ? { ...prev, value: e.target.value } : prev))
                              }
                              onBlur={() => {
                                void guardarEdicionSolred(tarjeta)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  void guardarEdicionSolred(tarjeta)
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault()
                                  cancelarEdicion()
                                }
                              }}
                            />
                          ) : (
                            formatearFecha(tarjeta.fechavencimiento)
                          )}
                        </TableCell>
                        <TableCell
                          className="cursor-pointer"
                          title="Doble clic para editar"
                          onDoubleClick={() => iniciarEdicionSolred(tarjeta, "activa")}
                        >
                          {edicionSolred?.rowKey === tarjeta.numero_tarjeta && edicionSolred.field === "activa" ? (
                            <select
                              autoFocus
                              value={edicionSolred.value}
                              onChange={(e) =>
                                setEdicionSolred((prev) => (prev ? { ...prev, value: e.target.value } : prev))
                              }
                              onBlur={() => {
                                void guardarEdicionSolred(tarjeta)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  void guardarEdicionSolred(tarjeta)
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault()
                                  cancelarEdicion()
                                }
                              }}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                            >
                              <option value="true">Activa</option>
                              <option value="false">Inactiva</option>
                            </select>
                          ) : (
                            <Badge variant={tarjeta.activa ? "default" : "secondary"}>
                              {tarjeta.activa ? "Activa" : "Inactiva"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap">
                          {tarjeta.matricula_asignada ? tarjeta.matricula_asignada : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            title={`Eliminar tarjeta SOLRED ${tarjeta.numero_tarjeta}`}
                            aria-label={`Eliminar tarjeta SOLRED ${tarjeta.numero_tarjeta}`}
                            onClick={() => abrirConfirmacionEliminacion("solred", tarjeta.numero_tarjeta)}
                            disabled={guardandoEdicion || eliminando}
                            className="text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <p className="text-xs text-gray-500">Doble clic en una celda para editarla.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WalletCards className="h-5 w-5" />
                Tarjetas ViaT
              </CardTitle>
              <CardDescription>Alta y consulta de tarjetas ViaT</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={handleCrearViat} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label htmlFor="viat-id">ID Tarjeta</Label>
                  <Input
                    id="viat-id"
                    value={viatId}
                    onChange={(e) => setViatId(e.target.value.replace(/\D/g, "").slice(0, 16))}
                    placeholder="1 a 16 dígitos"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="viat-fecha">Caducidad</Label>
                  <Input
                    id="viat-fecha"
                    type="date"
                    value={viatFecha}
                    onChange={(e) => setViatFecha(e.target.value)}
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <Button type="submit" disabled={creandoViat}>
                    {creandoViat ? "Creando..." : "Añadir Tarjeta ViaT"}
                  </Button>
                </div>
              </form>

              <Table className="text-xs sm:text-sm [&_th]:px-2 [&_td]:px-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Caducidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[120px]">Matrícula</TableHead>
                    <TableHead className="w-[88px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tarjetasViat.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        No hay tarjetas ViaT registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tarjetasViat.map((tarjeta) => (
                      <TableRow key={tarjeta.id}>
                        <TableCell
                          className="font-medium cursor-pointer"
                          title="Doble clic para editar"
                          onDoubleClick={() => iniciarEdicionViat(tarjeta, "id")}
                        >
                          {edicionViat?.rowKey === tarjeta.id && edicionViat.field === "id" ? (
                            <Input
                              autoFocus
                              value={edicionViat.value}
                              onChange={(e) =>
                                setEdicionViat((prev) =>
                                  prev ? { ...prev, value: e.target.value.replace(/\D/g, "").slice(0, 16) } : prev,
                                )
                              }
                              onBlur={() => {
                                void guardarEdicionViat(tarjeta)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  void guardarEdicionViat(tarjeta)
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault()
                                  cancelarEdicion()
                                }
                              }}
                            />
                          ) : (
                            tarjeta.id
                          )}
                        </TableCell>
                        <TableCell
                          className="cursor-pointer"
                          title="Doble clic para editar"
                          onDoubleClick={() => iniciarEdicionViat(tarjeta, "fechacaducidad")}
                        >
                          {edicionViat?.rowKey === tarjeta.id && edicionViat.field === "fechacaducidad" ? (
                            <Input
                              autoFocus
                              type="date"
                              value={edicionViat.value}
                              onChange={(e) =>
                                setEdicionViat((prev) => (prev ? { ...prev, value: e.target.value } : prev))
                              }
                              onBlur={() => {
                                void guardarEdicionViat(tarjeta)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  void guardarEdicionViat(tarjeta)
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault()
                                  cancelarEdicion()
                                }
                              }}
                            />
                          ) : (
                            formatearFecha(tarjeta.fechacaducidad)
                          )}
                        </TableCell>
                        <TableCell
                          className="cursor-pointer"
                          title="Doble clic para editar"
                          onDoubleClick={() => iniciarEdicionViat(tarjeta, "activo")}
                        >
                          {edicionViat?.rowKey === tarjeta.id && edicionViat.field === "activo" ? (
                            <select
                              autoFocus
                              value={edicionViat.value}
                              onChange={(e) => setEdicionViat((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
                              onBlur={() => {
                                void guardarEdicionViat(tarjeta)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  void guardarEdicionViat(tarjeta)
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault()
                                  cancelarEdicion()
                                }
                              }}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                            >
                              <option value="true">Activa</option>
                              <option value="false">Inactiva</option>
                            </select>
                          ) : (
                            <Badge variant={tarjeta.activo ? "default" : "secondary"}>
                              {tarjeta.activo ? "Activa" : "Inactiva"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap">
                          {tarjeta.matricula_asignada ? tarjeta.matricula_asignada : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            title={`Eliminar tarjeta ViaT ${tarjeta.id}`}
                            aria-label={`Eliminar tarjeta ViaT ${tarjeta.id}`}
                            onClick={() => abrirConfirmacionEliminacion("viat", tarjeta.id)}
                            disabled={guardandoEdicion || eliminando}
                            className="text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <p className="text-xs text-gray-500">Doble clic en una celda para editarla.</p>
            </CardContent>
          </Card>
        </div>

        <AlertDialog
          open={modalEliminarAbierto}
          onOpenChange={(open) => {
            if (eliminando) return
            setModalEliminarAbierto(open)
            if (!open) {
              setEliminacionPendiente(null)
              setErrorEliminacion("")
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
              <AlertDialogDescription>
                {eliminacionPendiente
                  ? `¿Seguro que quieres eliminar la tarjeta ${
                      eliminacionPendiente.tipo === "solred" ? "SOLRED" : "ViaT"
                    } ${eliminacionPendiente.id}? Esta acción no se puede deshacer.`
                  : "¿Seguro que quieres eliminar esta tarjeta?"}
              </AlertDialogDescription>
              {errorEliminacion && <p className="text-sm text-red-600">{errorEliminacion}</p>}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault()
                  void confirmarEliminacion()
                }}
                disabled={eliminando || !eliminacionPendiente}
                className="bg-red-600 hover:bg-red-700"
              >
                {eliminando ? "Eliminando..." : "Eliminar tarjeta"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
