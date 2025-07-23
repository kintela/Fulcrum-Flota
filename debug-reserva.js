const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vzexymatyaqusewdadrm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6ZXh5bWF0eWFxdXNld2RhZHJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTE5NzAwMSwiZXhwIjoyMDY0NzczMDAxfQ.6UUxTpwEGpxFRKVFP6WA8S6VXKY3Uz3jAaGHkjLdYgU'
);

async function diagnosticar() {
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
    return;
  }
  
  if (!reserva) {
    console.log('❌ No se encontró la reserva con ID 10');
    return;
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
  if (reserva.hasOwnProperty('notificacion_enviada')) {
    console.log('✅ Campo notificacion_enviada existe:', reserva.notificacion_enviada);
  } else {
    console.log('❌ Campo notificacion_enviada NO existe - NECESITAS EJECUTAR EL SCRIPT SQL');
  }
  
  if (reserva.hasOwnProperty('fecha_notificacion')) {
    console.log('✅ Campo fecha_notificacion existe:', reserva.fecha_notificacion);
  } else {
    console.log('❌ Campo fecha_notificacion NO existe - NECESITAS EJECUTAR EL SCRIPT SQL');
  }
  
  // 3. Verificar datos del coche
  console.log('\n3. Verificando datos del coche...');
  const { data: coche, error: errorCoche } = await supabase
    .from('coches')
    .select('matricula')
    .eq('id', reserva.coche_id)
    .single();
    
  if (coche) {
    console.log('✅ Coche encontrado:', coche.matricula);
  } else {
    console.log('❌ Error consultando coche:', errorCoche);
  }
  
  // 4. Verificar datos del empleado
  console.log('\n4. Verificando datos del empleado...');
  const { data: empleado, error: errorEmpleado } = await supabase
    .from('empleados')
    .select('email, nombre, apellidos')
    .eq('id', reserva.empleado_id)
    .single();
    
  if (empleado) {
    console.log('✅ Empleado encontrado:', `${empleado.nombre} ${empleado.apellidos} (${empleado.email})`);
  } else {
    console.log('❌ Error consultando empleado:', errorEmpleado);
  }
  
  // 5. Verificar criterios de tiempo
  console.log('\n5. Verificando criterios de tiempo...');
  const ahora = new Date();
  const fechaFin = new Date(reserva.fecha_fin);
  const horasTranscurridas = (ahora - fechaFin) / (1000 * 60 * 60);
  const hace1Hora = new Date(ahora.getTime() - (60 * 60 * 1000));
  
  console.log('⏰ Ahora:', ahora.toISOString());
  console.log('⏰ Fecha fin reserva:', fechaFin.toISOString());
  console.log('⏰ Hace 1 hora:', hace1Hora.toISOString());
  console.log('⏰ Horas transcurridas:', horasTranscurridas.toFixed(2));
  console.log('⏰ ¿Venció hace más de 1 hora?', fechaFin < hace1Hora ? '✅ SÍ' : '❌ NO');
  
  // 6. Verificar criterios completos
  console.log('\n6. Verificando criterios de notificación...');
  console.log('✅ ¿Fecha fin anterior a hace 1 hora?', fechaFin < hace1Hora ? 'SÍ' : 'NO');
  console.log('✅ ¿Estado es "activa"?', reserva.estado === 'activa' ? 'SÍ' : `NO (es: ${reserva.estado})`);
  console.log('✅ ¿No ha sido notificada?', !reserva.notificacion_enviada ? 'SÍ' : 'NO (ya fue notificada)');
  
  const deberiaSerNotificada = fechaFin < hace1Hora && 
                              reserva.estado === 'activa' && 
                              !reserva.notificacion_enviada;
  
  console.log('\n🎯 RESULTADO FINAL:');
  console.log(deberiaSerNotificada ? '✅ DEBERÍA SER NOTIFICADA' : '❌ NO DEBERÍA SER NOTIFICADA');
  
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
    
  if (errorVencidas) {
    console.error('❌ Error buscando reservas vencidas:', errorVencidas);
  } else {
    console.log(`🔍 Encontradas ${reservasVencidas?.length || 0} reservas que cumplen criterios:`);
    reservasVencidas?.forEach(r => {
      console.log(`  - ID ${r.id}: ${r.coches.matricula} (${r.empleados.email}) - Venció: ${r.fecha_fin}`);
    });
  }
}

diagnosticar().catch(console.error);
