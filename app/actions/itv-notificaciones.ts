"use server"

import { supabase } from "@/lib/supabase"
import { enviarEmailAlertasITV } from "@/lib/email"

interface ITVConCoche {
  id: number
  matricula: string
  fecharevision?: string | null
  fechaproximarevision: string
  resultado?: string | null
  notificacion_itv_vencida_enviada?: boolean | null
  notificacion_itv_proxima_enviada?: boolean | null
  coches?: {
    matricula: string
    marca: string
    modelo: string
    donante?: boolean | null
  } | null
}

interface ItvAlerta {
  id: number
  matricula: string
  marca: string
  modelo: string
  fechaproximarevision: string
  dias?: number
}

function ordenarItvsPorReciente(a: ITVConCoche, b: ITVConCoche) {
  if (a.fecharevision && b.fecharevision) {
    return new Date(b.fecharevision).getTime() - new Date(a.fecharevision).getTime()
  }
  if (a.fecharevision && !b.fecharevision) return -1
  if (!a.fecharevision && b.fecharevision) return 1
  return b.id - a.id
}

export async function verificarAlertasITV() {
  try {
    const ahora = new Date()
    const limite = new Date()
    limite.setDate(ahora.getDate() + 30)

    const { data: itvs, error } = await supabase
      .from("itvs")
      .select(`
        id,
        matricula,
        fecharevision,
        fechaproximarevision,
        resultado,
        notificacion_itv_vencida_enviada,
        notificacion_itv_proxima_enviada,
        coches (
          matricula,
          marca,
          modelo,
          donante
        )
      `)

    if (error) {
      console.error("❌ Error consultando ITVs:", error)
      return { success: false, error: "Error al consultar ITVs" }
    }

    const latestItvs: ITVConCoche[] = []
    const procesadas = new Set<string>()

    const sortedItvs = (itvs || []).sort(ordenarItvsPorReciente)
    for (const itv of sortedItvs) {
      if (!procesadas.has(itv.matricula)) {
        latestItvs.push(itv)
        procesadas.add(itv.matricula)
      }
    }

    const alertasVencidas: ItvAlerta[] = []
    const alertasProximas: ItvAlerta[] = []

    for (const itv of latestItvs) {
      if (itv.coches?.donante) continue

      const fechaProxima = new Date(itv.fechaproximarevision)

      // Lógica similar al dashboard
      if (itv.fecharevision && itv.resultado === "Apto") {
        if (fechaProxima < ahora) {
          continue
        }
        if (fechaProxima > limite) {
          continue
        }
      } else {
        if (fechaProxima > limite) {
          continue
        }
      }

      const dias = Math.ceil((fechaProxima.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
      const base: ItvAlerta = {
        id: itv.id,
        matricula: itv.matricula,
        marca: itv.coches?.marca || "N/D",
        modelo: itv.coches?.modelo || "",
        fechaproximarevision: itv.fechaproximarevision,
        dias,
      }

      if (fechaProxima < ahora) {
        if (!itv.notificacion_itv_vencida_enviada) {
          alertasVencidas.push(base)
        }
      } else {
        if (!itv.notificacion_itv_proxima_enviada) {
          alertasProximas.push(base)
        }
      }
    }

    if (alertasVencidas.length === 0 && alertasProximas.length === 0) {
      return {
        success: true,
        message: "No hay alertas ITV pendientes",
        data: {
          itvsVencidas: 0,
          itvsProximas: 0,
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
      let ultimoResultado: { success: boolean; error?: string } | null = null

      for (let intento = 1; intento <= maxIntentos; intento += 1) {
        const resultadoEmail = await enviarEmailAlertasITV(email, {
          vencidas: alertasVencidas,
          proximas: alertasProximas,
          fechaLimite: limite,
        })
        ultimoResultado = resultadoEmail

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
        .from("itvs")
        .update({
          notificacion_itv_vencida_enviada: true,
          fecha_notificacion_itv_vencida: ahoraIso,
        })
        .in(
          "id",
          alertasVencidas.map((itv) => itv.id),
        )
    }

    if (alertasProximas.length > 0) {
      await supabase
        .from("itvs")
        .update({
          notificacion_itv_proxima_enviada: true,
          fecha_notificacion_itv_proxima: ahoraIso,
        })
        .in(
          "id",
          alertasProximas.map((itv) => itv.id),
        )
    }

    return {
      success: true,
      message: fallidos.length > 0
        ? `Alertas ITV enviadas con ${fallidos.length} error(es)`
        : "Alertas ITV enviadas",
      data: {
        itvsVencidas: alertasVencidas.length,
        itvsProximas: alertasProximas.length,
        notificacionesEnviadas: enviados,
        erroresEnvio: fallidos.length,
      },
    }
  } catch (error) {
    console.error("❌ Error en verificarAlertasITV:", error)
    return { success: false, error: "Error inesperado al verificar alertas ITV" }
  }
}
