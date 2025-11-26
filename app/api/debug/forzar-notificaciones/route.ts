import { NextResponse } from 'next/server'
import { verificarReservasVencidas } from '@/app/actions/notificaciones'

export async function POST() {
  try {
    console.log('🚀 FORZANDO ejecución de verificarReservasVencidas')
    console.log('🔍 Esta ejecución es MANUAL, no desde cron')
    
    const resultado = await verificarReservasVencidas()
    
    console.log('📊 Resultado de la ejecución forzada:', resultado)
    
    return NextResponse.json({
      success: true,
      message: 'Ejecución forzada completada',
      resultado: resultado,
      timestamp: new Date().toISOString(),
      timestampLocal: new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
    })

  } catch (error) {
    console.error('❌ Error en ejecución forzada:', error)
    return NextResponse.json({
      success: false,
      error: 'Error en ejecución forzada',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// GET para mostrar interfaz de test
export async function GET() {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>🔧 Debug Notificaciones</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
      .container { max-width: 1000px; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
      .button { background: #007bff; color: white; padding: 15px 25px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
      .button:hover { background: #0056b3; }
      .force-btn { background: #dc3545; }
      .force-btn:hover { background: #c82333; }
      .result { margin-top: 20px; padding: 20px; border-radius: 8px; }
      .success { background: #d4edda; color: #155724; }
      .error { background: #f8d7da; color: #721c24; }
      .loading { background: #d1ecf1; color: #0c5460; }
      pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; font-size: 12px; }
      .warning { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🔧 Debug Sistema de Notificaciones</h1>
      <p>Herramientas para diagnosticar el sistema de notificaciones Email + WhatsApp</p>
      
      <div class="section">
        <h3>📊 1. Diagnóstico de Reservas</h3>
        <p>Ver todas las reservas del empleado ID 16 y analizar cuáles deberían ser notificadas</p>
        <button class="button" onclick="diagnosticar()">🔍 Diagnosticar Reservas</button>
        <div id="diagnostico-result"></div>
      </div>
      
      <div class="section">
        <h3>🚀 2. Forzar Notificaciones</h3>
        <div class="warning">
          <strong>⚠️ Advertencia:</strong> Esto ejecutará el sistema real de notificaciones y enviará emails/WhatsApp si encuentra reservas vencidas.
        </div>
        <button class="button force-btn" onclick="forzarNotificaciones()">🔥 Forzar Ejecución</button>
        <div id="forzar-result"></div>
      </div>
    </div>

    <script>
      async function diagnosticar() {
        const resultDiv = document.getElementById('diagnostico-result')
        resultDiv.className = 'result loading'
        resultDiv.innerHTML = '⏳ Analizando reservas...'
        
        try {
          const response = await fetch('/api/debug/reservas-vencidas')
          const result = await response.json()
          
          resultDiv.className = 'result success'
          resultDiv.innerHTML = \`
            <h4>📊 Diagnóstico Completado</h4>
            <pre>\${JSON.stringify(result, null, 2)}</pre>
          \`
        } catch (error) {
          resultDiv.className = 'result error'
          resultDiv.innerHTML = \`❌ Error: \${error.message}\`
        }
      }
      
      async function forzarNotificaciones() {
        const resultDiv = document.getElementById('forzar-result')
        resultDiv.className = 'result loading'
        resultDiv.innerHTML = '⏳ Ejecutando sistema de notificaciones...'
        
        try {
          const response = await fetch('/api/debug/forzar-notificaciones', {
            method: 'POST'
          })
          const result = await response.json()
          
          if (result.success) {
            resultDiv.className = 'result success'
            resultDiv.innerHTML = \`
              <h4>✅ Ejecución Completada</h4>
              <pre>\${JSON.stringify(result, null, 2)}</pre>
              <p><strong>🎯 Revisa los logs del servidor para ver detalles detallados</strong></p>
            \`
          } else {
            resultDiv.className = 'result error'
            resultDiv.innerHTML = \`
              <h4>❌ Error en Ejecución</h4>
              <pre>\${JSON.stringify(result, null, 2)}</pre>
            \`
          }
        } catch (error) {
          resultDiv.className = 'result error'
          resultDiv.innerHTML = \`❌ Error de conexión: \${error.message}\`
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
