import { NextRequest, NextResponse } from 'next/server'
import { verificarReservasVencidas } from '@/app/actions/notificaciones'
import { probarConfiguracionEmail, enviarEmailPrueba } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    // Verificar si la petición viene de un cron job autorizado
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'No autorizado' }, 
        { status: 401 }
      )
    }

    console.log('🚀 Iniciando verificación programada de reservas vencidas')
    
    // Verificar configuración de email
    const emailConfig = await probarConfiguracionEmail()
    if (!emailConfig) {
      return NextResponse.json(
        { 
          error: 'Configuración de email inválida',
          timestamp: new Date().toISOString()
        }, 
        { status: 500 }
      )
    }

    // Ejecutar verificación de reservas vencidas
    const resultado = await verificarReservasVencidas()

    return NextResponse.json({
      success: resultado.success,
      message: resultado.message,
      data: {
        reservasEncontradas: resultado.reservasEncontradas || 0,
        reservasNotificadas: resultado.reservasNotificadas || 0,
        erroresEnvio: resultado.erroresEnvio || 0
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error en cron job de notificaciones:', error)
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Permitir ejecución manual desde la interfaz (requiere autenticación)
    const body = await request.json()
    
    if (body.action === 'test') {
      // Ejecutar prueba de configuración
      const emailConfig = await probarConfiguracionEmail()
      
      return NextResponse.json({
        success: emailConfig,
        message: emailConfig ? 'Configuración de email válida' : 'Error en configuración de email',
        timestamp: new Date().toISOString()
      })
    }

    if (body.action === 'send-test') {
      // Enviar email de prueba
      const resultado = await enviarEmailPrueba()
      
      return NextResponse.json({
        success: resultado.success,
        message: resultado.success 
          ? `Email de prueba enviado exitosamente a ${resultado.destinatario}` 
          : `Error enviando email: ${resultado.error}`,
        data: resultado.success ? {
          messageId: resultado.messageId,
          destinatario: resultado.destinatario
        } : undefined,
        timestamp: new Date().toISOString()
      })
    }

    if (body.action === 'run') {
      // Ejecutar verificación manual
      const resultado = await verificarReservasVencidas()
      
      return NextResponse.json({
        success: resultado.success,
        message: resultado.message,
        data: {
          reservasEncontradas: resultado.reservasEncontradas || 0,
          reservasNotificadas: resultado.reservasNotificadas || 0,
          erroresEnvio: resultado.erroresEnvio || 0
        },
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json(
      { error: 'Acción no válida' }, 
      { status: 400 }
    )

  } catch (error) {
    console.error('❌ Error en POST cron job:', error)
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}
