import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarReservasVencidas } from '@/app/actions/notificaciones'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Iniciando test completo de notificaciones WhatsApp + Email')

    // 1. Crear una reserva de prueba vencida para rquintela (ID 16)
    const fechaVencida = new Date()
    fechaVencida.setHours(fechaVencida.getHours() - 3) // 3 horas atrás
    
    const reservaPrueba = {
      empleado_id: 16,
      matricula: 'TEST-WHT',
      marca: 'Toyota',
      modelo: 'Corolla',
      fecha_inicio: new Date(fechaVencida.getTime() - (8 * 60 * 60 * 1000)).toISOString(), // 8 horas antes
      fecha_fin: fechaVencida.toISOString(),
      estado: 'activa',
      notificacion_enviada: null
    }

    console.log('📝 Creando reserva de prueba:', reservaPrueba)

    // Insertar reserva de prueba
    const { data: nuevaReserva, error: errorInsertar } = await supabase
      .from('reservas')
      .insert(reservaPrueba)
      .select()
      .single()

    if (errorInsertar) {
      console.error('❌ Error creando reserva de prueba:', errorInsertar)
      return NextResponse.json({ 
        success: false, 
        error: 'Error creando reserva de prueba',
        details: errorInsertar
      })
    }

    console.log('✅ Reserva de prueba creada:', nuevaReserva)

    // 2. Verificar datos del empleado
    const { data: empleado, error: errorEmpleado } = await supabase
      .from('empleados')
      .select('id, nombre, apellidos, email, movil')
      .eq('id', 16)
      .single()

    if (errorEmpleado || !empleado) {
      console.error('❌ Error obteniendo empleado:', errorEmpleado)
      return NextResponse.json({ 
        success: false, 
        error: 'Empleado no encontrado' 
      })
    }

    console.log('👤 Empleado encontrado:', empleado)

    // 3. Ejecutar el sistema de notificaciones
    console.log('🚀 Ejecutando verificarReservasVencidas...')
    const resultado = await verificarReservasVencidas()
    
    console.log('📊 Resultado de notificaciones:', resultado)

    // 4. Limpiar - eliminar la reserva de prueba
    const { error: errorLimpiar } = await supabase
      .from('reservas')
      .delete()
      .eq('id', nuevaReserva.id)

    if (errorLimpiar) {
      console.warn('⚠️ No se pudo eliminar reserva de prueba:', errorLimpiar)
    } else {
      console.log('🧹 Reserva de prueba eliminada')
    }

    return NextResponse.json({
      success: true,
      message: 'Test completado',
      empleado: empleado,
      reservaCreada: nuevaReserva,
      resultadoNotificaciones: resultado
    })

  } catch (error) {
    console.error('❌ Error en test:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// GET para mostrar formulario de test
export async function GET() {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>🧪 Test Sistema de Notificaciones</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
      .container { max-width: 800px; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .header { text-align: center; margin-bottom: 30px; }
      .test-info { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
      .warning { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffeb3b; }
      button { background: #25D366; color: white; padding: 15px 30px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; }
      button:hover { background: #128C7E; }
      button:disabled { background: #ccc; cursor: not-allowed; }
      .result { margin-top: 30px; padding: 20px; border-radius: 8px; }
      .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
      .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
      .loading { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
      pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🧪 Test Sistema de Notificaciones</h1>
        <p>Prueba completa de Email + WhatsApp</p>
      </div>
      
      <div class="test-info">
        <h3>📋 Lo que hará este test:</h3>
        <ol>
          <li>Crear una reserva vencida temporal para el usuario ID 16 (rquintela@fulcrum.es)</li>
          <li>Ejecutar el sistema de notificaciones automáticas</li>
          <li>Enviar tanto Email como WhatsApp (si tiene móvil configurado)</li>
          <li>Limpiar la reserva de prueba</li>
          <li>Mostrar los logs detallados</li>
        </ol>
      </div>

      <div class="warning">
        <strong>⚠️ Importante:</strong> Asegúrate de que:
        <ul>
          <li>Las credenciales de Twilio están configuradas en .env.local</li>
          <li>Tu número de WhatsApp (636544515) esté registrado en el sandbox de Twilio</li>
          <li>El empleado ID 16 existe con email y móvil configurados</li>
        </ul>
      </div>
      
      <button id="testBtn" onclick="runTest()">
        🚀 Ejecutar Test Completo
      </button>
      
      <div id="result"></div>
    </div>

    <script>
      async function runTest() {
        const button = document.getElementById('testBtn')
        const resultDiv = document.getElementById('result')
        
        button.disabled = true
        button.textContent = '⏳ Ejecutando test...'
        
        resultDiv.className = 'result loading'
        resultDiv.innerHTML = '⏳ Creando reserva de prueba y ejecutando notificaciones...'
        
        try {
          const response = await fetch('/api/test/notificaciones-completo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          
          const result = await response.json()
          
          if (result.success) {
            resultDiv.className = 'result success'
            resultDiv.innerHTML = \`
              <h3>✅ Test completado exitosamente</h3>
              
              <h4>👤 Empleado:</h4>
              <pre>\${JSON.stringify(result.empleado, null, 2)}</pre>
              
              <h4>📝 Reserva creada:</h4>
              <pre>\${JSON.stringify(result.reservaCreada, null, 2)}</pre>
              
              <h4>📊 Resultado notificaciones:</h4>
              <pre>\${JSON.stringify(result.resultadoNotificaciones, null, 2)}</pre>
              
              <p><strong>🎉 Revisa tu email y WhatsApp para ver si llegaron las notificaciones!</strong></p>
            \`
          } else {
            resultDiv.className = 'result error'
            resultDiv.innerHTML = \`
              <h3>❌ Error en el test</h3>
              <p><strong>Error:</strong> \${result.error}</p>
              \${result.details ? \`<pre>\${JSON.stringify(result.details, null, 2)}</pre>\` : ''}
            \`
          }
        } catch (error) {
          resultDiv.className = 'result error'
          resultDiv.innerHTML = \`
            <h3>❌ Error de conexión</h3>
            <p>\${error.message}</p>
          \`
        } finally {
          button.disabled = false
          button.textContent = '🚀 Ejecutar Test Completo'
        }
      }
    </script>
  </body>
  </html>
  `
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}
