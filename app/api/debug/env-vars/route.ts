import { NextResponse } from 'next/server'

// Bypass authentication for debug endpoint
export const runtime = 'edge'

export async function GET() {
  try {
    // Verificar qué variables de entorno están disponibles
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Definida' : '❌ No definida',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Definida' : '❌ No definida',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Definida' : '❌ No definida',
      GRAPH_TENANT_ID: process.env.GRAPH_TENANT_ID ? '✅ Definida' : '❌ No definida',
      GRAPH_CLIENT_ID: process.env.GRAPH_CLIENT_ID ? '✅ Definida' : '❌ No definida',
      GRAPH_CLIENT_SECRET: process.env.GRAPH_CLIENT_SECRET ? '✅ Definida' : '❌ No definida',
      GRAPH_FROM_EMAIL: (process.env.GRAPH_FROM_EMAIL || process.env.FROM_EMAIL) ? '✅ Definida' : '❌ No definida',
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? '✅ Definida' : '❌ No definida',
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? '✅ Definida' : '❌ No definida',
      TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM ? '✅ Definida' : '❌ No definida',
      CRON_SECRET_TOKEN: process.env.CRON_SECRET_TOKEN ? '✅ Definida' : '❌ No definida',
      NODE_ENV: process.env.NODE_ENV || 'undefined'
    }

    // Valores parciales (primeros y últimos caracteres) para seguridad
    const envValues = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?
        `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 12)}...` :
        'undefined',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'defined' : 'undefined',
      GRAPH_TENANT_ID: process.env.GRAPH_TENANT_ID ? 'defined' : 'undefined',
      GRAPH_CLIENT_ID: process.env.GRAPH_CLIENT_ID ? 'defined' : 'undefined',
      GRAPH_CLIENT_SECRET: process.env.GRAPH_CLIENT_SECRET ? 'defined' : 'undefined',
      GRAPH_FROM_EMAIL: process.env.GRAPH_FROM_EMAIL || process.env.FROM_EMAIL || 'undefined',
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
