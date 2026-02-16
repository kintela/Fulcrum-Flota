import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Diagnóstico de reservas vencidas')
    
    const ahora = new Date()
    const haceUnaHora = new Date(ahora.getTime() - (60 * 60 * 1000))
    
    console.log(`🕒 Hora actual: ${ahora.toISOString()} (${ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })})`)
    console.log(`⏰ Hace una hora: ${haceUnaHora.toISOString()} (${haceUnaHora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })})`)

    // 1. Buscar todas las reservas activas del empleado ID 16 (rquintela)
    const { data: reservasEmpleado16, error: errorEmpleado } = await supabase
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
          nombre,
          apellidos,
          email,
          movil
        )
      `)
      .eq('empleado_id', 16)
      .order('fecha_fin', { ascending: false })

    if (errorEmpleado) {
      console.error('❌ Error consultando reservas:', errorEmpleado)
      return NextResponse.json({ error: 'Error consultando reservas' }, { status: 500 })
    }

    // 2. Analizar cada reserva
    const analisisReservas = reservasEmpleado16?.map(reserva => {
      const fechaFin = new Date(reserva.fecha_fin)
      const horasTranscurridas = (ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60)
      const estaVencida = fechaFin < haceUnaHora
      
      return {
        ...reserva,
        fechaFinParsed: fechaFin.toISOString(),
        fechaFinLocal: fechaFin.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
        horasTranscurridas: Math.round(horasTranscurridas * 100) / 100,
        estaVencida,
        deberiaNotificar: estaVencida && reserva.estado === 'activa' && !reserva.notificacion_reserva_vencida_enviada
      }
    }) || []

    // 3. Buscar específicamente reservas que deberían ser notificadas
    const reservasParaNotificar = analisisReservas.filter(r => r.deberiaNotificar)

    // 4. Verificar empleado ID 16
    const { data: empleado16, error: errorEmpl16 } = await supabase
      .from("empleados")
      .select('id, nombre, apellidos, email, movil')
      .eq('id', 16)
      .single()

    const diagnostico = {
      timestamp: ahora.toISOString(),
      timestampLocal: ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      empleado: empleado16,
      totalReservasEmpleado16: reservasEmpleado16?.length || 0,
      reservasAnalisis: analisisReservas,
      reservasParaNotificar: reservasParaNotificar.length,
      reservasQueDeberianNotificar: reservasParaNotificar,
      configuracionCron: {
        buscandoVencidasAntesDe: haceUnaHora.toISOString(),
        buscandoVencidasAntesDeLocal: haceUnaHora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
      }
    }

    console.log('📊 Results:', diagnostico)

    return NextResponse.json(diagnostico, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error)
    return NextResponse.json({
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
