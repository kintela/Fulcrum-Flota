import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from "@/lib/supabase-server"

export async function POST() {
  try {
    console.log('🔧 RESETEO URGENTE: Preparando reserva ID 12 para nueva prueba')
    
    // Resetear la reserva ID 12 para poder probar de nuevo
    const { data: reservaReset, error } = await supabase
      .from('reservas')
      .update({
        notificacion_reserva_vencida_enviada: false,
        fecha_notificacion_reserva_vencida: null,
        estado: 'activa'
      })
      .eq('id', 12)
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Error reseteando reserva',
        details: error
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Reserva ID 12 reseteada para nueva prueba',
      reserva: reservaReset,
      timestamp: new Date().toISOString(),
      siguientePaso: 'Ahora puedes ejecutar /api/public/forzar-notificaciones para probar el sistema mejorado'
    })

  } catch (error) {
    console.error('❌ Error en reseteo urgente:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
