import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔍 URGENTE: Verificando estado de reserva ID 12')
    
    const { data: reserva, error } = await supabase
      .from("reservas")
      .select(`
        id,
        matricula,
        empleado_id,
        fecha_fin,
        estado,
        notificacion_enviada,
        fecha_notificacion,
        updated_at,
        empleados!inner (
          id,
          nombre,
          apellidos,
          email,
          movil
        )
      `)
      .eq('id', 12)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Reserva no encontrada', details: error })
    }

    const ahora = new Date()
    const fechaFin = new Date(reserva.fecha_fin)
    const horasReales = (ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60)

    const diagnostico = {
      timestamp: ahora.toISOString(),
      timestampLocal: ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      
      reserva: {
        ...reserva,
        fechaFinParsed: fechaFin.toISOString(),
        fechaFinLocal: fechaFin.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
        horasTranscurridasReales: Math.round(horasReales * 100) / 100
      },
      
      problema: {
        deberiaEstarNotificada: true,
        seEstaEnviandoDuplicados: reserva.notificacion_enviada && new Date().getTime() - new Date(reserva.fecha_notificacion || 0).getTime() > 60000,
        calculoHorasIncorrecto: Math.abs(horasReales - 4.0) > 0.5
      },
      
      accionRecomendada: reserva.notificacion_enviada ? 
        'Reserva ya notificada - verificar por qué sigue enviando duplicados' :
        'Marcar como notificada inmediatamente para detener spam'
    }

    return NextResponse.json(diagnostico, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('❌ Error verificando reserva urgente:', error)
    return NextResponse.json({
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
