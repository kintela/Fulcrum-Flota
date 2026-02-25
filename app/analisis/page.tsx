import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { authOptions } from "@/lib/auth"
import { supabaseServer as supabase } from "@/lib/supabase-server"
import { esRolAdministrador } from "@/lib/user-role"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertTriangle,
  BarChart3,
  Car,
  ClipboardList,
  MessageSquareWarning,
  Sparkles,
  Users,
} from "lucide-react"

type ReservaAnalisis = {
  id: number
  matricula?: string | null
  empleado_id?: number | null
  estado?: string | null
  fecha_inicio?: string | null
  fecha_fin?: string | null
  created_at?: string | null
  limpieza?: string | null
  quejas?: string | null
  empleados?: any
  coches?: any
}

type EstadoStats = {
  activa: number
  pendiente: number
  completada: number
  cancelada: number
  vencida: number
  otros: number
}

function estadoVacio(): EstadoStats {
  return {
    activa: 0,
    pendiente: 0,
    completada: 0,
    cancelada: 0,
    vencida: 0,
    otros: 0,
  }
}

function normalizarEstado(estado: unknown): keyof EstadoStats {
  const valor = String(estado || "").trim().toLowerCase()
  if (valor === "activa") return "activa"
  if (valor === "pendiente") return "pendiente"
  if (valor === "completada") return "completada"
  if (valor === "cancelada") return "cancelada"
  if (valor === "vencida") return "vencida"
  return "otros"
}

