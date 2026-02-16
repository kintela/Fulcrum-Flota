import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from "@/lib/supabase-server"

export async function GET() {
  try {
    console.log('🔍 Diagnosticando sistema de notificaciones...')
    
    // 1. Verificar reservas del usuario ID 16 (rquintela)
    const { data: reservasUsuario, error: errorReservas } = await supabase
      .from('reservas')
      .select(`
        id,
        matricula,
        fecha_inicio,
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
      .eq('empleado_id', 16)
      .order('fecha_fin', { ascending: false })
      .limit(5)

    if (errorReservas) {
      throw errorReservas
    }

    console.log(`📊 Reservas encontradas para rquintela: ${reservasUsuario?.length || 0}`)

    // 2. Verificar reservas vencidas hoy
    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const finHoy = new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000)

    const { data: reservasHoy, error: errorHoy } = await supabase
      .from('reservas')
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
      .gte('fecha_fin', inicioHoy.toISOString())
      .lt('fecha_fin', finHoy.toISOString())
      .eq('empleado_id', 16)

    if (errorHoy) {
      throw errorHoy
    }

    // 3. Analizar cada reserva
    const analisisReservas = reservasUsuario?.map(reserva => {
      const fechaFin = new Date(reserva.fecha_fin)
      const ahora = new Date()
      const horasTranscurridas = (ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60)
      
      return {
        ...reserva,
        fechaFinFormateada: fechaFin.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
        horasTranscurridas: horasTranscurridas.toFixed(2),
        estaVencida: horasTranscurridas > 1,
        deberiaNotificar: horasTranscurridas > 1 && !reserva.notificacion_reserva_vencida_enviada && reserva.estado === 'activa'
      }
    }) || []

    return NextResponse.json({
      success: true,
      diagnostico: {
        fechaActual: hoy.toISOString(),
        fechaActualMadrid: hoy.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
        totalReservasUsuario: reservasUsuario?.length || 0,
        reservasHoy: reservasHoy?.length || 0,
        analisisReservas
      },
      reservasUsuario,
      reservasHoy
    })

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
