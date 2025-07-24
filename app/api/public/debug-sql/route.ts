import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔍 Diagnosticando consulta SQL exacta que usa el sistema')
    
    const ahora = new Date()
    const haceUnaHora = new Date(ahora.getTime() - (60 * 60 * 1000))
    
    console.log(`🕒 Hora actual: ${ahora.toISOString()}`)
    console.log(`⏰ Hace una hora: ${haceUnaHora.toISOString()}`)
    
    // Esta es la MISMA consulta que usa verificarReservasVencidas()
    const { data: todasReservasActivas, error } = await supabase
      .from("reservas")
      .select(`
        id,
        matricula,
        empleado_id,
        fecha_fin,
        estado,
        notificacion_enviada,
        empleados!inner (
          nombre,
          apellidos,
          email,
          movil
        )
      `)
      .eq('estado', 'activa')
      .or('notificacion_enviada.is.null,notificacion_enviada.eq.false')

    if (error) {
      return NextResponse.json({
        error: 'Error en consulta SQL',
        details: error
      }, { status: 500 })
    }

    console.log(`📊 Total reservas encontradas por SQL: ${todasReservasActivas?.length || 0}`)

    // Procesar cada reserva igual que el sistema real
    const reservasParaNotificar = []
    const reservasDebug = []

    if (todasReservasActivas) {
      for (const reserva of todasReservasActivas) {
        const fechaFin = new Date(reserva.fecha_fin)
        const estaVencida = fechaFin < haceUnaHora
        const horasVencida = (ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60)
        
        const debug = {
          id: reserva.id,
          matricula: reserva.matricula,
          empleado_id: reserva.empleado_id,
          empleado: `${reserva.empleados.nombre} ${reserva.empleados.apellidos}`,
          email: reserva.empleados.email,
          movil: reserva.empleados.movil,
          fecha_fin: reserva.fecha_fin,
          fecha_fin_parsed: fechaFin.toISOString(),
          fecha_fin_local: fechaFin.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
          estado: reserva.estado,
          notificacion_enviada: reserva.notificacion_enviada,
          horasVencida: Math.round(horasVencida * 100) / 100,
          estaVencida,
          pasa_filtro_tiempo: estaVencida,
          pasa_filtro_notificacion: reserva.notificacion_enviada !== true,
          deberia_notificar: estaVencida && reserva.notificacion_enviada !== true
        }
        
        reservasDebug.push(debug)
        
        if (debug.deberia_notificar) {
          reservasParaNotificar.push(debug)
        }
      }
    }

    const resultado = {
      timestamp: ahora.toISOString(),
      timestampLocal: ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      configuracion: {
        umbralVencimiento: haceUnaHora.toISOString(),
        umbralVencimientoLocal: haceUnaHora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
      },
      consulta_sql: {
        filtro_estado: 'activa',
        filtro_notificacion: 'notificacion_enviada.is.null OR notificacion_enviada.eq.false',
        reservas_encontradas: todasReservasActivas?.length || 0
      },
      resultado_filtrado: {
        total_reservas_sql: todasReservasActivas?.length || 0,
        reservas_vencidas: reservasDebug.filter(r => r.estaVencida).length,
        reservas_para_notificar: reservasParaNotificar.length
      },
      detalle_reservas: reservasDebug,
      reservas_que_notificar: reservasParaNotificar
    }

    return NextResponse.json(resultado, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('❌ Error en diagnóstico SQL:', error)
    
    return NextResponse.json({
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
