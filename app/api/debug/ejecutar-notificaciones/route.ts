import { NextResponse } from 'next/server'
import { verificarReservasVencidas } from '@/app/actions/notificaciones'

export async function GET() {
  try {
    console.log('🧪 DEBUG: Ejecutando verificación sin autenticación')
    console.log('📍 Fuente: Debug manual')
    console.log('🕒 Timestamp:', new Date().toISOString())
    
    const resultado = await verificarReservasVencidas()
    
    console.log('📊 Resultado debug:', resultado)
    
    return NextResponse.json({
      success: true,
      message: 'Debug ejecutado correctamente',
      timestamp: new Date().toISOString(),
      timestampLocal: new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      source: 'debug-manual',
      resultado: resultado
    })

  } catch (error) {
    console.error('❌ Error en debug:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Error en debug',
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString(),
      source: 'debug-manual'
    }, { status: 500 })
  }
}
