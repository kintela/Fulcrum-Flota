import { NextRequest, NextResponse } from 'next/server'
import { verificarReservasVencidas } from '@/app/actions/notificaciones'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Forzando ejecución de notificaciones...')
    
    // Ejecutar el mismo código que ejecuta el cron
    const resultado = await verificarReservasVencidas()
    
    console.log('📊 Resultado:', resultado)

    return NextResponse.json({
      success: true,
      message: 'Ejecución forzada completada',
      resultado
    })

  } catch (error) {
    console.error('❌ Error forzando notificaciones:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

export async function GET() {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>🔧 Debug Sistema de Notificaciones</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
      .container { max-width: 1000px; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
      .diagnostic { background: #e7f3ff; }
      .force { background: #fff3e0; }
      button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
      .btn-danger { background: #dc3545; }
      .btn-success { background: #28a745; }
      button:hover { opacity: 0.8; }
      pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; max-height: 400px; overflow-y: auto; }
      .result { margin-top: 20px; padding: 15px; border-radius: 5px; }
      .success { background: #d4edda; color: #155724; }
      .error { background: #f8d7da; color: #721c24; }
      .loading { background: #d1ecf1; color: #0c5460; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🔧 Debug Sistema de Notificaciones</h1>
      <p>Herramientas para diagnosticar y probar el sistema de notificaciones</p>

      <div class="section diagnostic">
        <h3>🔍 1. Diagnóstico de Reservas</h3>
        <p>Revisa el estado actual de las reservas de rquintela@fulcrum.es</p>
        <button onclick="diagnosticar()">📊 Diagnosticar Reservas</button>
        <div id="diagnosticoResult"></div>
      </div>

      <div class="section force">
        <h3>🚀 2. Forzar Ejecución de Notificaciones</h3>
        <p>Ejecuta manualmente el sistema de notificaciones (igual que el cron job)</p>
        <button class="btn-danger" onclick="forzarNotificaciones()">⚡ Forzar Notificaciones AHORA</button>
        <div id="forzarResult"></div>
      </div>
    </div>

    <script>
      async function diagnosticar() {
        const resultDiv = document.getElementById('diagnosticoResult')
        resultDiv.className = 'result loading'
        resultDiv.innerHTML = '⏳ Analizando reservas...'
        
        try {
          const response = await fetch('/api/diagnostico/reservas')
          const result = await response.json()
          
          if (result.success) {
            resultDiv.className = 'result success'
            resultDiv.innerHTML = \`
              <h4>📊 Diagnóstico Completo:</h4>
              <pre>\${JSON.stringify(result.diagnostico, null, 2)}</pre>
              
              <h4>📝 Reservas del Usuario:</h4>
              <pre>\${JSON.stringify(result.reservasUsuario, null, 2)}</pre>
              
              <h4>📅 Reservas de Hoy:</h4>
              <pre>\${JSON.stringify(result.reservasHoy, null, 2)}</pre>
            \`
          } else {
            resultDiv.className = 'result error'
            resultDiv.innerHTML = \`❌ Error: \${result.error}\`
          }
        } catch (error) {
          resultDiv.className = 'result error'
          resultDiv.innerHTML = \`❌ Error de conexión: \${error.message}\`
        }
      }

      async function forzarNotificaciones() {
        const resultDiv = document.getElementById('forzarResult')
        resultDiv.className = 'result loading'
        resultDiv.innerHTML = '⏳ Ejecutando sistema de notificaciones...'
        
        try {
          const response = await fetch('/api/diagnostico/forzar-notificaciones', {
            method: 'POST'
          })
          const result = await response.json()
          
          if (result.success) {
            resultDiv.className = 'result success'
            resultDiv.innerHTML = \`
              <h4>✅ Ejecución Completada:</h4>
              <pre>\${JSON.stringify(result.resultado, null, 2)}</pre>
              
              <p><strong>🎯 Revisa tu email y WhatsApp para ver si llegaron las notificaciones!</strong></p>
            \`
          } else {
            resultDiv.className = 'result error'
            resultDiv.innerHTML = \`❌ Error: \${result.error}\`
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
