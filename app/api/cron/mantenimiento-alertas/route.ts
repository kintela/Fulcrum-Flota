import { NextRequest, NextResponse } from "next/server"
import { verificarAlertasMantenimiento } from "@/app/actions/mantenimientos-notificaciones"
import { esPeticionCronAutorizada } from "@/lib/cron-auth"
import { autorizarAdmin, respuestaRechazoApi } from "@/lib/autorizacion"
import { probarConfiguracionEmail } from "@/lib/email"

export async function GET(request: NextRequest) {
  try {
    // Spec 018 (RF-4 a RF-6): solo Vercel Cron con Authorization: Bearer <CRON_SECRET>.
    if (!esPeticionCronAutorizada(request)) {
      return NextResponse.json(
        {
          error: "No autorizado",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      )
    }

    const emailConfig = await probarConfiguracionEmail()
    if (!emailConfig) {
      return NextResponse.json(
        {
          error: "Configuración de email inválida",
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    const resultado = await verificarAlertasMantenimiento()

    return NextResponse.json(
      {
        success: resultado.success,
        message: resultado.message || resultado.error,
        data: resultado.data,
        timestamp: new Date().toISOString(),
        source: "cron",
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("❌ Error en cron job de mantenimientos:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}

export async function POST(request: NextRequest) {
  // Spec 018 (RF-7, RF-8): la ejecución manual es solo para administradores.
  const acceso = await autorizarAdmin()
  if (!acceso.ok) return respuestaRechazoApi(acceso.error)

  try {
    const body = await request.json()

    if (body.action === "run") {
      const resultado = await verificarAlertasMantenimiento()
      return NextResponse.json(
        {
          success: resultado.success,
          message: resultado.message || resultado.error,
          data: resultado.data,
          timestamp: new Date().toISOString(),
          source: "manual",
        },
        { headers: { "Cache-Control": "no-store" } },
      )
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("❌ Error en POST cron mantenimientos:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}
