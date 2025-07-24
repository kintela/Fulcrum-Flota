import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reservaId = parseInt(params.id)
    
    if (isNaN(reservaId)) {
      return NextResponse.json({ 
        error: 'ID de reserva inválido',
        details: 'El ID debe ser un número válido'
      }, { status: 400 })
    }

    console.log(`🧪 TEST: Enviando notificación de prueba para reserva ID ${reservaId}`)
    
    const { data: reserva, error } = await supabase
      .from("reservas")
      .select(`
        id,
        matricula,
        empleado_id,
        fecha_inicio,
        fecha_fin,
        estado,
        notificacion_enviada,
        fecha_notificacion,
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
    
    // Calcular tiempo exacto
    const milisegundosVencidos = ahora.getTime() - fechaFin.getTime()
    const tiempoVencidoTexto = calcularTiempoVencido(Math.abs(milisegundosVencidos))
    
    const empleado = reserva.empleados as any
    const coche = reserva.coches as any
    
    let resultados = {
      reservaId: reservaId,
      timestamp: ahora.toISOString(),
      timestampLocal: ahora.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      
      datosReserva: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
        email: empleado.email,
        movil: empleado.movil,
        vehiculo: {
          matricula: coche.matricula,
          marca: coche.marca,
          modelo: coche.modelo,
          descripcionCompleta: `${coche.marca} ${coche.modelo}`
        },
        fechaInicio: fechaInicio.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
        fechaFin: fechaFin.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
        tiempoCalculado: milisegundosVencidos > 0 ? `${tiempoVencidoTexto} vencida` : `Vence en ${tiempoVencidoTexto}`
      },
      
      resultadoEmail: null as any,
      resultadoWhatsApp: null as any,
      errores: [] as string[]
    }

    // 1. Probar envío de email
    try {
      console.log(`📧 Enviando email de prueba a ${empleado.email}`)
      
      const resultadoEmail = await enviarEmailReservaVencida(
        empleado.email,
        `${empleado.nombre} ${empleado.apellidos}`,
        {
          matricula: coche.matricula,
          marca: coche.marca,
          modelo: coche.modelo
        },
        fechaInicio,
        fechaFin,
        tiempoVencidoTexto
      )

      resultados.resultadoEmail = {
        enviado: resultadoEmail.success,
        error: resultadoEmail.success ? null : resultadoEmail.error,
        detalles: resultadoEmail
      }
      
      if (resultadoEmail.success) {
        console.log(`✅ Email de prueba enviado exitosamente`)
      } else {
        console.error(`❌ Error enviando email de prueba: ${resultadoEmail.error}`)
        resultados.errores.push(`Email: ${resultadoEmail.error}`)
      }
    } catch (error) {
      console.error(`❌ Excepción enviando email:`, error)
      resultados.errores.push(`Email: ${error}`)
      resultados.resultadoEmail = {
        enviado: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        detalles: null
      }
    }

    // 2. Probar envío de WhatsApp si tiene móvil
    if (empleado.movil) {
      try {
        const telefonoFormateado = formatSpanishPhone(empleado.movil)
        console.log(`📱 Enviando WhatsApp de prueba a ${telefonoFormateado}`)
        
        const resultadoWhatsApp = await sendWhatsAppNotification(
          telefonoFormateado,
          `${empleado.nombre} ${empleado.apellidos}`,
          coche.matricula,
          fechaInicio,
          fechaFin,
          tiempoVencidoTexto
        )

        resultados.resultadoWhatsApp = {
          enviado: resultadoWhatsApp.success,
          telefono: telefonoFormateado,
          error: resultadoWhatsApp.success ? null : resultadoWhatsApp.error,
          detalles: resultadoWhatsApp
        }
        
        if (resultadoWhatsApp.success) {
          console.log(`✅ WhatsApp de prueba enviado exitosamente`)
        } else {
          console.error(`❌ Error enviando WhatsApp de prueba: ${resultadoWhatsApp.error}`)
          resultados.errores.push(`WhatsApp: ${resultadoWhatsApp.error}`)
        }
      } catch (error) {
        console.error(`❌ Excepción enviando WhatsApp:`, error)
        resultados.errores.push(`WhatsApp: ${error}`)
        resultados.resultadoWhatsApp = {
          enviado: false,
          telefono: empleado.movil,
          error: error instanceof Error ? error.message : 'Error desconocido',
          detalles: null
        }
      }
    } else {
      resultados.resultadoWhatsApp = {
        enviado: false,
        telefono: null,
        error: 'No tiene móvil configurado',
        detalles: null
      }
    }

    return NextResponse.json(resultados, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error(`❌ Error en test de notificación para reserva ${params?.id}:`, error)
    return NextResponse.json({
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Error desconocido',
      reservaId: params?.id
    }, { status: 500 })
  }
}

// GET para mostrar formulario de test
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const reservaId = params.id
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>🧪 Test Notificación - Reserva ${reservaId}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
      .container { max-width: 800px; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .button { background: #28a745; color: white; padding: 15px 25px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 10px 5px; }
      .button:hover { background: #218838; }
      .button:disabled { background: #ccc; cursor: not-allowed; }
      .button.danger { background: #dc3545; }
      .button.danger:hover { background: #c82333; }
      .result { margin-top: 20px; padding: 20px; border-radius: 8px; }
      .success { background: #d4edda; color: #155724; }
      .error { background: #f8d7da; color: #721c24; }
      .loading { background: #d1ecf1; color: #0c5460; }
      pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; font-size: 12px; }
      .warning { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0; }
      .info { background: #d1ecf1; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8; margin: 20px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🧪 Test de Notificación</h1>
      <h2>Reserva ID: ${reservaId}</h2>
      
      <div class="info">
        <strong>ℹ️ Información:</strong> Este endpoint enviará notificaciones reales de prueba (email y WhatsApp) para la reserva especificada.
      </div>
      
      <div class="warning">
        <strong>⚠️ Advertencia:</strong> Esto enviará emails y WhatsApp reales al empleado. Úsalo solo para testing.
      </div>
      
      <button class="button" onclick="verDiagnostico()">
        📊 Ver Diagnóstico de Reserva
      </button>
      
      <button class="button danger" id="testBtn" onclick="enviarNotificacionTest()">
        🧪 ENVIAR NOTIFICACIÓN DE PRUEBA
      </button>
      
      <div id="result"></div>
    </div>

    <script>
      async function verDiagnostico() {
        window.open('/api/public/reserva-diagnostico/${reservaId}', '_blank')
      }
      
      async function enviarNotificacionTest() {
        const button = document.getElementById('testBtn')
        const resultDiv = document.getElementById('result')
        
        button.disabled = true
        button.textContent = '⏳ Enviando...'
        
        resultDiv.className = 'result loading'
        resultDiv.innerHTML = '⏳ Enviando notificaciones de prueba...'
        
        try {
          const response = await fetch('/api/public/test-notificacion/${reservaId}', {
            method: 'POST'
          })
          
          const result = await response.json()
          
          if (response.ok) {
            const emailIcon = result.resultadoEmail?.enviado ? '✅' : '❌'
            const whatsappIcon = result.resultadoWhatsApp?.enviado ? '✅' : '❌'
            
            resultDiv.className = 'result success'
            resultDiv.innerHTML = \`
              <h3>📧 Resultado del Test</h3>
              <p><strong>Timestamp:</strong> \${result.timestampLocal}</p>
              
              <h4>👤 Datos de la Reserva:</h4>
              <ul>
                <li><strong>Empleado:</strong> \${result.datosReserva.empleado}</li>
                <li><strong>Email:</strong> \${result.datosReserva.email}</li>
                <li><strong>Móvil:</strong> \${result.datosReserva.movil || 'No configurado'}</li>
                <li><strong>Vehículo:</strong> \${result.datosReserva.vehiculo.descripcionCompleta} (\${result.datosReserva.vehiculo.matricula})</li>
                <li><strong>Estado:</strong> \${result.datosReserva.tiempoCalculado}</li>
              </ul>
              
              <h4>📊 Resultados de Envío:</h4>
              <ul>
                <li>\${emailIcon} <strong>Email:</strong> \${result.resultadoEmail?.enviado ? 'Enviado correctamente' : 'Error: ' + result.resultadoEmail?.error}</li>
                <li>\${whatsappIcon} <strong>WhatsApp:</strong> \${result.resultadoWhatsApp?.enviado ? 'Enviado correctamente' : 'Error: ' + result.resultadoWhatsApp?.error}</li>
              </ul>
              
              \${result.errores.length > 0 ? '<h4>❌ Errores:</h4><ul>' + result.errores.map(e => '<li>' + e + '</li>').join('') + '</ul>' : ''}
              
              <h4>📋 Detalles Completos:</h4>
              <pre>\${JSON.stringify(result, null, 2)}</pre>
            \`
          } else {
            resultDiv.className = 'result error'
            resultDiv.innerHTML = \`
              <h3>❌ Error en el Test</h3>
              <p>\${result.error}</p>
              <pre>\${JSON.stringify(result, null, 2)}</pre>
            \`
          }
        } catch (error) {
          resultDiv.className = 'result error'
          resultDiv.innerHTML = \`
            <h3>❌ Error de Conexión</h3>
            <p>\${error.message}</p>
          \`
        } finally {
          button.disabled = false
          button.textContent = '🧪 ENVIAR NOTIFICACIÓN DE PRUEBA'
        }
      }
    </script>
  </body>
  </html>
  `
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    }
  })
}
