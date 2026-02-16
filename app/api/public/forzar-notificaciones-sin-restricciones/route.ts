import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from "@/lib/supabase-server"
import { enviarEmailReservaVencida } from '@/lib/email'
import { sendWhatsAppNotification, formatSpanishPhone } from '@/lib/whatsapp'

// Función para calcular tiempo vencido en formato legible
function calcularTiempoVencido(milisegundosTranscurridos: number): string {
  const horas = Math.floor(milisegundosTranscurridos / (1000 * 60 * 60))
  const minutos = Math.floor((milisegundosTranscurridos % (1000 * 60 * 60)) / (1000 * 60))
  
  if (horas > 0 && minutos > 0) {
    return `${horas} hora${horas !== 1 ? 's' : ''} y ${minutos} minuto${minutos !== 1 ? 's' : ''}`
  } else if (horas > 0) {
    return `${horas} hora${horas !== 1 ? 's' : ''}`
  } else {
    return `${minutos} minuto${minutos !== 1 ? 's' : ''}`
  }
}

// VERSIÓN FORZADA que bypasea DISABLE_AUTO_NOTIFICATIONS
export async function verificarReservasVencidasForzado() {
  try {
    console.log('🔍 FORZADO: Verificando reservas vencidas (bypaseando DISABLE_AUTO_NOTIFICATIONS)...')
    
    // Obtener la fecha actual en UTC
    const ahora = new Date()
    
    // Calcular la fecha de hace 1 hora en UTC (reservas que vencieron hace al menos 1 hora)
    const haceUnaHora = new Date(ahora.getTime() - (60 * 60 * 1000))
    
    console.log(`🕒 Hora actual UTC: ${ahora.toISOString()}`)
    console.log(`🕒 Hora actual local (Madrid): ${ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`)
    console.log(`⏰ Buscando reservas que finalizaron antes de: ${haceUnaHora.toISOString()}`)

    // Obtener todas las reservas activas para filtrar manualmente
    console.log(`🔍 Obteniendo todas las reservas activas para filtrar manualmente...`)
    
    const { data: todasReservasActivas, error } = await supabase
      .from("reservas")
      .select(`
        id,
        matricula,
        empleado_id,
        fecha_inicio,
        fecha_fin,
        estado,
        notificacion_reserva_vencida_enviada,
        empleados!inner (
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
      .eq('estado', 'activa')
      .or('notificacion_reserva_vencida_enviada.is.null,notificacion_reserva_vencida_enviada.eq.false')

    if (error) {
      console.error('❌ Error consultando reservas activas:', error)
      return {
        success: false,
        error: 'Error al consultar reservas activas'
      }
    }

    console.log(`📊 Total reservas activas encontradas: ${todasReservasActivas?.length || 0}`)
    
    // Filtrar manualmente las que están realmente vencidas
    const reservasVencidas = []
    
    if (todasReservasActivas) {
      for (const reserva of todasReservasActivas) {
        try {
          const fechaFin = new Date(reserva.fecha_fin)
          const estaVencida = fechaFin < haceUnaHora
          const horasVencida = (ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60)
          
          console.log(`   📋 Reserva ${reserva.id} (${reserva.matricula}):`)
          console.log(`      Fecha BD: ${reserva.fecha_fin}`)
          console.log(`      Fecha parseada: ${fechaFin.toISOString()}`)
          console.log(`      Horas transcurridas: ${horasVencida.toFixed(2)}`)
          console.log(`      ¿Vencida? ${estaVencida}`)
          console.log(`      Notificación enviada: ${reserva.notificacion_reserva_vencida_enviada}`)
          
          if (estaVencida && reserva.notificacion_reserva_vencida_enviada !== true) {
            reservasVencidas.push(reserva)
            console.log(`      ✅ Agregada para notificación`)
          } else {
            console.log(`      ❌ No agregada (vencida: ${estaVencida}, notificada: ${reserva.notificacion_reserva_vencida_enviada})`)
          }
        } catch (error) {
          console.error(`❌ Error procesando reserva ${reserva.id}:`, error)
        }
      }
    }

    console.log(`🔍 Filtrado completado. Reservas vencidas encontradas: ${reservasVencidas.length}`)
    
    if (reservasVencidas.length === 0) {
      console.log('✅ No hay reservas vencidas pendientes de notificación')
      return {
        success: true,
        reservasEncontradas: 0,
        notificacionesEnviadas: 0,
        errores: 0
      }
    }

    console.log(`📧 Encontradas ${reservasVencidas.length} reservas vencidas para notificar`)

    let reservasNotificadas = 0
    let erroresEnvio = 0

    // Procesar cada reserva vencida
    for (const reserva of reservasVencidas) {
      try {
        console.log(`📨 Procesando reserva ${reserva.id} - ${reserva.matricula}`)

        if (!reserva.fecha_fin || reserva.fecha_fin === null) {
          console.error(`❌ Reserva ${reserva.id} tiene fecha_fin null/undefined, saltando...`)
          erroresEnvio++
          continue;
        }
        
        const fechaFin = new Date(reserva.fecha_fin)
        
        if (isNaN(fechaFin.getTime())) {
          console.error(`❌ Reserva ${reserva.id} tiene fecha_fin inválida: ${reserva.fecha_fin}, saltando...`)
          erroresEnvio++
          continue;
        }
        
        // Calcular tiempo vencido con precisión
        const milisegundosVencidos = ahora.getTime() - fechaFin.getTime()
        const tiempoVencidoTexto = calcularTiempoVencido(milisegundosVencidos)

        console.log(`📨 Enviando notificación para reserva ${reserva.id} - ${reserva.matricula} (${tiempoVencidoTexto} vencida)`)

        const empleado = reserva.empleados as any
        const coche = reserva.coches as any
        let emailEnviado = false
        let whatsappEnviado = false
        let intentosEnvio = []

        // 1. Intentar enviar email
        try {
          const resultadoEmail = await enviarEmailReservaVencida(
            empleado.email,
            `${empleado.nombre} ${empleado.apellidos}`,
            {
              matricula: coche.matricula,  
              marca: coche.marca,
              modelo: coche.modelo
            },
            new Date(reserva.fecha_inicio),
            fechaFin,
            tiempoVencidoTexto
          )

          if (resultadoEmail.success) {
            emailEnviado = true
            intentosEnvio.push('✅ Email enviado exitosamente')
            console.log(`✅ Email enviado exitosamente a ${empleado.email}`)
          } else {
            intentosEnvio.push(`❌ Error email: ${resultadoEmail.error}`)
            console.error(`❌ Error enviando email: ${resultadoEmail.error}`)
          }
        } catch (error) {
          intentosEnvio.push(`❌ Error email: ${error}`)
          console.error(`❌ Error enviando email a ${empleado.email}:`, error)
        }

        // 2. Intentar enviar WhatsApp si tiene móvil
        if (empleado.movil) {
          try {
            const telefonoFormateado = formatSpanishPhone(empleado.movil)
            console.log(`📱 Enviando WhatsApp a ${telefonoFormateado}`)
            
            const resultadoWhatsApp = await sendWhatsAppNotification(
              telefonoFormateado,
              `${empleado.nombre} ${empleado.apellidos}`,
              coche.matricula,
              new Date(reserva.fecha_inicio),
              fechaFin,
              tiempoVencidoTexto
            )

            if (resultadoWhatsApp.success) {
              whatsappEnviado = true
              intentosEnvio.push('✅ WhatsApp enviado exitosamente')
              console.log(`✅ WhatsApp enviado exitosamente a ${telefonoFormateado}`)
            } else {
              intentosEnvio.push(`❌ Error WhatsApp: ${resultadoWhatsApp.error}`)
              console.error(`❌ Error enviando WhatsApp: ${resultadoWhatsApp.error}`)
            }
          } catch (error) {
            intentosEnvio.push(`❌ Error WhatsApp: ${error}`)
            console.error(`❌ Error enviando WhatsApp a ${empleado.movil}:`, error)
          }
        } else {
          intentosEnvio.push('⚠️ No tiene móvil configurado')
          console.log(`⚠️ Empleado ${empleado.nombre} no tiene móvil configurado`)
        }

        // 3. CRÍTICO: SOLO MARCAR COMO NOTIFICADA SI AL MENOS UNO SE ENVIÓ EXITOSAMENTE
        if (emailEnviado || whatsappEnviado) {
          const { error: updateError } = await supabase
            .from('reservas')
            .update({ 
              notificacion_reserva_vencida_enviada: true,
              fecha_notificacion_reserva_vencida: ahora.toISOString()
            })
            .eq('id', reserva.id)

          if (updateError) {
            console.error(`❌ Error actualizando reserva ${reserva.id}:`, updateError)
            erroresEnvio++
          } else {
            reservasNotificadas++
            const canales = []
            if (emailEnviado) canales.push('email')
            if (whatsappEnviado) canales.push('WhatsApp')
            console.log(`✅ Reserva ${reserva.id} notificada por ${canales.join(' y ')} (estado permanece ${reserva.estado})`)
          }
        } else {
          erroresEnvio++
          console.error(`❌ No se pudo enviar notificación por ningún canal para reserva ${reserva.id}`)
          console.error(`📋 Intentos realizados: ${intentosEnvio.join(', ')}`)
        }

      } catch (error) {
        erroresEnvio++
        console.error(`❌ Error procesando reserva ${reserva.id}:`, error)
      }
    }

    const resultado = {
      success: true,
      reservasEncontradas: reservasVencidas.length,
      notificacionesEnviadas: reservasNotificadas,
      errores: erroresEnvio
    }

    console.log(`📊 Verificación completada:`, resultado)
    return resultado

  } catch (error) {
    console.error('❌ Error en verificarReservasVencidasForzado:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      reservasEncontradas: 0,
      notificacionesEnviadas: 0,
      errores: 1
    }
  }
}

export async function POST() {
  try {
    console.log('🚀 FORZADO: Ejecutando notificaciones (bypaseando protecciones)')
    
    const resultado = await verificarReservasVencidasForzado()
    
    console.log('📊 Resultado de la ejecución forzada:', resultado)
    
    return NextResponse.json({
      success: true,
      message: 'Ejecución forzada completada - TODAS LAS PROTECCIONES BYPASEADAS',
      resultado: resultado,
      timestamp: new Date().toISOString(),
      timestampLocal: new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      warning: '⚠️ Esta ejecución bypaseó DISABLE_AUTO_NOTIFICATIONS'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('❌ Error en ejecución forzada:', error)
    return NextResponse.json({
      success: false,
      error: 'Error en ejecución forzada',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
