import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reservaId = parseInt(params.id)
    
    if (isNaN(reservaId)) {
      return NextResponse.json({ 
        error: 'ID de reserva inválido',
        details: 'El ID debe ser un número válido'
      }, { status: 400 })
    }

    console.log(`🔍 URGENTE: Verificando estado de reserva ID ${reservaId}`)
    
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
        ),
        coches!inner (
          matricula,
          marca,
          modelo
        )
      `)
      .eq('id', reservaId)
      .single()

    if (error) {
      return NextResponse.json({ 
        error: 'Reserva no encontrada', 
        details: error,
        reservaId: reservaId
      }, { status: 404 })
    }

    const ahora = new Date()
    const fechaInicio = new Date(reserva.fecha_inicio)
    const fechaFin = new Date(reserva.fecha_fin)
    const horasReales = (ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60)
    
    // Extraer información del vehículo
    const coche = reserva.coches as any
    
    // Calcular tiempo exacto en horas y minutos
    const milisegundosVencidos = ahora.getTime() - fechaFin.getTime()
    const horasVencidas = Math.floor(milisegundosVencidos / (1000 * 60 * 60))
    const minutosVencidos = Math.floor((milisegundosVencidos % (1000 * 60 * 60)) / (1000 * 60))

    // Determinar si está vencida (más de 1 hora después del fin)
    const haceUnaHora = new Date(ahora.getTime() - (60 * 60 * 1000))
    const estaVencida = fechaFin < haceUnaHora
    
    // Calcular duración de la reserva
    const duracionReserva = fechaFin.getTime() - fechaInicio.getTime()
    const horasDuracion = Math.floor(duracionReserva / (1000 * 60 * 60))
    const minutosDuracion = Math.floor((duracionReserva % (1000 * 60 * 60)) / (1000 * 60))

    const diagnostico = {
      timestamp: ahora.toISOString(),
      timestampLocal: ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      reservaId: reservaId,
      
      reserva: {
        ...reserva,
        vehiculo: {
          matricula: coche.matricula,
          marca: coche.marca,
          modelo: coche.modelo,
          descripcionCompleta: `${coche.marca} ${coche.modelo} (${coche.matricula})`
        },
        fechaInicioEspañola: fechaInicio.toLocaleString('es-ES', { 
          timeZone: 'Europe/Madrid',
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        fechaFinEspañola: fechaFin.toLocaleString('es-ES', { 
          timeZone: 'Europe/Madrid',
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        fechaInicioUTC: fechaInicio.toISOString(),
        fechaFinUTC: fechaFin.toISOString(),
        duracionReserva: `${horasDuracion}h ${minutosDuracion}m`,
        tiempoVencidoExacto: milisegundosVencidos > 0 ? `${horasVencidas}h ${minutosVencidos}m` : 'No vencida aún',
        horasTranscurridasReales: Math.round(horasReales * 100) / 100,
        estaVencida: estaVencida
      },
      
      analisis: {
        estaVencida: estaVencida,
        deberiaNotificarse: estaVencida && reserva.estado === 'activa' && !reserva.notificacion_reserva_vencida_enviada,
        yaFueNotificada: reserva.notificacion_reserva_vencida_enviada,
        estadoReserva: reserva.estado,
        seEstaEnviandoDuplicados: reserva.notificacion_reserva_vencida_enviada && 
          reserva.fecha_notificacion_reserva_vencida && 
          new Date().getTime() - new Date(reserva.fecha_notificacion_reserva_vencida).getTime() > 60000
      },
      
      accionRecomendada: (() => {
        if (!estaVencida) return 'Reserva aún no ha vencido - no requiere acción'
        if (reserva.notificacion_reserva_vencida_enviada) return 'Reserva ya notificada - verificar por qué podría estar enviando duplicados'
        if (reserva.estado !== 'activa') return `Reserva en estado '${reserva.estado}' - no se notificará`
        return 'Reserva vencida pendiente de notificación - se debería notificar'
      })()
    }

    return NextResponse.json(diagnostico, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error(`❌ Error verificando reserva ${params?.id}:`, error)
    return NextResponse.json({
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Error desconocido',
      reservaId: params?.id
    }, { status: 500 })
  }
}
