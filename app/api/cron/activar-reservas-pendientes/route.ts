import { NextRequest, NextResponse } from 'next/server'
import { activarReservasPendientes } from '@/app/actions/reservas-temporales'
import { getNextHalfHourCronTick } from '@/lib/reservas-access-window'

export async function GET(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent')
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    const isVercelCron = userAgent?.includes('vercel-cron') || request.headers.get('x-vercel-cron') === '1'

    if (!isVercelCron && (!expectedToken || authHeader !== `Bearer ${expectedToken}`)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

  // En ejecución programada no marcamos como manual (evita lógica específica p.ej. WhatsApp sandbox)
  const resultado = await activarReservasPendientes({ manual: false })
  console.log('[cron activar-reservas-pendientes] resultado', {
    success: resultado?.success,
    activadas: (resultado as any)?.activadas ?? null,
    ids: (resultado as any)?.ids ?? [],
    emailsEnviados: (resultado as any)?.emailsEnviados ?? null,
    codigosGenerados: (resultado as any)?.codigosGenerados ?? null,
    erroresAcceso: (resultado as any)?.erroresAcceso ?? null,
    detalles: (resultado as any)?.detalles ?? [],
  })
  return NextResponse.json({ ...resultado, timestamp: new Date().toISOString(), source: 'cron' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
  return NextResponse.json({ error: 'Error interno', details: error instanceof Error ? error.message : 'desconocido' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = request.body ? await request.json().catch(()=>({})) : {}
    if (body.action && body.action !== 'run') {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }
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

    return NextResponse.json(
      {
        ...resultado,
        timestamp: new Date().toISOString(),
        source: 'manual-cron-simulation',
        simulatedReferenceTime: simulatedCronTime.toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
  return NextResponse.json({ error: 'Error interno', details: error instanceof Error ? error.message : 'desconocido' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
