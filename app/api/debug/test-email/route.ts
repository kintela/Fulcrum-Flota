import { NextRequest, NextResponse } from 'next/server'
import { enviarEmailReservaVencida } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Probando configuración de email en producción')
    
    // Verificar variables
    const emailUser = process.env.EMAIL_USER
    const emailPassword = process.env.EMAIL_PASSWORD
    
    console.log('EMAIL_USER:', emailUser ? '✅ Definida' : '❌ No definida')
    console.log('EMAIL_PASSWORD:', emailPassword ? '✅ Definida' : '❌ No definida')
    
    if (!emailUser || !emailPassword) {
      return NextResponse.json({
        success: false,
        error: 'Variables de email no definidas',
        variables: {
          EMAIL_USER: emailUser ? 'definida' : 'undefined',
          EMAIL_PASSWORD: emailPassword ? 'definida' : 'undefined'
        }
      }, { status: 400 })
    }
    
    // Intentar enviar email de prueba
    const fechaPrueba = new Date()
    const resultado = await enviarEmailReservaVencida(
      'rquintela@fulcrum.es',
      'Roberto Quintela',
      {
        matricula: 'TEST-EMAIL',
        marca: 'Toyota',
        modelo: 'Test'
      },
      fechaPrueba,
      2
    )
    
    return NextResponse.json({
      success: true,
      message: 'Test de email completado',
      emailResult: resultado,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error en test de email:', error)
    return NextResponse.json({
      success: false,
      error: 'Error en test de email',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

export async function GET() {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>🧪 Test Email en Producción</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
      .container { max-width: 800px; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .button { background: #007bff; color: white; padding: 15px 25px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
      .button:hover { background: #0056b3; }
      .result { margin-top: 20px; padding: 20px; border-radius: 8px; }
      .success { background: #d4edda; color: #155724; }
      .error { background: #f8d7da; color: #721c24; }
      .loading { background: #d1ecf1; color: #0c5460; }
      pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; }
      .warning { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🧪 Test Email en Producción</h1>
      
      <div class="warning">
        <strong>⚠️ Importante:</strong> Esto enviará un email real de prueba a rquintela@fulcrum.es
      </div>
      
      <p>Este test verificará:</p>
      <ul>
        <li>✅ Variables de entorno EMAIL_USER y EMAIL_PASSWORD</li>
        <li>📧 Funcionamiento del sistema de email</li>
        <li>🔍 Logs detallados del proceso</li>
      </ul>
      
      <button class="button" onclick="testEmail()">📧 Probar Email</button>
      
      <div id="result"></div>
    </div>

    <script>
      async function testEmail() {
        const resultDiv = document.getElementById('result')
        resultDiv.className = 'result loading'
        resultDiv.innerHTML = '⏳ Probando configuración de email...'
        
        try {
          const response = await fetch('/api/debug/test-email', {
            method: 'POST'
          })
          const result = await response.json()
          
          if (result.success) {
            resultDiv.className = 'result success'
            resultDiv.innerHTML = \`
              <h4>✅ Test de Email Completado</h4>
              <pre>\${JSON.stringify(result, null, 2)}</pre>
              <p><strong>📧 Revisa tu bandeja de entrada!</strong></p>
            \`
          } else {
            resultDiv.className = 'result error'
            resultDiv.innerHTML = \`
              <h4>❌ Error en Test de Email</h4>
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
