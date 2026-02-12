"use server"

import { supabase } from "@/lib/supabase"
import { enviarEmailAlertasMantenimiento } from "@/lib/email"

interface MantenimientoConCoche {
  id: number
  matricula: string
  fecha_mantenimiento: string
  fecha_proximo: string
  kms_proximo: number
  notificacion_mantenimiento_vencido_enviada?: boolean | null
  notificacion_mantenimiento_proximo_enviada?: boolean | null
  coches?: {
    matricula: string
    marca: string
    modelo: string
    donante?: boolean | null
  } | null
}

interface MantenimientoAlerta {
  id: number
  matricula: string
  marca: string
  modelo: string
  fecha_proximo: string
  kms_proximo: number
  dias?: number
}

function ordenarMantenimientosPorReciente(a: MantenimientoConCoche, b: MantenimientoConCoche) {
  if (a.fecha_mantenimiento && b.fecha_mantenimiento) {
    return new Date(b.fecha_mantenimiento).getTime() - new Date(a.fecha_mantenimiento).getTime()
  }
  return b.id - a.id
}

export async function verificarAlertasMantenimiento() {
  try {
    const ahora = new Date()
    const limite = new Date()
    limite.setDate(ahora.getDate() + 30)

    const { data: mantenimientos, error } = await supabase
      .from("mantenimientos")
      .select(`
        id,
        matricula,
        fecha_mantenimiento,
        fecha_proximo,
        kms_proximo,
        notificacion_mantenimiento_vencido_enviada,
        notificacion_mantenimiento_proximo_enviada,
        coches (
          matricula,
          marca,
          modelo,
          donante
        )
      `)

    if (error) {
      console.error("❌ Error consultando mantenimientos:", error)
      return { success: false, error: "Error al consultar mantenimientos" }
    }

    const latestMantenimientos: MantenimientoConCoche[] = []
    const procesadas = new Set<string>()

    const sortedMantenimientos = (mantenimientos || []).sort(ordenarMantenimientosPorReciente)
    for (const mantenimiento of sortedMantenimientos) {
      if (!procesadas.has(mantenimiento.matricula)) {
        latestMantenimientos.push(mantenimiento)
        procesadas.add(mantenimiento.matricula)
      }
    }

    const alertasVencidas: MantenimientoAlerta[] = []
    const alertasProximas: MantenimientoAlerta[] = []

    for (const mantenimiento of latestMantenimientos) {
      if (mantenimiento.coches?.donante) continue

      const fechaProximo = new Date(mantenimiento.fecha_proximo)

      if (fechaProximo <= ahora) {
        if (!mantenimiento.notificacion_mantenimiento_vencido_enviada) {
          alertasVencidas.push({
            id: mantenimiento.id,
            matricula: mantenimiento.matricula,
            marca: mantenimiento.coches?.marca || "N/D",
            modelo: mantenimiento.coches?.modelo || "",
            fecha_proximo: mantenimiento.fecha_proximo,
            kms_proximo: mantenimiento.kms_proximo,
            dias: Math.ceil((fechaProximo.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)),
          })
        }
      } else if (fechaProximo <= limite) {
        if (!mantenimiento.notificacion_mantenimiento_proximo_enviada) {
          alertasProximas.push({
            id: mantenimiento.id,
            matricula: mantenimiento.matricula,
            marca: mantenimiento.coches?.marca || "N/D",
            modelo: mantenimiento.coches?.modelo || "",
            fecha_proximo: mantenimiento.fecha_proximo,
            kms_proximo: mantenimiento.kms_proximo,
            dias: Math.ceil((fechaProximo.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)),
          })
        }
      }
    }

    if (alertasVencidas.length === 0 && alertasProximas.length === 0) {
      return {
        success: true,
        message: "No hay alertas de mantenimientos pendientes",
        data: {
          mantenimientosVencidos: 0,
          mantenimientosProximos: 0,
          notificacionesEnviadas: 0,
          erroresEnvio: 0,
        },
      }
    }

    const { data: empleados, error: empleadosError } = await supabase
      .from("empleados")
      .select("email, role")

    if (empleadosError) {
      console.error("❌ Error obteniendo empleados administradores:", empleadosError)
      return { success: false, error: "Error obteniendo empleados administradores" }
    }

    const destinatarios = (empleados || [])
      .filter((emp: any) => {
        const role = String(emp.role || "").toLowerCase()
        return role === "administrador" || role === "admin"
      })
      .map((emp: any) => String(emp.email || "").trim())
      .filter((email: string) => email.length > 3)

    if (destinatarios.length === 0) {
      return { success: false, error: "No hay administradores con email para enviar alertas" }
    }

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
        const resultadoEmail = await enviarEmailAlertasMantenimiento(email, {
          vencidas: alertasVencidas,
          proximas: alertasProximas,
          fechaLimite: limite,
        })

        if (resultadoEmail.success) {
          enviados += 1
          break
        }

        if (!esErrorTemporal(resultadoEmail.error) || intento === maxIntentos) {
          fallidos.push({ email, error: resultadoEmail.error })
          break
        }

        await esperar(2000 * intento)
      }

      await esperar(1200)
    }

    if (enviados === 0) {
      return {
        success: false,
        error: "No se pudo enviar el email a ningún administrador",
      }
    }

    const ahoraIso = ahora.toISOString()

    if (alertasVencidas.length > 0) {
      await supabase
        .from("mantenimientos")
        .update({
          notificacion_mantenimiento_vencido_enviada: true,
          fecha_notificacion_mantenimiento_vencido: ahoraIso,
        })
        .in(
          "id",
          alertasVencidas.map((mantenimiento) => mantenimiento.id),
        )
    }

    if (alertasProximas.length > 0) {
      await supabase
        .from("mantenimientos")
        .update({
          notificacion_mantenimiento_proximo_enviada: true,
          fecha_notificacion_mantenimiento_proximo: ahoraIso,
        })
        .in(
          "id",
          alertasProximas.map((mantenimiento) => mantenimiento.id),
        )
    }

    return {
      success: true,
      message: fallidos.length > 0
        ? `Alertas de mantenimiento enviadas con ${fallidos.length} error(es)`
        : "Alertas de mantenimiento enviadas",
      data: {
        mantenimientosVencidos: alertasVencidas.length,
        mantenimientosProximos: alertasProximas.length,
        notificacionesEnviadas: enviados,
        erroresEnvio: fallidos.length,
      },
    }
  } catch (error) {
    console.error("❌ Error en verificarAlertasMantenimiento:", error)
    return { success: false, error: "Error inesperado al verificar alertas de mantenimiento" }
  }
}
