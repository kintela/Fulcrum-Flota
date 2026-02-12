import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reservaId } = body

    if (!reservaId) {
      return NextResponse.json({ 
        success: false, 
        error: 'reservaId es requerido' 
      })
    }

    console.log(`🔄 Reseteando reserva ${reservaId}...`)

    // Resetear la reserva
    const { data, error } = await supabase
      .from('reservas')
      .update({ 
        notificacion_reserva_vencida_enviada: false,
        fecha_notificacion_reserva_vencida: null,
        estado: 'activa'
      })
      .eq('id', reservaId)
      .select()

    if (error) {
      console.error('❌ Error reseteando reserva:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      })
    }

    console.log(`✅ Reserva ${reservaId} reseteada exitosamente`)

    return NextResponse.json({ 
      success: true,
      message: `Reserva ${reservaId} reseteada exitosamente`,
      data
    })

  } catch (error) {
    console.error('❌ Error en reset-reserva:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    })
  }
}
