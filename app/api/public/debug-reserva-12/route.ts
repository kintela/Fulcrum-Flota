import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔍 Diagnosticando reserva ID 12 específicamente')
    
    const ahora = new Date()
    const haceUnaHora = new Date(ahora.getTime() - (60 * 60 * 1000))
    
    // 1. Buscar la reserva ID 12 específicamente
    const { data: reserva12, error: errorReserva } = await supabase
      .from("reservas")
      .select(`
        id,
        matricula,
        empleado_id,
        fecha_fin,
        estado,
        notificacion_reserva_vencida_enviada,
        fecha_notificacion_reserva_vencida,
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

    if (errorReserva) {
      return NextResponse.json({
        error: 'No se encontró la reserva ID 12',
        details: errorReserva
      }, { status: 404 })
    }

    // 2. Analizar la reserva
    const fechaFin = new Date(reserva12.fecha_fin)
    const horasTranscurridas = (ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60)
    const estaVencida = fechaFin < haceUnaHora
    const deberiaNotificar = estaVencida && reserva12.estado === 'activa' && !reserva12.notificacion_reserva_vencida_enviada

    // 3. También buscar TODAS las reservas activas sin notificar para comparar
    const { data: todasReservasActivas, error: errorTodas } = await supabase
      .from("reservas")
      .select(`
        id,
        matricula,
        empleado_id,
        fecha_fin,
        estado,
        notificacion_reserva_vencida_enviada,
        empleados!inner (
          nombre,
          apellidos,
          email,
          movil
        )
      `)
      .eq('estado', 'activa')
      .is('notificacion_reserva_vencida_enviada', null)

    const diagnostico = {
      timestamp: ahora.toISOString(),
      timestampLocal: ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      
      // Análisis específico de reserva 12
      reserva12: {
        ...reserva12,
        fechaFinParsed: fechaFin.toISOString(),
        fechaFinLocal: fechaFin.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
        horasTranscurridasDesdeFinalizacion: Math.round(horasTranscurridas * 100) / 100,
        estaVencida: estaVencida,
        estadoReserva: reserva12.estado,
        notificacionEnviada: reserva12.notificacion_reserva_vencida_enviada,
        deberiaNotificar: deberiaNotificar,
        razonNoNotificar: !deberiaNotificar ? (
          !estaVencida ? 'No está vencida aún' :
          reserva12.estado !== 'activa' ? `Estado no es activa: ${reserva12.estado}` :
          reserva12.notificacion_reserva_vencida_enviada ? 'Ya fue notificada' :
          'Razón desconocida'
        ) : null
      },
      
      // Configuración del cron
      configuracionCron: {
        horaActual: ahora.toISOString(),
        horaActualLocal: ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
        umbralVencimiento: haceUnaHora.toISOString(),
        umbralVencimientoLocal: haceUnaHora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
        explicacion: 'Las reservas se consideran vencidas si terminaron hace más de 1 hora'
      },
      
      // Resumen de todas las reservas activas
      resumenGeneral: {
        totalReservasActivasSinNotificar: todasReservasActivas?.length || 0,
        reservasEncontradas: todasReservasActivas?.map(r => ({
          id: r.id,
          matricula: r.matricula,
          empleado_id: r.empleado_id,
          fecha_fin: r.fecha_fin,
          estado: r.estado,
          notificacion_reserva_vencida_enviada: r.notificacion_reserva_vencida_enviada
        })) || []
      }
    }

    return NextResponse.json(diagnostico, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('❌ Error diagnosticando reserva 12:', error)
    
    return NextResponse.json({
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
