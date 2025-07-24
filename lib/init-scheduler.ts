// Inicialización automática del sistema de scheduler
// Solo se ejecuta en el servidor (no en el browser)

import { iniciarCronJob } from './scheduler'

// Verificar si estamos en el servidor (no en el browser)
if (typeof window === 'undefined') {
  console.log('🔍 Verificando configuración del scheduler...')
  console.log('📍 Ejecutando en servidor (correcto)')
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`)
  console.log(`🔐 CRON_SECRET_TOKEN configurado: ${process.env.CRON_SECRET_TOKEN ? '✅ Sí' : '❌ No'}`)
  
  // Solo iniciar en desarrollo local - En producción usa Vercel Cron
  if (process.env.NODE_ENV === 'development' && process.env.CRON_SECRET_TOKEN) {
    try {
      console.log('🚀 Iniciando sistema de scheduler local (desarrollo)...')
      iniciarCronJob()
      console.log('✅ Scheduler local iniciado exitosamente')
    } catch (error) {
      console.error('❌ Error iniciando scheduler local:', error)
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.log('🌐 Producción detectada - usando Vercel Cron Jobs (sin scheduler local)')
  } else {
    console.log('⚠️ Scheduler no iniciado: falta CRON_SECRET_TOKEN en desarrollo')
  }
} else {
  console.log('🌐 Código ejecutándose en el browser - scheduler no iniciado')
}

export default true // Para poder importar este archivo
