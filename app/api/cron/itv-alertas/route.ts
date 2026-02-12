import { NextRequest, NextResponse } from "next/server"
import { verificarAlertasITV } from "@/app/actions/itv-notificaciones"
import { probarConfiguracionEmail } from "@/lib/email"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const userAgent = request.headers.get("user-agent")

    const expectedToken = process.env.CRON_SECRET_TOKEN
    const isVercelCron =
      userAgent?.includes("vercel-cron") || request.headers.get("x-vercel-cron") === "1"

    if (!isVercelCron && (!expectedToken || authHeader !== `Bearer ${expectedToken}`)) {
      return NextResponse.json(
        {
          error: "No autorizado",
          timestamp: new Date().toISOString(),
          source: isVercelCron ? "vercel-cron" : "manual",
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

    const resultado = await verificarAlertasITV()

    return NextResponse.json(
      {
        success: resultado.success,
        message: resultado.message || resultado.error,
        data: resultado.data,
        timestamp: new Date().toISOString(),
        source: isVercelCron ? "cron" : "manual",
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("❌ Error en cron job de ITVs:", error)
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
  try {
    const body = await request.json()

    if (body.action === "run") {
      const resultado = await verificarAlertasITV()
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
    console.error("❌ Error en POST cron ITVs:", error)
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
