import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('🚨 EMERGENCIA: Marcando reserva ID 12 como notificada para detener spam')
    
    const ahora = new Date()
    
    // Marcar la reserva como notificada inmediatamente
    const { error: updateError } = await supabase
      .from('reservas')
      .update({ 
        notificacion_enviada: true,
        fecha_notificacion: ahora.toISOString(),
        estado: 'completada'
      })
      .eq('id', 12)

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'Error actualizando reserva',
        details: updateError
      }, { status: 500 })
    }

    // Verificar que se actualizó correctamente
    const { data: reservaActualizada, error: verificarError } = await supabase
      .from('reservas')
      .select('id, notificacion_enviada, fecha_notificacion, estado')
      .eq('id', 12)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Reserva marcada como notificada - SPAM DETENIDO',
      timestamp: ahora.toISOString(),
      reservaAntes: {
        notificacion_enviada: false,
        fecha_notificacion: null,
        estado: 'activa'
      },
      reservaDespues: reservaActualizada
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('❌ Error marcando reserva como notificada:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
