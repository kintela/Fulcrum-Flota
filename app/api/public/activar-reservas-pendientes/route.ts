import { NextRequest, NextResponse } from 'next/server'
import { activarReservasPendientes } from '@/app/actions/reservas-temporales'
import { getNextHalfHourCronTick } from '@/lib/reservas-access-window'

export async function POST(request: NextRequest) {
  try {
    const body = request.body ? await request.json().catch(()=>({})) : {}
    const reservaId =
      typeof body?.reservaId === "number"
        ? body.reservaId
        : typeof body?.reservaId === "string" && body.reservaId.trim() !== ""
          ? Number(body.reservaId)
          : null
    const forceWindowBypass = body?.forceWindowBypass === true
    const simulatedCronTime = getNextHalfHourCronTick(new Date())
    const resultado = await activarReservasPendientes({
      manual: false,
      referenceTime: simulatedCronTime,
      targetReservaId: Number.isInteger(reservaId) ? reservaId : null,
      forceWindowBypass,
    })
    return NextResponse.json({
      ...resultado,
      timestamp: new Date().toISOString(),
      source: "manual-cron-simulation",
      simulatedReferenceTime: simulatedCronTime.toISOString(),
    }, { headers: { 'Access-Control-Allow-Origin': '*' } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error inesperado' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } })
  }
}

export async function GET() {
  return new Response(`<!DOCTYPE html><html><body><h1>Activar Reservas Pendientes</h1><p>Este endpoint simula la próxima ejecución automática del cron y aplica ahora mismo lo que ocurriría en ese tick.</p><form method="post"><button style="padding:8px 14px;background:#2563eb;color:#fff;border:none;border-radius:6px">Ejecutar ahora</button></form></body></html>`, { headers: { 'Content-Type': 'text/html' } })
}
