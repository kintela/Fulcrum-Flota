"use client"

import { useEffect, useMemo, useState } from "react"
import { Car, CheckCircle2, Loader2, LocateFixed, MapPin, X } from "lucide-react"

import { cancelarReserva, obtenerReservasUsuario } from "@/app/actions/reservas-temporales"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { capturarYAsignarUbicacion, type Ubicacion } from "@/lib/ubicacion-utils"

interface ReservaActiva {
  id: number
  matricula: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
  coches?: {
    matricula?: string
    marca?: string
    modelo?: string
  } | null
}

type EstadoProceso = "preparado" | "ubicando" | "cancelando" | "completado" | "error"

function estaEnCurso(reserva: ReservaActiva, ahora: number) {
  return (
    reserva.estado === "activa" &&
    new Date(reserva.fecha_inicio).getTime() <= ahora &&
    new Date(reserva.fecha_fin).getTime() >= ahora
  )
}

function crearReservaDeMuestra(): ReservaActiva {
  const ahora = Date.now()

  return {
    id: -1,
    matricula: "1234-ABC",
    fecha_inicio: new Date(ahora - 30 * 60_000).toISOString(),
    fecha_fin: new Date(ahora + 30 * 60_000).toISOString(),
    estado: "activa",
    coches: {
      matricula: "1234-ABC",
      marca: "Renault",
      modelo: "Clio E-Tech",
    },
  }
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function MobileActiveReservation({
  onReservaCancelada,
  onUbicacionActualizada,
}: {
  onReservaCancelada?: () => void
  onUbicacionActualizada?: (matricula: string, ubicacion: Ubicacion) => void
}) {
  const isMobile = useIsMobile()
  const [reserva, setReserva] = useState<ReservaActiva | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [estado, setEstado] = useState<EstadoProceso>("preparado")
  const [mensajeError, setMensajeError] = useState("")
  const [ubicacionGuardada, setUbicacionGuardada] = useState<Ubicacion | null>(null)
  const [modoVistaPrevia, setModoVistaPrevia] = useState(false)

  useEffect(() => {
    if (!isMobile) return

    let activo = true
    const abrirVistaPrevia = () => {
      if (!activo || process.env.NODE_ENV !== "development") return
      setModoVistaPrevia(true)
      setReserva(crearReservaDeMuestra())
      setAbierto(true)
    }

    obtenerReservasUsuario()
      .then((resultado) => {
        if (!activo) return
        if (!resultado.success) {
          abrirVistaPrevia()
          return
        }

        const ahora = Date.now()
        const reservaEnCurso = ((resultado.reservas || []) as ReservaActiva[])
          .filter((item) => estaEnCurso(item, ahora))
          .sort((a, b) => new Date(a.fecha_fin).getTime() - new Date(b.fecha_fin).getTime())[0]

        if (reservaEnCurso) {
          setReserva(reservaEnCurso)
          setAbierto(true)
        } else {
          abrirVistaPrevia()
        }
      })
      .catch(() => {
        abrirVistaPrevia()
      })

    return () => {
      activo = false
    }
  }, [isMobile])

  const matricula = reserva?.coches?.matricula || reserva?.matricula || ""
  const nombreCoche = useMemo(
    () => [reserva?.coches?.marca, reserva?.coches?.modelo].filter(Boolean).join(" "),
    [reserva],
  )

  const ubicarYCancelar = async () => {
    if (!reserva || !matricula) return

    setMensajeError("")
    let ubicacion = ubicacionGuardada

    try {
      if (modoVistaPrevia) {
        setEstado("ubicando")
        await esperar(700)
        setEstado("cancelando")
        await esperar(700)
        setEstado("completado")
        return
      }

      if (!ubicacion) {
        setEstado("ubicando")
        const resultadoUbicacion = await capturarYAsignarUbicacion(matricula)

        if (!resultadoUbicacion.success || !resultadoUbicacion.ubicacion) {
          setEstado("error")
          setMensajeError(
            resultadoUbicacion.mensaje ||
              "No se ha podido obtener la ubicación. La reserva no se ha cancelado.",
          )
          return
        }

        ubicacion = resultadoUbicacion.ubicacion
        setUbicacionGuardada(ubicacion)
        onUbicacionActualizada?.(matricula, ubicacion)
      }

      setEstado("cancelando")
      const resultadoCancelacion = await cancelarReserva(reserva.id)

      if (!resultadoCancelacion.success) {
        setEstado("error")
        setMensajeError(
          `La ubicación se ha guardado, pero no se pudo cancelar la reserva. ${resultadoCancelacion.error || "Inténtalo de nuevo."}`,
        )
        return
      }

      setEstado("completado")
      onReservaCancelada?.()
    } catch {
      setEstado("error")
      setMensajeError(
        ubicacion
          ? "La ubicación se ha guardado, pero ha ocurrido un error al cancelar la reserva. Inténtalo de nuevo."
          : "Ha ocurrido un error y la reserva no se ha cancelado. Inténtalo de nuevo.",
      )
    }
  }

  const procesando = estado === "ubicando" || estado === "cancelando"

  if (!isMobile || !reserva) return null

  return (
    <Dialog open={abierto} onOpenChange={(open) => !procesando && setAbierto(open)}>
      <DialogContent
        aria-describedby="mobile-return-description"
        showCloseButton={false}
        className="left-0 top-auto bottom-0 h-[75dvh] max-h-[75dvh] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-t-[2rem] border-0 bg-white p-0 shadow-2xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:rounded-b-none sm:rounded-t-[2rem]"
      >
        <DialogClose asChild>
          <button
            type="button"
            disabled={procesando}
            aria-label="Cerrar y ver el dashboard"
            className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogClose>

        <div className="flex min-h-full flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8">
          {estado === "completado" ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-11 w-11 text-emerald-600" />
              </div>
              <DialogHeader className="items-center">
                <DialogTitle className="text-2xl text-slate-950">Coche ubicado</DialogTitle>
                <DialogDescription id="mobile-return-description" className="max-w-xs text-base leading-6 text-slate-600">
                  {modoVistaPrevia
                    ? "Simulación completada. En una reserva real se guardaría la ubicación y quedaría cancelada."
                    : `La ubicación de ${matricula} se ha guardado y la reserva ha quedado cancelada.`}
                </DialogDescription>
              </DialogHeader>
              <Button className="mt-8 h-12 w-full rounded-xl bg-slate-950 text-base hover:bg-slate-800" onClick={() => setAbierto(false)}>
                Ir al dashboard
              </Button>
            </div>
          ) : (
            <>
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <LocateFixed className="h-8 w-8 text-blue-600" />
              </div>

              <DialogHeader className="pr-10 text-left">
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">Fin de trayecto</p>
                  {modoVistaPrevia && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                      Vista previa
                    </span>
                  )}
                </div>
                <DialogTitle className="text-2xl leading-tight text-slate-950">¿Quieres devolver el coche ahora?</DialogTitle>
                <DialogDescription id="mobile-return-description" className="pt-2 text-base leading-6 text-slate-600">
                  {modoVistaPrevia
                    ? "Esta demostración simula cómo se ubicaría el vehículo y se cancelaría automáticamente la reserva activa."
                    : "Usaremos la ubicación de este móvil para situar el vehículo y cancelaremos automáticamente la reserva activa."}
                </DialogDescription>
              </DialogHeader>

              <div className="my-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Car className="h-5 w-5 text-slate-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold tracking-wide text-slate-950">{matricula}</p>
                    {nombreCoche && <p className="truncate text-sm text-slate-500">{nombreCoche}</p>}
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-2 border-t border-slate-200 pt-4 text-sm text-slate-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>
                    {modoVistaPrevia
                      ? "Modo seguro: no se pedirá el GPS ni se modificarán datos reales."
                      : "El navegador te pedirá permiso para acceder a la ubicación."}
                  </span>
                </div>
              </div>

              {mensajeError && (
                <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700">
                  {mensajeError}
                </div>
              )}

              <div className="mt-auto space-y-3">
                <Button
                  type="button"
                  disabled={procesando}
                  onClick={ubicarYCancelar}
                  className="h-14 w-full rounded-xl bg-blue-600 text-base font-semibold hover:bg-blue-700"
                >
                  {procesando ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {estado === "ubicando" ? "Obteniendo ubicación…" : "Cancelando reserva…"}
                    </>
                  ) : (
                    <>
                      <LocateFixed className="mr-2 h-5 w-5" />
                      {ubicacionGuardada ? "Reintentar cancelación" : "Ubicar coche y cancelar reserva"}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={procesando}
                  onClick={() => setAbierto(false)}
                  className="h-12 w-full rounded-xl text-base text-slate-600"
                >
                  Ahora no, ver dashboard
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
