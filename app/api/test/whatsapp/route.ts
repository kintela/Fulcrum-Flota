import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage, formatSpanishPhone } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const { to, message, mediaUrl } = await request.json()

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: to, message' },
        { status: 400 }
      )
    }

    // Formatear el número de teléfono
    const phoneFormatted = formatSpanishPhone(to)
    
    console.log(`📱 Test WhatsApp API: enviando a ${phoneFormatted}`)

    const result = await sendWhatsAppMessage({
      to: phoneFormatted,
      message,
      mediaUrl
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp enviado exitosamente',
        messageSid: result.messageSid,
        to: phoneFormatted
      })
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result.error 
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Error en test WhatsApp:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}

// GET para mostrar formulario de prueba
export async function GET() {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Test WhatsApp API</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; }
      .container { max-width: 600px; }
      .form-group { margin: 15px 0; }
      label { display: block; margin-bottom: 5px; font-weight: bold; }
      input, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; }
      button { background: #25D366; color: white; padding: 10px 20px; border: none; cursor: pointer; }
      button:hover { background: #128C7E; }
      .result { margin-top: 20px; padding: 10px; border-radius: 5px; }
      .success { background: #d4edda; color: #155724; }
      .error { background: #f8d7da; color: #721c24; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🧪 Test WhatsApp API</h1>
      <p>Envía un mensaje de prueba a través de Twilio WhatsApp</p>
      
      <form id="testForm">
        <div class="form-group">
          <label>Número de teléfono:</label>
          <input type="text" id="to" placeholder="+34600123456 o 600123456" required>
          <small>Formato: +34XXXXXXXXX o XXXXXXXXX</small>
        </div>
        
        <div class="form-group">
          <label>Mensaje:</label>
          <textarea id="message" rows="4" required>🧪 Test desde Fulcrum Flota

¡Hola! Este es un mensaje de prueba desde el sistema de notificaciones.

Si recibes este mensaje, la integración WhatsApp está funcionando correctamente ✅</textarea>
        </div>
        
        <div class="form-group">
          <label>URL de media (opcional):</label>
          <input type="url" id="mediaUrl" placeholder="https://ejemplo.com/imagen.jpg">
        </div>
        
        <button type="submit">📱 Enviar WhatsApp</button>
      </form>
      
      <div id="result"></div>
    </div>

    <script>
      document.getElementById('testForm').addEventListener('submit', async (e) => {
        e.preventDefault()
        
        const resultDiv = document.getElementById('result')
        resultDiv.innerHTML = '⏳ Enviando...'
        
        const formData = {
          to: document.getElementById('to').value,
          message: document.getElementById('message').value,
          mediaUrl: document.getElementById('mediaUrl').value || undefined
        }
        
        try {
          const response = await fetch('/api/test/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          })
          
          const result = await response.json()
          
          if (result.success) {
            resultDiv.className = 'result success'
            resultDiv.innerHTML = \`
              ✅ <strong>WhatsApp enviado exitosamente!</strong><br>
              📱 Enviado a: \${result.to}<br>
              🆔 Message SID: \${result.messageSid}
            \`
          } else {
            resultDiv.className = 'result error'
            resultDiv.innerHTML = \`❌ <strong>Error:</strong> \${result.error}\`
          }
        } catch (error) {
          resultDiv.className = 'result error'
          resultDiv.innerHTML = \`❌ <strong>Error de conexión:</strong> \${error.message}\`
        }
      })
    </script>
  </body>
  </html>
  `
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}
