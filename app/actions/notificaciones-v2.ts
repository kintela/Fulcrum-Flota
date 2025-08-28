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

// Sistema mejorado con prevención de duplicados más robusta
export async function verificarReservasVencidasV2() {
  try {
    console.log('🔍 [V2] Verificando reservas vencidas con prevención de duplicados mejorada...')
    
    const ahora = new Date()
    const haceUnaHora = new Date(ahora.getTime() - (60 * 60 * 1000))
    const ejecutionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`🆔 ID de ejecución: ${ejecutionId}`)
    console.log(`🕒 Hora actual: ${ahora.toISOString()}`)
    console.log(`⏰ Buscando reservas que finalizaron antes de: ${haceUnaHora.toISOString()}`)

    // PASO 1: Buscar reservas candidatas con filtro estricto
    const { data: reservasCandidatas, error } = await supabase
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
          nombre,
          apellidos,
          email,
          movil
        )
      `)
      .eq('estado', 'activa')
      .lt('fecha_fin', haceUnaHora.toISOString())
      // Solo buscar las que NO han sido notificadas
      .or('notificacion_enviada.is.null,notificacion_enviada.eq.false')

    if (error) {
      console.error('❌ Error consultando reservas candidatas:', error)
      return {
        success: false,
        error: 'Error al consultar reservas candidatas'
      }
    }

    console.log(`📊 Encontradas ${reservasCandidatas?.length || 0} reservas candidatas`)

    if (!reservasCandidatas || reservasCandidatas.length === 0) {
      console.log('✅ No hay reservas vencidas pendientes de notificación')
      return {
        success: true,
        reservasEncontradas: 0,
        notificacionesEnviadas: 0,
        errores: 0
      }
    }

    let reservasNotificadas = 0
    let erroresEnvio = 0

    // PASO 2: Procesar cada reserva con "claim" atómico
    for (const reserva of reservasCandidatas) {
      try {
        console.log(`🔄 Procesando reserva ${reserva.id} - ${reserva.matricula}`)

        // PASO 2.1: Intentar "reclamar" la reserva de forma atómica
        const { data: reclamada, error: errorClaim } = await supabase
          .from('reservas')
          .update({ 
            notificacion_enviada: `processing_${ejecutionId}`,
            fecha_notificacion: ahora.toISOString()
          })
          .eq('id', reserva.id)
          .eq('estado', 'activa')
          // Solo actualizar si NO ha sido procesada por otra ejecución
          .or('notificacion_enviada.is.null,notificacion_enviada.eq.false')
          .select()

        if (errorClaim || !reclamada || reclamada.length === 0) {
          console.log(`⚠️ Reserva ${reserva.id} ya fue reclamada por otra ejecución, saltando...`)
          continue
        }

        console.log(`🎯 Reserva ${reserva.id} reclamada exitosamente`)

        // PASO 2.2: Calcular horas vencidas
        const fechaFin = new Date(reserva.fecha_fin)
        const horasVencido = Math.ceil((ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60))

        console.log(`📨 Enviando notificaciones para reserva ${reserva.id} (${horasVencido}h vencida)`)

        const empleado = reserva.empleados as any
        let emailEnviado = false
        let whatsappEnviado = false

        // PASO 2.3: Enviar email
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
            console.log(`✅ Email enviado a ${empleado.email}`)
          } else {
            console.error(`❌ Error enviando email: ${resultadoEmail.error}`)
          }
        } catch (error) {
          console.error(`❌ Error enviando email:`, error)
        }

        // PASO 2.4: Enviar WhatsApp
        if (empleado.movil) {
          try {
            const telefonoFormateado = formatSpanishPhone(empleado.movil)
            
            const resultadoWhatsApp = await sendWhatsAppNotification(
              telefonoFormateado,
              `${empleado.nombre} ${empleado.apellidos}`,
              reserva.matricula,
              horasVencido
            )

            if (resultadoWhatsApp.success) {
              whatsappEnviado = true
              console.log(`✅ WhatsApp enviado a ${telefonoFormateado}`)
            } else {
              console.error(`❌ Error enviando WhatsApp: ${resultadoWhatsApp.error}`)
            }
          } catch (error) {
            console.error(`❌ Error enviando WhatsApp:`, error)
          }
        }

        // PASO 2.5: Finalizar el procesamiento
        if (emailEnviado || whatsappEnviado) {
          // No cambiamos estado automáticamente; sólo marcamos notificación.
          const { error: updateFinalError } = await supabase
            .from('reservas')
            .update({ 
              notificacion_enviada: true
            })
            .eq('id', reserva.id)

          if (updateFinalError) {
            console.error(`❌ Error registrando notificación para reserva ${reserva.id}:`, updateFinalError)
            erroresEnvio++
          } else {
            reservasNotificadas++
            const canales = []
            if (emailEnviado) canales.push('email')
            if (whatsappEnviado) canales.push('WhatsApp')
            console.log(`✅ Reserva ${reserva.id} notificada por ${canales.join(' y ')} (estado permanece ${reserva.estado})`)
          }
        } else {
          // Revertir el claim si no se pudo enviar nada
          await supabase
            .from('reservas')
            .update({ 
              notificacion_enviada: false,
              fecha_notificacion: null
            })
            .eq('id', reserva.id)
          
          erroresEnvio++
          console.error(`❌ No se pudo enviar notificación para reserva ${reserva.id}, revirtiendo claim`)
        }

      } catch (error) {
        erroresEnvio++
        console.error(`❌ Error procesando reserva ${reserva.id}:`, error)
        
        // Revertir el claim en caso de error
        try {
          await supabase
            .from('reservas')
            .update({ 
              notificacion_enviada: false,
              fecha_notificacion: null
            })
            .eq('id', reserva.id)
        } catch (revertError) {
          console.error(`❌ Error revirtiendo claim para reserva ${reserva.id}:`, revertError)
        }
      }
    }

    const mensaje = `[${ejecutionId}] Procesadas ${reservasCandidatas.length} reservas. Notificadas: ${reservasNotificadas}, Errores: ${erroresEnvio}`
    console.log(`📊 ${mensaje}`)

    return {
      success: true,
      message: mensaje,
      ejecutionId,
      reservasEncontradas: reservasCandidatas.length,
      reservasNotificadas,
      erroresEnvio
    }

  } catch (error) {
    console.error('❌ Error en verificarReservasVencidasV2:', error)
    return {
      success: false,
      error: 'Error inesperado al verificar reservas vencidas'
    }
  }
}
