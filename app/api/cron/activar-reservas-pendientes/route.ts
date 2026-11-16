import { NextRequest, NextResponse } from 'next/server'
import { activarReservasPendientes } from '@/app/actions/reservas-temporales'
import { esPeticionCronAutorizada } from '@/lib/cron-auth'
import { autorizarAdmin, respuestaRechazoApi } from '@/lib/autorizacion'

export async function GET(request: NextRequest) {
  try {
    // Spec 018 (RF-4 a RF-6): solo Vercel Cron con Authorization: Bearer <CRON_SECRET>.
    if (!esPeticionCronAutorizada(request)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

  // En ejecución programada no marcamos como manual (evita lógica específica p.ej. WhatsApp sandbox)
  const resultado = await activarReservasPendientes({ manual: false })
  return NextResponse.json({ ...resultado, timestamp: new Date().toISOString(), source: 'cron' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
  return NextResponse.json({ error: 'Error interno', details: error instanceof Error ? error.message : 'desconocido' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function POST(request: NextRequest) {
  // Spec 018 (RF-7, RF-8): la ejecución manual es solo para administradores.
  const acceso = await autorizarAdmin()
  if (!acceso.ok) return respuestaRechazoApi(acceso.error)

  try {
    const body = request.body ? await request.json().catch(()=>({})) : {}
    if (body.action && body.action !== 'run') {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }
  const resultado = await activarReservasPendientes({ manual: true })
  return NextResponse.json({ ...resultado, timestamp: new Date().toISOString(), source: 'manual' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
  return NextResponse.json({ error: 'Error interno', details: error instanceof Error ? error.message : 'desconocido' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
