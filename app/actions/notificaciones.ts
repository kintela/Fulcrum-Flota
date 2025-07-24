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
    console.log(`⏰ Hace una hora (UTC): ${haceUnaHora.toLocaleString('en-US', { timeZone: 'UTC' })}`)
    console.log(`⏰ Hace una hora (Madrid): ${haceUnaHora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`)
    console.log(`📋 IMPORTANTE: Trabajamos en UTC. En verano Madrid = UTC+2`)
    console.log(`📋 Si son las 18:00 en Madrid, son las 16:00 UTC`)
    console.log(`📋 Reserva termina 15:30 UTC = 17:30 Madrid`)
    
    // Test específico para la reserva 10 - PROBLEMA DETECTADO!
    // La fecha en BD es 2025-07-23 15:30:00+00 pero fue seleccionada en horario español
    // Esto significa que el usuario seleccionó 15:30 hora española pero se guardó como 15:30 UTC
    
    // CORRECCIÓN: La reserva realmente termina a las 15:30 hora española
    // que son las 13:30 UTC en verano (España = UTC+2)
    const fechaRealEspañola = new Date('2025-07-23T15:30:00+02:00') // 15:30 hora española
    const fechaRealUTC = new Date('2025-07-23T13:30:00.000Z') // Equivalente en UTC
    
    const horasTranscurridasReales = (ahora.getTime() - fechaRealUTC.getTime()) / (1000 * 60 * 60)
    console.log(`🧪 TEST RESERVA 10 (CORRIGIENDO TIMEZONE):`)
    console.log(`   ❌ BD almacena: 2025-07-23 15:30:00+00 (incorrecto)`)
    console.log(`   ✅ Hora real española: ${fechaRealEspañola.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`)
    console.log(`   ✅ Equivalente UTC: ${fechaRealUTC.toISOString()}`)
    console.log(`   Hora actual UTC: ${ahora.toISOString()}`)
    console.log(`   Hora actual Madrid: ${ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`)
    console.log(`   Horas transcurridas (corregidas): ${horasTranscurridasReales.toFixed(2)}`)
    console.log(`   ¿Está vencida ahora? ${fechaRealUTC < haceUnaHora}`)
    console.log(`   📋 EXPLICACIÓN: 15:30 España = 13:30 UTC. Si ahora son 16:00 UTC, han pasado 2.5h`)

    // Verificar datos raw de la reserva 10 en la base de datos
    const { data: reserva10Raw } = await supabase
      .from("reservas")
      .select('id, matricula, fecha_fin, estado')
      .eq('id', 10)
      .single()
    
    if (reserva10Raw) {
      console.log(`📋 DATOS RAW RESERVA 10 EN BD:`)
      console.log(`   ID: ${reserva10Raw.id}`)
      console.log(`   Matrícula: ${reserva10Raw.matricula}`)
      console.log(`   Fecha fin raw: ${reserva10Raw.fecha_fin}`)
      console.log(`   Estado: ${reserva10Raw.estado}`)
      
      // Parsear la fecha tal como viene de la BD y corregirla
      const fechaBDOriginal = new Date(reserva10Raw.fecha_fin)
      const fechaCorregida = corregirFechaDesdeBaseDatos(reserva10Raw.fecha_fin)
      
      console.log(`   Fecha BD original: ${fechaBDOriginal.toISOString()} (${fechaBDOriginal.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })})`)
      console.log(`   Fecha corregida: ${fechaCorregida.toISOString()} (${fechaCorregida.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })})`)
      console.log(`   ¿Está vencida (corregida)? ${fechaCorregida < haceUnaHora}`)
      
      const horasVencidaCorregida = (ahora.getTime() - fechaCorregida.getTime()) / (1000 * 60 * 60)
      console.log(`   Horas vencida (corregida): ${horasVencidaCorregida.toFixed(2)}`)
    }

    // CAMBIO IMPORTANTE: Como las fechas en BD están mal (hora española guardada como UTC),
    // necesitamos obtener TODAS las reservas activas y filtrar en código
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
    
    // Filtrar manualmente las que están realmente vencidas (corrigiendo fechas)
    const reservasVencidas = []
    
    if (todasReservasActivas) {
      for (const reserva of todasReservasActivas) {
        try {
          // NO corregir fecha - usar tal como está en BD (ya está en UTC)
          const fechaFin = new Date(reserva.fecha_fin)
          const estaVencida = fechaFin < haceUnaHora
          const horasVencida = (ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60)
          
          console.log(`   📋 Reserva ${reserva.id} (${reserva.matricula}):`)
          console.log(`      Fecha BD: ${reserva.fecha_fin}`)
          console.log(`      Fecha parseada: ${fechaFin.toISOString()}`)
          console.log(`      Fecha local: ${fechaFin.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`)
          console.log(`      Horas transcurridas: ${horasVencida.toFixed(2)}`)
          console.log(`      ¿Vencida? ${estaVencida}`)
          console.log(`      Notificación enviada: ${reserva.notificacion_enviada}`)
          
          // IMPORTANTE: Verificación doble para evitar duplicados
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
        // Validar fecha sin corrección - usar tal como está en BD
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
        
        const horasVencido = Math.ceil((ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60))

        console.log(`📨 Enviando notificación para reserva ${reserva.id} - ${reserva.matricula} (${horasVencido}h vencida)`)

        const empleado = reserva.empleados as any
        let emailEnviado = false
        let whatsappEnviado = false

        // 1. Intentar enviar email
        try {
          const resultadoEmail = await enviarEmailReservaVencida(
            empleado.email,
            `${empleado.nombre} ${empleado.apellidos}`,
            {
              matricula: reserva.matricula,
              marca: 'N/A', // No disponible en esta tabla
              modelo: 'N/A' // No disponible en esta tabla
            },
            fechaFin,
            horasVencido
          )

          if (resultadoEmail.success) {
            emailEnviado = true
            console.log(`✅ Email enviado exitosamente a ${empleado.email}`)
          } else {
            console.error(`❌ Error enviando email: ${resultadoEmail.error}`)
          }
        } catch (error) {
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
              console.log(`✅ WhatsApp enviado exitosamente a ${telefonoFormateado}`)
            } else {
              console.error(`❌ Error enviando WhatsApp: ${resultadoWhatsApp.error}`)
            }
          } catch (error) {
            console.error(`❌ Error enviando WhatsApp a ${empleado.movil}:`, error)
          }
        } else {
          console.log(`⚠️ Empleado ${empleado.nombre} no tiene teléfono configurado`)
        }

        // 3. Marcar como notificada si al menos uno fue enviado exitosamente
        if (emailEnviado || whatsappEnviado) {
          // Marcar como notificada Y cambiar estado a completada
          const { error: updateError } = await supabase
            .from('reservas')
            .update({ 
              notificacion_enviada: true,
              fecha_notificacion: ahora.toISOString(),
              estado: 'completada'  // ← NUEVO: Marcar como completada automáticamente
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
            console.log(`✅ Notificación enviada por ${canales.join(' y ')}, reserva marcada como completada: ${reserva.id}`)
          }
        } else {
          erroresEnvio++
          console.error(`❌ No se pudo enviar notificación por ningún canal para reserva ${reserva.id}`)
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
