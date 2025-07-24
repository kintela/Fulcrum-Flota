import { NextRequest, NextResponse } from 'next/server'

// Bypass authentication for debug endpoint
export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    // Verificar qué variables de entorno están disponibles
    const envVars = {
      EMAIL_USER: process.env.EMAIL_USER ? '✅ Definida' : '❌ No definida',
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? '✅ Definida' : '❌ No definida',
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? '✅ Definida' : '❌ No definida',
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? '✅ Definida' : '❌ No definida',
      TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM ? '✅ Definida' : '❌ No definida',
      CRON_SECRET_TOKEN: process.env.CRON_SECRET_TOKEN ? '✅ Definida' : '❌ No definida',
      NODE_ENV: process.env.NODE_ENV || 'undefined'
    }

    // Valores parciales (primeros y últimos caracteres) para seguridad
    const envValues = {
      EMAIL_USER: process.env.EMAIL_USER ? 
        `${process.env.EMAIL_USER.substring(0, 3)}...${process.env.EMAIL_USER.substring(process.env.EMAIL_USER.length - 3)}` : 
        'undefined',
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 
        `${process.env.EMAIL_PASSWORD.substring(0, 3)}...${process.env.EMAIL_PASSWORD.substring(process.env.EMAIL_PASSWORD.length - 3)}` : 
        'undefined',
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? 
        `${process.env.TWILIO_ACCOUNT_SID.substring(0, 6)}...${process.env.TWILIO_ACCOUNT_SID.substring(process.env.TWILIO_ACCOUNT_SID.length - 6)}` : 
        'undefined',
      TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM || 'undefined'
    }

    const diagnostico = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      variablesStatus: envVars,
      variablesValues: envValues,
      isVercel: !!process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV
    }

    return NextResponse.json(diagnostico, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Error verificando variables de entorno',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
