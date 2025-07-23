import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DIAGNÓSTICO DE RESERVA ID 10');
    console.log('=====================================');
    
    // 1. Verificar si existe la reserva
    console.log('\n1. Verificando existencia de reserva ID 10...');
    const { data: reserva, error: errorReserva } = await supabase
      .from('reservas_temporales')
      .select('*')
      .eq('id', 10)
      .single();
      
    if (errorReserva) {
      console.error('❌ Error consultando reserva:', errorReserva);
      return NextResponse.json({ error: errorReserva });
    }
    
    if (!reserva) {
      console.log('❌ No se encontró la reserva con ID 10');
      return NextResponse.json({ error: 'Reserva no encontrada' });
    }
    
    console.log('✅ Reserva encontrada:', {
      id: reserva.id,
      coche_id: reserva.coche_id,
      empleado_id: reserva.empleado_id,
      fecha_inicio: reserva.fecha_inicio,
      fecha_fin: reserva.fecha_fin,
      estado: reserva.estado,
      notificacion_enviada: reserva.notificacion_enviada,
      fecha_notificacion: reserva.fecha_notificacion
    });
    
    // 2. Verificar los campos de notificación
    console.log('\n2. Verificando campos de notificación...');
    const camposNotificacion = {
      notificacion_enviada_existe: reserva.hasOwnProperty('notificacion_enviada'),
      notificacion_enviada_valor: reserva.notificacion_enviada,
      fecha_notificacion_existe: reserva.hasOwnProperty('fecha_notificacion'),
      fecha_notificacion_valor: reserva.fecha_notificacion
    };
    
    // 3. Verificar datos del coche
    console.log('\n3. Verificando datos del coche...');
    const { data: coche, error: errorCoche } = await supabase
      .from('coches')
      .select('matricula')
      .eq('id', reserva.coche_id)
      .single();
    
    // 4. Verificar datos del empleado
    console.log('\n4. Verificando datos del empleado...');
    const { data: empleado, error: errorEmpleado } = await supabase
      .from('empleados')
      .select('email, nombre, apellidos')
      .eq('id', reserva.empleado_id)
      .single();
    
    // 5. Verificar criterios de tiempo
    console.log('\n5. Verificando criterios de tiempo...');
    const ahora = new Date();
    const fechaFin = new Date(reserva.fecha_fin);
    const horasTranscurridas = (ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60);
    const hace1Hora = new Date(ahora.getTime() - (60 * 60 * 1000));
    
    const criteriosTiempo = {
      ahora: ahora.toISOString(),
      fecha_fin_reserva: fechaFin.toISOString(),
      hace_1_hora: hace1Hora.toISOString(),
      horas_transcurridas: horasTranscurridas,
      vencio_hace_mas_1_hora: fechaFin < hace1Hora
    };
    
    // 6. Verificar criterios completos
    console.log('\n6. Verificando criterios de notificación...');
    const criterios = {
      fecha_vencida: fechaFin < hace1Hora,
      estado_activa: reserva.estado === 'activa',
      no_notificada: !reserva.notificacion_enviada
    };
    
    const deberiaSerNotificada = criterios.fecha_vencida && 
                                criterios.estado_activa && 
                                criterios.no_notificada;
    
    // 7. Buscar todas las reservas que cumplen criterios
    console.log('\n7. Buscando TODAS las reservas que cumplen criterios...');
    const { data: reservasVencidas, error: errorVencidas } = await supabase
      .from('reservas_temporales')
      .select(`
        id,
        fecha_fin,
        estado,
        notificacion_enviada,
        coche_id,
        empleado_id,
        coches!inner(matricula),
        empleados!inner(email, nombre, apellidos)
      `)
      .eq('estado', 'activa')
      .eq('notificacion_enviada', false)
      .lt('fecha_fin', hace1Hora.toISOString());
    
    const resultado = {
      reserva_encontrada: reserva,
      coche: coche,
      empleado: empleado,
      campos_notificacion: camposNotificacion,
      criterios_tiempo: criteriosTiempo,
      criterios_notificacion: criterios,
      deberia_ser_notificada: deberiaSerNotificada,
      reservas_vencidas_encontradas: reservasVencidas || [],
      total_reservas_vencidas: reservasVencidas?.length || 0
    };
    
    console.log('\n🎯 RESULTADO FINAL:');
    console.log(deberiaSerNotificada ? '✅ DEBERÍA SER NOTIFICADA' : '❌ NO DEBERÍA SER NOTIFICADA');
    console.log(`🔍 Total reservas vencidas encontradas: ${reservasVencidas?.length || 0}`);
    
    return NextResponse.json(resultado);
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
