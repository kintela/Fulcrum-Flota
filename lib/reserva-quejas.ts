import { enviarEmailQuejaReservaAdministradores } from "@/lib/email"
import { supabaseServer as supabase } from "@/lib/supabase-server"

interface ReservaQuejaPayload {
  accion: "cancelada" | "completada"
  queja: string
  observacion?: string | null
  estadoLimpieza?: string | null
  reserva: {
    id: number
    matricula: string
    fecha_inicio?: string | null
    fecha_fin?: string | null
    coches?: {
      marca?: string | null
      modelo?: string | null
    } | null
    empleados?: {
      nombre?: string | null
      apellidos?: string | null
      email?: string | null
    } | null
  }
  reportadaPor?: {
    nombre?: string | null
    apellidos?: string | null
    email?: string | null
  } | null
}

function nombreCompleto(persona?: { nombre?: string | null; apellidos?: string | null } | null) {
  return [persona?.nombre, persona?.apellidos].filter(Boolean).join(" ").trim() || null
}

export async function notificarQuejaReservaAdministradores(payload: ReservaQuejaPayload) {
  const queja = payload.queja.trim()

  if (!queja) {
    return { success: true, skipped: true as const }
  }

  const { data: empleados, error: empleadosError } = await supabase
    .from("empleados")
    .select("email, role")

  if (empleadosError) {
    console.error("❌ Error obteniendo administradores para quejas de reserva:", empleadosError)
    return { success: false, error: "Error obteniendo administradores" }
  }

  const destinatarios = Array.from(
    new Set(
      (empleados || [])
        .filter((empleado: any) => {
          const role = String(empleado.role || "").toLowerCase()
          return role === "administrador" || role === "admin"
        })
        .map((empleado: any) => String(empleado.email || "").trim())
        .filter((email: string) => email.length > 3),
    ),
  )

  if (destinatarios.length === 0) {
    return { success: false, error: "No hay administradores con email para avisar de la queja" }
  }

  const emailPayload = {
    accion: payload.accion,
    reservaId: payload.reserva.id,
    matricula: payload.reserva.matricula,
    marca: payload.reserva.coches?.marca,
    modelo: payload.reserva.coches?.modelo,
    fechaInicio: payload.reserva.fecha_inicio,
    fechaFin: payload.reserva.fecha_fin,
    titularNombre: nombreCompleto(payload.reserva.empleados),
    titularEmail: payload.reserva.empleados?.email || null,
    reportadaPorNombre: nombreCompleto(payload.reportadaPor),
    reportadaPorEmail: payload.reportadaPor?.email || null,
    observacion: payload.observacion,
    estadoLimpieza: payload.estadoLimpieza,
    queja,
  } as const

  const fallidos: Array<{ email: string; error?: string }> = []
  let enviados = 0
  const maxIntentos = 3

  const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const esErrorTemporal = (mensaje?: string) =>
    Boolean(
      mensaje &&
        /temporary server error|responsecode 451|\b451\b|ECONNRESET|ESOCKET|ETIMEDOUT|EPIPE/i.test(mensaje),
    )

  for (const email of destinatarios) {
    for (let intento = 1; intento <= maxIntentos; intento += 1) {
      const resultado = await enviarEmailQuejaReservaAdministradores(email, emailPayload)

      if (resultado.success) {
        enviados += 1
        break
      }

      if (!esErrorTemporal(resultado.error) || intento === maxIntentos) {
        fallidos.push({ email, error: resultado.error })
        break
      }

      await esperar(2000 * intento)
    }

    await esperar(1200)
  }

  if (enviados === 0) {
    return {
      success: false,
      error: "No se pudo enviar la queja a ningún administrador",
      errors: fallidos,
    }
  }

  return {
    success: true,
    sent: enviados,
    failed: fallidos.length,
    errors: fallidos,
  }
}
