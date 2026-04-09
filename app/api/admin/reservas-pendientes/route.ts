import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabaseServer as supabase } from "@/lib/supabase-server"
import { getNextHalfHourCronTick, isReservaListaParaActivacion } from "@/lib/reservas-access-window"

function noStoreHeaders() {
  return { "Cache-Control": "no-store" }
}

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const role = String(session?.user?.role || "").toLowerCase()
  const isAdmin = role === "administrador" || role === "admin"

  if (!session?.user?.email || !isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Acceso no autorizado",
        },
        { status: 403, headers: noStoreHeaders() },
      ),
    }
  }

  return { ok: true as const, session }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const simulatedCronTime = getNextHalfHourCronTick(new Date())
    const { data, error } = await supabase
      .from("reservas")
      .select("id, matricula, fecha_inicio, fecha_fin, bloqueo_desde, margen_bloqueo")
      .eq("estado", "pendiente")
      .order("fecha_inicio", { ascending: true })

    if (error) {
      return NextResponse.json(
        { success: false, error: `No se pudieron cargar las reservas pendientes: ${error.message}` },
        { status: 500, headers: noStoreHeaders() },
      )
    }

    const reservas = (data || []).map((reserva) => ({
      id: reserva.id,
      matricula: reserva.matricula,
      fechaInicio: reserva.fecha_inicio,
      fechaFin: reserva.fecha_fin,
      readyOnNextCron: isReservaListaParaActivacion(reserva, simulatedCronTime),
    }))

    return NextResponse.json(
      {
        success: true,
        simulatedReferenceTime: simulatedCronTime.toISOString(),
        reservas,
      },
      { headers: noStoreHeaders() },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error inesperado cargando reservas pendientes",
      },
      { status: 500, headers: noStoreHeaders() },
    )
  }
}
