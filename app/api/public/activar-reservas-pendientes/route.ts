import { NextResponse } from 'next/server'
import { activarReservasPendientes } from '@/app/actions/reservas-temporales'

export async function POST() {
  try {
  const resultado = await activarReservasPendientes({ manual: true })
    return NextResponse.json({
      ...resultado,
      timestamp: new Date().toISOString()
    }, { headers: { 'Access-Control-Allow-Origin': '*' } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error inesperado' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } })
  }
}

export async function GET() {
  return new Response(`<!DOCTYPE html><html><body><h1>Activar Reservas Pendientes</h1><p>Este endpoint activa reservas en estado pendiente cuyo inicio ya llegó. Usa POST para ejecución programada.</p><form method="post"><button style="padding:8px 14px;background:#2563eb;color:#fff;border:none;border-radius:6px">Ejecutar ahora</button></form></body></html>`, { headers: { 'Content-Type': 'text/html' } })
}
