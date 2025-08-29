import { NextRequest, NextResponse } from 'next/server'
import { activarReservasPendientes } from '@/app/actions/reservas-temporales'

export async function GET(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent')
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    const isVercelCron = userAgent?.includes('vercel-cron') || request.headers.get('x-vercel-cron') === '1'

    if (!isVercelCron && (!expectedToken || authHeader !== `Bearer ${expectedToken}`)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

  const resultado = await activarReservasPendientes({ manual: true })
    return NextResponse.json({ ...resultado, timestamp: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno', details: error instanceof Error ? error.message : 'desconocido' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = request.body ? await request.json().catch(()=>({})) : {}
    if (body.action && body.action !== 'run') {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }
  const resultado = await activarReservasPendientes({ manual: true })
    return NextResponse.json({ ...resultado, timestamp: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno', details: error instanceof Error ? error.message : 'desconocido' }, { status: 500 })
  }
}