function extraerObjetoRelacion(value: any) {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function nombreEmpleado(row: ReservaAnalisis) {
  const empleado = extraerObjetoRelacion(row.empleados)
  const nombre = String(empleado?.nombre || "").trim()
  const apellidos = String(empleado?.apellidos || "").trim()
  const email = String(empleado?.email || "").trim()
  const nombreCompleto = [nombre, apellidos].filter(Boolean).join(" ").trim()
  return {
    nombre: nombreCompleto || email || `Empleado #${row.empleado_id ?? "?"}`,
    email: email || "Sin email",
  }
}

function nombreCoche(row: ReservaAnalisis) {
  const coche = extraerObjetoRelacion(row.coches)
  const matricula = String(row.matricula || coche?.matricula || "Sin matrícula")
  const marca = String(coche?.marca || "").trim()
  const modelo = String(coche?.modelo || "").trim()
  const nombre = [marca, modelo].filter(Boolean).join(" ").trim()
  return {
    matricula,
    nombre: nombre || "Sin modelo",
  }
}

function formatFecha(fecha: string | null | undefined) {
  if (!fecha) return "—"
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatPct(valor: number) {
  return `${(valor * 100).toFixed(0)}%`
}

function formatTextoQueja(texto: string, max = 120) {
  const limpio = texto.replace(/\s+/g, " ").trim()
  if (limpio.length <= max) return limpio
  return `${limpio.slice(0, max - 1)}…`
}

function EstadoBadge({ estado }: { estado: string }) {
  const e = estado.toLowerCase()
  const className =
    e === "activa"
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : e === "pendiente"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : e === "completada"
          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
          : e === "cancelada"
            ? "bg-gray-100 text-gray-700 border-gray-200"
            : e === "vencida"
              ? "bg-rose-100 text-rose-800 border-rose-200"
              : "bg-slate-100 text-slate-700 border-slate-200"

  return (
    <Badge className={className}>
      {estado}
    </Badge>
  )
}

function LimpiezaBadge({ label, tone }: { label: string; tone: "bien" | "regular" | "mal" }) {
  const l = tone
  const className =
    l === "bien"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : l === "regular"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-rose-100 text-rose-800 border-rose-200"
  return <Badge className={className}>{label}</Badge>
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
            {subtitle ? <p className="mt-1 text-xs text-gray-500">{subtitle}</p> : null}
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function MiniBar({ label, value, total, colorClass }: { label: string; value: number; total: number; colorClass: string }) {
  const ratio = total > 0 ? value / total : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium text-gray-900">
          {value} {total > 0 ? `(${formatPct(ratio)})` : ""}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}

async function obtenerReservasParaAnalisis() {
  const selectConFeedback = `
    id,
    matricula,
    empleado_id,
    estado,
    fecha_inicio,
    fecha_fin,
    created_at,
    limpieza,
    quejas,
    empleados!inner (
      id,
      nombre,
      apellidos,
      email
    ),
    coches!inner (
      matricula,
      marca,
      modelo
    )
  `

  let includeFeedbackFields = true
  let warning: string | null = null

  let { data, error } = await supabase.from("reservas").select(selectConFeedback)

  if (error && /(limpieza|quejas)/i.test(error.message || "")) {
    includeFeedbackFields = false
    warning =
      "No se han podido cargar métricas de limpieza/quejas porque faltan esas columnas en la tabla reservas."

    const fallbackSelect = `
      id,
      matricula,
      empleado_id,
      estado,
      fecha_inicio,
      fecha_fin,
      created_at,
      empleados!inner (
        id,
        nombre,
        apellidos,
        email
      ),
      coches!inner (
        matricula,
        marca,
        modelo
      )
    `

    const fallback = await supabase.from("reservas").select(fallbackSelect)
    data = fallback.data
    error = fallback.error
  }

  return {
    data: (data || []) as ReservaAnalisis[],
    error,
    includeFeedbackFields,
    warning,
  }
}

export default async function AnalisisPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email || !esRolAdministrador(session.user.role)) {
    redirect("/")
  }

  const { data: reservas, error, includeFeedbackFields, warning } = await obtenerReservasParaAnalisis()

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-7xl">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">Error cargando análisis</CardTitle>
              <CardDescription className="text-red-700">
                No se pudieron obtener los datos de reservas para el panel de análisis.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-red-700">
              {error.message}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const resumenEstados = estadoVacio()

  const usuariosMap = new Map<
    number,
    {
      empleadoId: number
      nombre: string
      email: string
      total: number
      estados: EstadoStats
      ultimaReserva: string | null
    }
  >()

  const cochesMap = new Map<
    string,
    {
      matricula: string
      nombre: string
      total: number
      estados: EstadoStats
      ultimaReserva: string | null
    }
  >()

  const limpiezaMap = new Map<
    string,
    {
      matricula: string
      nombre: string
      total: number
      bien: number
      regular: number
      mal: number
    }
  >()

  const quejasPorCoche = new Map<
    string,
    {
      matricula: string
      nombre: string
      total: number
    }
  >()

  const quejasPorUsuario = new Map<
    number,
    {
      empleadoId: number
      nombre: string
      email: string
      total: number
    }
  >()

  const listaQuejas: Array<{
    id: number
    queja: string
    fecha: string | null
    cocheMatricula: string
    cocheNombre: string
    empleadoNombre: string
    estado: string
  }> = []

  let totalQuejas = 0
  let totalReservasConLimpieza = 0
  const limpiezaGlobal = { bien: 0, regular: 0, mal: 0 }

  for (const reserva of reservas) {
    const estadoKey = normalizarEstado(reserva.estado)
    resumenEstados[estadoKey] += 1

    const empleadoInfo = nombreEmpleado(reserva)
    const cocheInfo = nombreCoche(reserva)

    const empleadoId = Number(reserva.empleado_id || 0)
    if (empleadoId > 0) {
      const actualUsuario =
        usuariosMap.get(empleadoId) ||
        {
          empleadoId,
          nombre: empleadoInfo.nombre,
          email: empleadoInfo.email,
          total: 0,
          estados: estadoVacio(),
          ultimaReserva: null as string | null,
        }

      actualUsuario.total += 1
      actualUsuario.estados[estadoKey] += 1
      if (!actualUsuario.ultimaReserva || String(reserva.fecha_inicio || "") > actualUsuario.ultimaReserva) {
        actualUsuario.ultimaReserva = reserva.fecha_inicio || null
      }
      usuariosMap.set(empleadoId, actualUsuario)
    }

    if (cocheInfo.matricula) {
      const actualCoche =
        cochesMap.get(cocheInfo.matricula) ||
        {
          matricula: cocheInfo.matricula,
          nombre: cocheInfo.nombre,
          total: 0,
          estados: estadoVacio(),
          ultimaReserva: null as string | null,
        }

      actualCoche.total += 1
      actualCoche.estados[estadoKey] += 1
      if (!actualCoche.ultimaReserva || String(reserva.fecha_inicio || "") > actualCoche.ultimaReserva) {
        actualCoche.ultimaReserva = reserva.fecha_inicio || null
      }
      cochesMap.set(cocheInfo.matricula, actualCoche)
    }

    if (includeFeedbackFields) {
      const limpieza = String(reserva.limpieza || "").trim().toLowerCase()
      if (limpieza === "bien" || limpieza === "regular" || limpieza === "mal") {
        totalReservasConLimpieza += 1
        limpiezaGlobal[limpieza] += 1

        const actualLimpieza =
          limpiezaMap.get(cocheInfo.matricula) ||
          {
            matricula: cocheInfo.matricula,
            nombre: cocheInfo.nombre,
            total: 0,
            bien: 0,
            regular: 0,
            mal: 0,
          }

        actualLimpieza.total += 1
        actualLimpieza[limpieza] += 1
        limpiezaMap.set(cocheInfo.matricula, actualLimpieza)
      }

      const queja = String(reserva.quejas || "").trim()
      if (queja) {
        totalQuejas += 1
        listaQuejas.push({
          id: reserva.id,
          queja,
          fecha: reserva.fecha_fin || reserva.created_at || null,
          cocheMatricula: cocheInfo.matricula,
          cocheNombre: cocheInfo.nombre,
          empleadoNombre: empleadoInfo.nombre,
          estado: String(reserva.estado || "sin_estado"),
        })

        const qCoche =
          quejasPorCoche.get(cocheInfo.matricula) ||
          { matricula: cocheInfo.matricula, nombre: cocheInfo.nombre, total: 0 }
        qCoche.total += 1
        quejasPorCoche.set(cocheInfo.matricula, qCoche)

        if (empleadoId > 0) {
          const qUsuario =
            quejasPorUsuario.get(empleadoId) ||
            { empleadoId, nombre: empleadoInfo.nombre, email: empleadoInfo.email, total: 0 }
          qUsuario.total += 1
          quejasPorUsuario.set(empleadoId, qUsuario)
        }
      }
    }
  }

  const topUsuarios = Array.from(usuariosMap.values())
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre))
    .slice(0, 10)

  const topCoches = Array.from(cochesMap.values())
    .sort((a, b) => b.total - a.total || a.matricula.localeCompare(b.matricula))
    .slice(0, 10)

  const rankingLimpieza = Array.from(limpiezaMap.values())
    .map((item) => {
      const puntuacion = item.total > 0 ? (item.bien * 2 + item.regular) / (item.total * 2) : 0
      return { ...item, puntuacion }
    })
    .sort((a, b) => a.puntuacion - b.puntuacion || b.mal - a.mal || b.total - a.total)

  const peoresCochesLimpieza = rankingLimpieza.slice(0, 10)
  const mejoresCochesLimpieza = [...rankingLimpieza]
    .sort((a, b) => b.puntuacion - a.puntuacion || b.bien - a.bien || b.total - a.total)
    .slice(0, 5)

  const topCochesConQuejas = Array.from(quejasPorCoche.values())
    .sort((a, b) => b.total - a.total || a.matricula.localeCompare(b.matricula))
    .slice(0, 10)

  const topUsuariosConQuejas = Array.from(quejasPorUsuario.values())
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre))
    .slice(0, 10)

  const ultimasQuejas = listaQuejas
    .sort((a, b) => {
      const fa = a.fecha ? new Date(a.fecha).getTime() : 0
      const fb = b.fecha ? new Date(b.fecha).getTime() : 0
      return fb - fa
    })
    .slice(0, 12)

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
              <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <BarChart3 className="h-7 w-7" />
              </span>
              Análisis
            </h1>
            <p className="mt-2 text-gray-600">
              Panel histórico de reservas, limpieza y quejas para detectar patrones de uso de la flota.
            </p>
          </div>
          <Badge className="border-blue-200 bg-blue-100 text-blue-800">
            {reservas.length} reservas analizadas
          </Badge>
        </div>

        {warning ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-start gap-3 p-4 text-amber-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="text-sm">{warning}</div>
            </CardContent>
          </Card>
        ) : null}

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Reservas"
            value={reservas.length}
            subtitle="Histórico completo"
            icon={<ClipboardList className="h-6 w-6" />}
          />
          <StatCard
            title="Usuarios con Reservas"
            value={usuariosMap.size}
            subtitle="Empleados distintos"
            icon={<Users className="h-6 w-6" />}
          />
          <StatCard
            title="Coches Utilizados"
            value={cochesMap.size}
            subtitle="Vehículos con al menos una reserva"
            icon={<Car className="h-6 w-6" />}
          />
          <StatCard
            title="Reservas con Quejas"
            value={includeFeedbackFields ? totalQuejas : "—"}
            subtitle={includeFeedbackFields ? "Con texto en campo quejas" : "Columnas no disponibles"}
            icon={<MessageSquareWarning className="h-6 w-6" />}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl">Usuarios que más reservas hacen</CardTitle>
              <CardDescription>Ranking por número total de reservas registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 pr-4">Empleado</th>
                      <th className="py-2 pr-4">Total</th>
                      <th className="py-2 pr-4">Completadas</th>
                      <th className="py-2 pr-4">Canceladas</th>
                      <th className="py-2 pr-4">Pendientes</th>
                      <th className="py-2 pr-0">Última reserva</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsuarios.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-gray-500">
                          No hay reservas registradas.
                        </td>
                      </tr>
                    ) : (
                      topUsuarios.map((u) => (
                        <tr key={u.empleadoId} className="border-b last:border-b-0">
                          <td className="py-3 pr-4">
                            <div className="font-medium text-gray-900">{u.nombre}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </td>
                          <td className="py-3 pr-4 font-semibold text-gray-900">{u.total}</td>
                          <td className="py-3 pr-4">{u.estados.completada}</td>
                          <td className="py-3 pr-4">{u.estados.cancelada}</td>
                          <td className="py-3 pr-4">{u.estados.pendiente}</td>
                          <td className="py-3 pr-0 text-gray-600">{formatFecha(u.ultimaReserva)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Estado de Reservas</CardTitle>
              <CardDescription>Distribución por estado actual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <MiniBar label="Activas" value={resumenEstados.activa} total={reservas.length} colorClass="bg-blue-500" />
              <MiniBar label="Pendientes" value={resumenEstados.pendiente} total={reservas.length} colorClass="bg-amber-500" />
              <MiniBar label="Completadas" value={resumenEstados.completada} total={reservas.length} colorClass="bg-emerald-500" />
              <MiniBar label="Canceladas" value={resumenEstados.cancelada} total={reservas.length} colorClass="bg-gray-500" />
              <MiniBar label="Vencidas" value={resumenEstados.vencida} total={reservas.length} colorClass="bg-rose-500" />
              {resumenEstados.otros > 0 ? (
                <MiniBar label="Otros" value={resumenEstados.otros} total={reservas.length} colorClass="bg-slate-500" />
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Coches más reservados</CardTitle>
              <CardDescription>Vehículos con mayor número de reservas acumuladas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 pr-4">Coche</th>
                      <th className="py-2 pr-4">Reservas</th>
                      <th className="py-2 pr-4">Completadas</th>
                      <th className="py-2 pr-4">Canceladas</th>
                      <th className="py-2 pr-0">Última reserva</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCoches.map((c) => (
                      <tr key={c.matricula} className="border-b last:border-b-0">
                        <td className="py-3 pr-4">
                          <div className="font-medium text-gray-900">{c.matricula}</div>
                          <div className="text-xs text-gray-500">{c.nombre}</div>
                        </td>
                        <td className="py-3 pr-4 font-semibold text-gray-900">{c.total}</td>
                        <td className="py-3 pr-4">{c.estados.completada}</td>
                        <td className="py-3 pr-4">{c.estados.cancelada}</td>
                        <td className="py-3 pr-0 text-gray-600">{formatFecha(c.ultimaReserva)}</td>
                      </tr>
                    ))}
                    {topCoches.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-500">
                          No hay datos.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Limpieza (global)
              </CardTitle>
              <CardDescription>
                Distribución de evaluaciones de limpieza en reservas con feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {includeFeedbackFields ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                      <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Bien</div>
                      <div className="mt-1 text-2xl font-bold text-emerald-900">{limpiezaGlobal.bien}</div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                      <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Regular</div>
                      <div className="mt-1 text-2xl font-bold text-amber-900">{limpiezaGlobal.regular}</div>
                    </div>
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-center">
                      <div className="text-xs font-medium uppercase tracking-wide text-rose-700">Mal</div>
                      <div className="mt-1 text-2xl font-bold text-rose-900">{limpiezaGlobal.mal}</div>
                    </div>
                  </div>
                  <MiniBar
                    label="Cobertura de limpieza"
                    value={totalReservasConLimpieza}
                    total={reservas.length}
                    colorClass="bg-indigo-500"
                  />
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Mejor valorados</div>
                    {mejoresCochesLimpieza.length === 0 ? (
                      <div className="text-sm text-gray-500">No hay evaluaciones de limpieza todavía.</div>
                    ) : (
                      mejoresCochesLimpieza.map((c) => (
                        <div
                          key={`mejor-${c.matricula}`}
                          className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                        >
                          <div>
                            <div className="font-medium text-gray-900">{c.matricula}</div>
                            <div className="text-xs text-gray-500">{c.nombre}</div>
                          </div>
                          <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
                            {formatPct(c.puntuacion)} ({c.total})
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  Métricas de limpieza no disponibles (faltan columnas `limpieza` y/o `quejas`).
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {includeFeedbackFields ? (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Coches con peor limpieza reportada</CardTitle>
                <CardDescription>
                  Ranking por puntuación de limpieza (bien=2, regular=1, mal=0)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2 pr-4">Coche</th>
                        <th className="py-2 pr-4">Evaluaciones</th>
                        <th className="py-2 pr-4">Detalle</th>
                        <th className="py-2 pr-0">Puntuación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {peoresCochesLimpieza.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-gray-500">
                            No hay evaluaciones de limpieza.
                          </td>
                        </tr>
                      ) : (
                        peoresCochesLimpieza.map((c) => (
                          <tr key={c.matricula} className="border-b last:border-b-0">
                            <td className="py-3 pr-4">
                              <div className="font-medium text-gray-900">{c.matricula}</div>
                              <div className="text-xs text-gray-500">{c.nombre}</div>
                            </td>
                            <td className="py-3 pr-4">{c.total}</td>
                            <td className="py-3 pr-4">
                              <div className="flex flex-wrap gap-1">
                                {c.bien > 0 ? <LimpiezaBadge label={`bien (${c.bien})`} tone="bien" /> : null}
                                {c.regular > 0 ? <LimpiezaBadge label={`regular (${c.regular})`} tone="regular" /> : null}
                                {c.mal > 0 ? <LimpiezaBadge label={`mal (${c.mal})`} tone="mal" /> : null}
                              </div>
                            </td>
                            <td className="py-3 pr-0">
                              <Badge
                                className={
                                  c.puntuacion >= 0.75
                                    ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                                    : c.puntuacion >= 0.45
                                      ? "border-amber-200 bg-amber-100 text-amber-800"
                                      : "border-rose-200 bg-rose-100 text-rose-800"
                                }
                              >
                                {formatPct(c.puntuacion)}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MessageSquareWarning className="h-5 w-5 text-rose-600" />
                  Quejas
                </CardTitle>
                <CardDescription>Frecuencia de reservas con quejas registradas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                    <div className="text-sm font-medium text-rose-700">Total reservas con quejas</div>
                    <div className="mt-1 text-2xl font-bold text-rose-900">{totalQuejas}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="text-sm font-medium text-gray-600">Usuarios con quejas</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">{quejasPorUsuario.size}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-800">Coches con más quejas</div>
                  {topCochesConQuejas.length === 0 ? (
                    <div className="text-sm text-gray-500">No hay quejas registradas.</div>
                  ) : (
                    topCochesConQuejas.slice(0, 5).map((item) => (
                      <div key={`q-coche-${item.matricula}`} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div>
                          <div className="font-medium text-gray-900">{item.matricula}</div>
                          <div className="text-xs text-gray-500">{item.nombre}</div>
                        </div>
                        <Badge className="border-rose-200 bg-rose-100 text-rose-800">{item.total}</Badge>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-800">Usuarios con más quejas registradas</div>
                  {topUsuariosConQuejas.length === 0 ? (
                    <div className="text-sm text-gray-500">No hay quejas registradas.</div>
                  ) : (
                    topUsuariosConQuejas.slice(0, 5).map((item) => (
                      <div key={`q-user-${item.empleadoId}`} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div>
                          <div className="font-medium text-gray-900">{item.nombre}</div>
                          <div className="text-xs text-gray-500">{item.email}</div>
                        </div>
                        <Badge className="border-amber-200 bg-amber-100 text-amber-800">{item.total}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {includeFeedbackFields ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Últimas quejas registradas</CardTitle>
              <CardDescription>
                Muestra reciente para revisar incidencias de limpieza/uso detectadas por los usuarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ultimasQuejas.length === 0 ? (
                  <div className="text-sm text-gray-500">No hay quejas registradas.</div>
                ) : (
                  ultimasQuejas.map((item) => (
                    <div key={`queja-${item.id}`} className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="border-gray-200 bg-gray-100 text-gray-800">
                            Reserva #{item.id}
                          </Badge>
                          <Badge className="border-blue-200 bg-blue-100 text-blue-800">
                            {item.cocheMatricula}
                          </Badge>
                          <EstadoBadge estado={item.estado} />
                        </div>
                        <div className="text-xs text-gray-500">{formatFecha(item.fecha)}</div>
                      </div>
                      <div className="text-sm text-gray-700">
                        <span className="font-medium text-gray-900">{item.empleadoNombre}</span>
                        {" · "}
                        {item.cocheNombre}
                      </div>
                      <p className="mt-2 text-sm text-gray-800">{formatTextoQueja(item.queja, 220)}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
