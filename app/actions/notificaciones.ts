"use server"

import { supabase } from "@/lib/supabase"
import { enviarEmailReservaVencida } from "@/lib/email"
import { sendWhatsAppNotification, formatSpanishPhone } from "@/lib/whatsapp"

export interface ReservaVencida {
  id: number
  matricula: string
  empleado_id: number
  fecha_fin: string
  estado: string
  empleado: {
    nombre: string
    apellidos: string
    email: string
    movil?: string
  }
}

// Función para corregir fechas mal almacenadas en la BD
// Las fechas fueron introducidas en horario español pero guardadas como UTC
function corregirFechaDesdeBaseDatos(fechaBD: string): Date {
  // La fecha viene como "2025-07-23T15:30:00+00:00" 
  // pero representa 15:30 hora española, no UTC
  
  // Extraer la parte de fecha y hora sin timezone
  const fechaSinTZ = fechaBD.replace(/([+-]\d{2}:?\d{2}|Z)$/, '')
  
  // Crear la fecha asumiendo que es hora española (UTC+2 en verano, UTC+1 en invierno)
  // Para simplificar, asumimos verano (CEST = UTC+2)
  const fechaEspañola = new Date(fechaSinTZ + '+02:00')
  
  console.log(`🔧 Corrigiendo fecha BD: ${fechaBD} -> ${fechaEspañola.toISOString()}`)
  console.log(`   (${fechaSinTZ} hora española -> ${fechaEspañola.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })})`)
  
  return fechaEspañola
}

export async function verificarReservasVencidas() {
  try {
    console.log('🔍 Verificando reservas vencidas...')
    
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
      console.error('❌ Error consultando reservas activas:', error)
      return {
        success: false,
        error: 'Error al consultar reservas activas'
      }
    }

    console.log(`📊 Total reservas activas encontradas: ${todasReservasActivas?.length || 0}`)
    
    // Filtrar manualmente las que están realmente vencidas (usando fechas sin corrección)
    const reservasVencidas = []
    
    if (todasReservasActivas) {
      for (const reserva of todasReservasActivas) {
        try {
          // Usar la fecha tal como está en BD (ya está en UTC correctamente)
          const fechaFin = new Date(reserva.fecha_fin)
          const estaVencida = fechaFin < haceUnaHora
          const horasVencida = (ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60)
          
          console.log(`   📋 Reserva ${reserva.id} (${reserva.matricula}):`)
          console.log(`      Fecha BD: ${reserva.fecha_fin}`)
          console.log(`      Fecha parseada: ${fechaFin.toISOString()}`)
          console.log(`      Horas transcurridas: ${horasVencida.toFixed(2)}`)
          console.log(`      ¿Vencida? ${estaVencida}`)
          console.log(`      Notificación enviada: ${reserva.notificacion_enviada}`)
          
          // Verificación doble para evitar duplicados
          if (estaVencida && reserva.notificacion_enviada !== true) {
            reservasVencidas.push(reserva)
            console.log(`      ✅ Agregada para notificación`)
          } else {
            console.log(`      ❌ No agregada (vencida: ${estaVencida}, notificada: ${reserva.notificacion_enviada})`)
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

        // Validar fecha - usar tal como está en BD
        if (!reserva.fecha_fin || reserva.fecha_fin === null) {
          console.error(`❌ Reserva ${reserva.id} tiene fecha_fin null/undefined, saltando...`)
          erroresEnvio++
          continue;
        }
        
        // Usar la fecha tal como está en BD (ya está en UTC correctamente)
        const fechaFin = new Date(reserva.fecha_fin)
        
        // Verificar si la fecha parseada es válida
        if (isNaN(fechaFin.getTime())) {
          console.error(`❌ Reserva ${reserva.id} tiene fecha_fin inválida: ${reserva.fecha_fin}, saltando...`)
          erroresEnvio++
          continue;
        }
        
        // Calcular horas transcurridas con más precisión
        const milisegundosTranscurridos = ahora.getTime() - fechaFin.getTime()
        const horasTranscurridasExactas = milisegundosTranscurridos / (1000 * 60 * 60)
        const horasVencido = Math.round(horasTranscurridasExactas)

        console.log(`📨 CÁLCULO DETALLADO para reserva ${reserva.id} - ${reserva.matricula}:`)
        console.log(`   Ahora UTC: ${ahora.toISOString()} (${ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })})`)
        console.log(`   Fecha fin BD: ${reserva.fecha_fin}`)
        console.log(`   Fecha fin parseada: ${fechaFin.toISOString()} (${fechaFin.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })})`)
        console.log(`   Milisegundos transcurridos: ${milisegundosTranscurridos}`)
        console.log(`   Horas exactas: ${horasTranscurridasExactas.toFixed(2)}`)
        console.log(`   Horas redondeadas: ${horasVencido}`)
        console.log(`📨 Enviando notificación para reserva ${reserva.id} - ${reserva.matricula} (${horasVencido}h vencida)`)

        const empleado = reserva.empleados as any
        let emailEnviado = false
        let whatsappEnviado = false
        let intentosEnvio = []

        // 1. Intentar enviar email
        try {
          const resultadoEmail = await enviarEmailReservaVencida(
            empleado.email,
            `${empleado.nombre} ${empleado.apellidos}`,
            {
              matricula: reserva.matricula,
              marca: 'N/A',
              modelo: 'N/A'
            },
            fechaFin,
            horasVencido
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
              reserva.matricula,
              horasVencido
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
              notificacion_enviada: true,
              fecha_notificacion: ahora.toISOString(),
              estado: 'completada'
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
            console.log(`✅ Reserva ${reserva.id} notificada por ${canales.join(' y ')} y marcada como completada`)
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

    const mensaje = `Procesadas ${reservasVencidas.length} reservas. Notificadas: ${reservasNotificadas}, Errores: ${erroresEnvio}`
    console.log(`📊 ${mensaje}`)

    return {
      success: true,
      message: mensaje,
      reservasEncontradas: reservasVencidas.length,
      reservasNotificadas,
      erroresEnvio
    }

  } catch (error) {
    console.error('❌ Error en verificarReservasVencidas:', error)
    return {
      success: false,
      error: 'Error inesperado al verificar reservas vencidas'
    }
  }
}

// Función para obtener estadísticas de notificaciones
export async function obtenerEstadisticasNotificaciones() {
  try {
    const ahora = new Date()
    const hace24Horas = new Date(ahora.getTime() - (24 * 60 * 60 * 1000))

    // Contar reservas vencidas en las últimas 24 horas
    const { data: reservasVencidas, error: errorVencidas } = await supabase
      .from("reservas")
      .select('id, notificacion_enviada')
      .eq('estado', 'activa')
      .lt('fecha_fin', ahora.toISOString())
      .gte('fecha_fin', hace24Horas.toISOString())

    if (errorVencidas) {
      throw errorVencidas
    }

    const totalVencidas = reservasVencidas?.length || 0
    const notificadas = reservasVencidas?.filter(r => r.notificacion_enviada).length || 0
    const pendientes = totalVencidas - notificadas

    return {
      success: true,
      estadisticas: {
        totalVencidasUltimas24h: totalVencidas,
        notificacionesEnviadas: notificadas,
        notificacionesPendientes: pendientes
      }
    }

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error)
    return {
      success: false,
      error: 'Error al obtener estadísticas de notificaciones'
    }
  }
}
