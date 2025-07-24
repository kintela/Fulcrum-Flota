import { NextRequest, NextResponse } from 'next/server'
import { verificarReservasVencidasV2 } from '@/app/actions/notificaciones-v2'

export async function POST() {
  try {
    console.log('🧪 Probando sistema V2 con prevención de duplicados mejorada')
    
    const resultado = await verificarReservasVencidasV2()
    
    return NextResponse.json({
      success: true,
      message: 'Prueba V2 completada',
      resultado: resultado,
      timestamp: new Date().toISOString(),
      timestampLocal: new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('❌ Error en prueba V2:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Error en prueba V2',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { 
      status: 500,
      headers: {
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
    <title>🧪 Test Sistema V2 - Sin Duplicados</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
      .container { max-width: 800px; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .warning { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
      .info { background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0dcaf0; }
      button { background: #28a745; color: white; padding: 15px 30px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin: 10px 0; }
      button:hover { background: #218838; }
      button:disabled { background: #ccc; cursor: not-allowed; }
      .result { margin-top: 30px; padding: 20px; border-radius: 8px; }
      .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
      .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
      .loading { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
      pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🧪 Test Sistema V2 - Prevención de Duplicados</h1>
      
      <div class="info">
        <h3>🔧 Mejoras V2:</h3>
        <ul>
          <li><strong>Claim atómico:</strong> Cada ejecución "reclama" reservas antes de procesarlas</li>
          <li><strong>ID de ejecución único:</strong> Previene race conditions</li>
          <li><strong>Reversión de claims:</strong> Si algo falla, se revierte el claim</li>
          <li><strong>Logs detallados:</strong> Mejor debugging</li>
        </ul>
      </div>

      <div class="warning">
        <strong>⚠️ El cron automático está deshabilitado</strong> para evitar más duplicados mientras probamos.
      </div>
      
      <button onclick="probarV2()">🚀 Probar Sistema V2</button>
      
      <div id="result"></div>
    </div>

    <script>
      async function probarV2() {
        const button = document.querySelector('button')
        const resultDiv = document.getElementById('result')
        
        button.disabled = true
        button.textContent = '⏳ Probando V2...'
        
        resultDiv.className = 'result loading'
        resultDiv.innerHTML = '⏳ Ejecutando sistema V2 con prevención de duplicados...'
        
        try {
          const response = await fetch('/api/public/test-v2', {
            method: 'POST'
          })
          
          const result = await response.json()
          
          if (result.success) {
            resultDiv.className = 'result success'
            resultDiv.innerHTML = \`
              <h3>✅ Prueba V2 Completada</h3>
              <pre>\${JSON.stringify(result, null, 2)}</pre>
              <p><strong>🎯 Si todo funciona bien, podemos reactivar el cron!</strong></p>
            \`
          } else {
            resultDiv.className = 'result error'
            resultDiv.innerHTML = \`
              <h3>❌ Error en Prueba V2</h3>
              <pre>\${JSON.stringify(result, null, 2)}</pre>
            \`
          }
        } catch (error) {
          resultDiv.className = 'result error'
          resultDiv.innerHTML = \`❌ Error: \${error.message}\`
        } finally {
          button.disabled = false
          button.textContent = '🚀 Probar Sistema V2'
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
