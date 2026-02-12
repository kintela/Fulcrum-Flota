import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔍 Buscando TODAS las reservas vencidas (sin filtro de empleado)')
    
    const ahora = new Date()
    const haceUnaHora = new Date(ahora.getTime() - (60 * 60 * 1000))
    
    // Buscar todas las reservas activas
    const { data: todasReservas, error } = await supabase
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
      .eq('estado', 'activa')
      .order('fecha_fin', { ascending: false })

    if (error) {
      return NextResponse.json({
        error: 'Error consultando reservas',
        details: error
      }, { status: 500 })
    }

    // Analizar cada reserva
    const analisisReservas = todasReservas?.map(reserva => {
      const fechaFin = new Date(reserva.fecha_fin)
      const horasTranscurridas = (ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60)
      const estaVencida = fechaFin < haceUnaHora
      
      return {
        id: reserva.id,
        matricula: reserva.matricula,
        empleado_id: reserva.empleado_id,
        empleadoNombre: `${reserva.empleados.nombre} ${reserva.empleados.apellidos}`,
        empleadoEmail: reserva.empleados.email,
        empleadoMovil: reserva.empleados.movil,
        fechaFin: reserva.fecha_fin,
        fechaFinLocal: fechaFin.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
        estado: reserva.estado,
        notificacion_reserva_vencida_enviada: reserva.notificacion_reserva_vencida_enviada,
        horasTranscurridas: Math.round(horasTranscurridas * 100) / 100,
        estaVencida,
        deberiaNotificar: estaVencida && reserva.estado === 'activa' && !reserva.notificacion_reserva_vencida_enviada
      }
    }) || []

    // Filtrar solo las vencidas
    const reservasVencidas = analisisReservas.filter(r => r.estaVencida)
    const reservasParaNotificar = analisisReservas.filter(r => r.deberiaNotificar)

    const diagnostico = {
      timestamp: ahora.toISOString(),
      timestampLocal: ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      
      configuracion: {
        umbralVencimiento: haceUnaHora.toISOString(),
        umbralVencimientoLocal: haceUnaHora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
      },
      
      estadisticas: {
        totalReservasActivas: todasReservas?.length || 0,
        totalReservasVencidas: reservasVencidas.length,
        totalParaNotificar: reservasParaNotificar.length
      },
      
      todasReservasActivas: analisisReservas,
      reservasVencidas: reservasVencidas,
      reservasQueDeberianNotificar: reservasParaNotificar
    }

    return NextResponse.json(diagnostico, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('❌ Error buscando reservas vencidas:', error)
    
    return NextResponse.json({
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
