import { NextRequest, NextResponse } from 'next/server'
import { verificarReservasVencidas } from '@/app/actions/notificaciones'
import { probarConfiguracionEmail, enviarEmailPrueba } from '@/lib/email'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { obtenerEmpleadoPorEmail } from '@/lib/roles'

export async function GET(request: NextRequest) {
  try {
    // Verificar autorización: puede ser nuestro token o headers de Vercel Cron
  const authHeader = request.headers.get('authorization')
    const userAgent = request.headers.get('user-agent')
    
    const expectedToken = process.env.CRON_SECRET_TOKEN
    const isVercelCron = userAgent?.includes('vercel-cron') || 
                        request.headers.get('x-vercel-cron') === '1'
    
    // Permitir si es Vercel Cron o si tiene nuestro token
    if (!isVercelCron && (!expectedToken || authHeader !== `Bearer ${expectedToken}`)) {
      return NextResponse.json(
        { 
          error: 'No autorizado',
          timestamp: new Date().toISOString(),
          source: isVercelCron ? 'vercel-cron' : 'manual'
        }, 
        { status: 401 }
      )
    }

    console.log('🚀 Iniciando verificación programada de reservas vencidas')
    console.log(`📍 Fuente: ${isVercelCron ? 'Vercel Cron' : 'Manual/Local'}`)
    
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
      timestamp: new Date().toISOString(),
      source: isVercelCron ? 'cron' : 'manual'
    }, { headers: { 'Cache-Control': 'no-store' } })

  } catch (error) {
    console.error('❌ Error en cron job de notificaciones:', error)
    
    return NextResponse.json({ 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
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
        timestamp: new Date().toISOString(),
        source: 'manual'
      }, { headers: { 'Cache-Control': 'no-store' } })
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
          from: resultado.from,
          to: resultado.to,
          subject: resultado.subject,
          messageId: resultado.messageId,
          destinatario: resultado.destinatario,
          accepted: resultado.accepted,
          rejected: resultado.rejected,
          response: resultado.response,
          timestamp: resultado.timestamp,
        } : undefined,
        timestamp: new Date().toISOString(),
        source: 'manual'
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (body.action === 'send-test-auth-user') {
      const session = await getServerSession(authOptions)

      if (!session?.user?.email) {
        return NextResponse.json({
          success: false,
          message: 'Usuario no autenticado',
          timestamp: new Date().toISOString(),
          source: 'manual'
        }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
      }

      const empleado = await obtenerEmpleadoPorEmail(session.user.email)
      const destinatario = empleado?.email || session.user.email
      const nombreDestinatario = empleado
        ? `${empleado.nombre || ''} ${empleado.apellidos || ''}`.trim() || session.user.name || destinatario
        : session.user.name || destinatario

      const resultado = await enviarEmailPrueba(destinatario, nombreDestinatario)

      return NextResponse.json({
        success: resultado.success,
        message: resultado.success
          ? `Email de prueba enviado a ${resultado.destinatario}`
          : `Error enviando email: ${resultado.error}`,
        data: resultado.success ? {
          from: resultado.from,
          to: resultado.to,
          subject: resultado.subject,
          messageId: resultado.messageId,
          destinatario: resultado.destinatario,
          accepted: resultado.accepted,
          rejected: resultado.rejected,
          response: resultado.response,
          timestamp: resultado.timestamp,
        } : undefined,
        timestamp: new Date().toISOString(),
        source: 'manual'
      }, { headers: { 'Cache-Control': 'no-store' } })
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
        timestamp: new Date().toISOString(),
        source: 'manual'
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    return NextResponse.json(
      { error: 'Acción no válida' }, 
      { status: 400 }
    )

  } catch (error) {
    console.error('❌ Error en POST cron job:', error)
    
    return NextResponse.json({ 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
