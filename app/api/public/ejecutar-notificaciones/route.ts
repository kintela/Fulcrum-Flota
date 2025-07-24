import { NextRequest, NextResponse } from 'next/server'
import { verificarReservasVencidas } from '@/app/actions/notificaciones'

export async function POST() {
  try {
    console.log('🚀 EJECUTANDO sistema de notificaciones (endpoint público)')
    console.log('🔍 Timestamp:', new Date().toISOString())
    
    const resultado = await verificarReservasVencidas()
    
    console.log('📊 Resultado de verificarReservasVencidas:', resultado)
    
    return NextResponse.json({
      success: true,
      message: 'Sistema de notificaciones ejecutado',
      resultado: resultado,
      timestamp: new Date().toISOString(),
      timestampLocal: new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      nota: 'Revisa los logs del servidor para detalles completos'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('❌ Error ejecutando notificaciones:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Error ejecutando sistema de notificaciones',
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

// GET para mostrar interfaz
export async function GET() {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>🚀 Ejecutar Notificaciones</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
      .container { max-width: 800px; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .button { background: #dc3545; color: white; padding: 15px 25px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
      .button:hover { background: #c82333; }
      .button:disabled { background: #ccc; cursor: not-allowed; }
      .result { margin-top: 20px; padding: 20px; border-radius: 8px; }
      .success { background: #d4edda; color: #155724; }
      .error { background: #f8d7da; color: #721c24; }
      .loading { background: #d1ecf1; color: #0c5460; }
      pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; font-size: 12px; }
      .warning { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🚀 Ejecutar Sistema de Notificaciones</h1>
      <p>Este endpoint ejecutará el sistema completo de notificaciones Email + WhatsApp</p>
      
      <div class="warning">
        <strong>⚠️ Advertencia:</strong> Esto enviará notificaciones reales por email y WhatsApp a empleados con reservas vencidas.
      </div>
      
      <button class="button" id="ejecutarBtn" onclick="ejecutarNotificaciones()">
        🔥 Ejecutar Notificaciones Ahora
      </button>
      
      <div id="resultado"></div>
    </div>

    <script>
      async function ejecutarNotificaciones() {
        const button = document.getElementById('ejecutarBtn')
        const resultDiv = document.getElementById('resultado')
        
        button.disabled = true
        button.textContent = '⏳ Ejecutando...'
        
        resultDiv.className = 'result loading'
        resultDiv.innerHTML = '⏳ Ejecutando sistema de notificaciones...'
        
        try {
          const response = await fetch('/api/public/ejecutar-notificaciones', {
            method: 'POST'
          })
          
          const result = await response.json()
          
          if (result.success) {
            resultDiv.className = 'result success'
            resultDiv.innerHTML = \`
              <h3>✅ Sistema Ejecutado</h3>
              <pre>\${JSON.stringify(result, null, 2)}</pre>
              <p><strong>📧 Revisa tu email y WhatsApp para ver si llegaron las notificaciones</strong></p>
            \`
          } else {
            resultDiv.className = 'result error'
            resultDiv.innerHTML = \`
              <h3>❌ Error</h3>
              <pre>\${JSON.stringify(result, null, 2)}</pre>
            \`
          }
        } catch (error) {
          resultDiv.className = 'result error'
          resultDiv.innerHTML = \`❌ Error de conexión: \${error.message}\`
        } finally {
          button.disabled = false
          button.textContent = '🔥 Ejecutar Notificaciones Ahora'
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
