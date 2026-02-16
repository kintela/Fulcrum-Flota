import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from "@/lib/supabase-server"

export async function GET() {
  try {
    console.log('🔍 URGENTE: Verificando estado de reserva ID 14')
    
    const { data: reserva, error } = await supabase
      .from("reservas")
      .select(`
        id,
        matricula,
        empleado_id,
        fecha_inicio,
        fecha_fin,
        estado,
        notificacion_reserva_vencida_enviada,
        fecha_notificacion_reserva_vencida,
        updated_at,
        empleados!inner (
          id,
          nombre,
          apellidos,
          email,
          movil
        )
      `)
      .eq('id', 14)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Reserva no encontrada', details: error })
    }

    const ahora = new Date()
    const fechaInicio = new Date(reserva.fecha_inicio)
    const fechaFin = new Date(reserva.fecha_fin)
    const horasReales = (ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60)
    
    // Calcular tiempo exacto en horas y minutos
    const milisegundosVencidos = ahora.getTime() - fechaFin.getTime()
    const horasVencidas = Math.floor(milisegundosVencidos / (1000 * 60 * 60))
    const minutosVencidos = Math.floor((milisegundosVencidos % (1000 * 60 * 60)) / (1000 * 60))

    const diagnostico = {
      timestamp: ahora.toISOString(),
      timestampLocal: ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      
      reserva: {
        ...reserva,
        fechaInicioEspañola: fechaInicio.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
        fechaFinEspañola: fechaFin.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
        fechaInicioUTC: fechaInicio.toISOString(),
        fechaFinUTC: fechaFin.toISOString(),
        tiempoVencidoExacto: `${horasVencidas}h ${minutosVencidos}m`,
        horasTranscurridasReales: Math.round(horasReales * 100) / 100
      },
      
      problema: {
        deberiaEstarNotificada: true,
        seEstaEnviandoDuplicados: reserva.notificacion_reserva_vencida_enviada && new Date().getTime() - new Date(reserva.fecha_notificacion_reserva_vencida || 0).getTime() > 60000,
        calculoHorasIncorrecto: Math.abs(horasReales - 4.0) > 0.5
      },
      
      accionRecomendada: reserva.notificacion_reserva_vencida_enviada ? 
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
