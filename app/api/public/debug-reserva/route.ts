import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const reservaId = url.searchParams.get('id') || '12' // Default a reserva 12
    
    console.log(`🔍 Diagnosticando reserva ID: ${reservaId}`)
    
    const ahora = new Date()
    const haceUnaHora = new Date(ahora.getTime() - (60 * 60 * 1000))
    
    // Buscar la reserva específica con todos los datos
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
        empleados!inner (
          id,
          nombre,
          apellidos,
          email,
          movil
        )
      `)
      .eq('id', reservaId)
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Reserva no encontrada',
        reservaId,
        details: error
      }, { status: 404 })
    }

    // Analizar la reserva
    const fechaFin = new Date(reserva.fecha_fin)
    const horasTranscurridas = (ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60)
    const estaVencida = fechaFin < haceUnaHora
    
    const diagnostico = {
      timestamp: ahora.toISOString(),
      timestampLocal: ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      
      reserva: {
        ...reserva,
        fechaFinParsed: fechaFin.toISOString(),
        fechaFinLocal: fechaFin.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
        horasTranscurridas: Math.round(horasTranscurridas * 100) / 100,
        estaVencida,
        deberiaNotificar: estaVencida && reserva.estado === 'activa' && !reserva.notificacion_enviada
      },
      
      configuracion: {
        horaActual: ahora.toISOString(),
        horaActualLocal: ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
        umbralVencimiento: haceUnaHora.toISOString(),
        umbralVencimientoLocal: haceUnaHora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
      },
      
      empleadoAsignado: reserva.empleados,
      
      razonNoNotificacion: !estaVencida ? 'No está vencida aún' :
                          reserva.estado !== 'activa' ? `Estado: ${reserva.estado}` :
                          reserva.notificacion_enviada ? 'Ya fue notificada' :
                          '¡Debería ser notificada!'
    }

    return NextResponse.json(diagnostico, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('❌ Error diagnosticando reserva:', error)
    
    return NextResponse.json({
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
