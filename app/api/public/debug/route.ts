import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Este endpoint NO requiere autenticación - es público para debug
    console.log('🔍 Debug endpoint llamado desde:', new Date().toISOString())
    
    const diagnostico = {
      timestamp: new Date().toISOString(),
      message: "Debug endpoint funcionando",
      environment: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV,
      
      // Verificar variables críticas
      EMAIL_USER_EXISTS: !!process.env.EMAIL_USER,
      EMAIL_PASSWORD_EXISTS: !!process.env.EMAIL_PASSWORD,
      TWILIO_ACCOUNT_SID_EXISTS: !!process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN_EXISTS: !!process.env.TWILIO_AUTH_TOKEN,
      TWILIO_WHATSAPP_FROM_EXISTS: !!process.env.TWILIO_WHATSAPP_FROM,
      
      // Valores parciales para debug (seguros)
      EMAIL_USER_PARTIAL: process.env.EMAIL_USER ? 
        `${process.env.EMAIL_USER.substring(0, 3)}...${process.env.EMAIL_USER.slice(-3)}` : 
        'NOT_SET',
      TWILIO_WHATSAPP_FROM_VALUE: process.env.TWILIO_WHATSAPP_FROM || 'NOT_SET',
      
      // Variables de Supabase (públicas)
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
      SUPABASE_ANON_KEY_EXISTS: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }

    return NextResponse.json(diagnostico, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('❌ Error en debug público:', error)
    
    return NextResponse.json({
      error: 'Error en debug',
      message: error instanceof Error ? error.message : 'Error desconocido',
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
