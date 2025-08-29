// SCHEDULER COMPLETAMENTE DESHABILITADO
// Solo se ejecutará manualmente via API o con Vercel Cron Jobs

import { iniciarCronJob } from './scheduler'

console.log('🚫 SCHEDULER AUTOMÁTICO DESHABILITADO')
console.log('   Solo se ejecutará:')
console.log('   - Manualmente via /api/public/forzar-notificaciones')
console.log('   - Automáticamente con Vercel Cron Jobs en producción')

// CÓDIGO COMPLETAMENTE DESHABILITADO - No se ejecuta nunca automáticamente
// Verificar si estamos en el servidor (no en el browser)
if (false) { // <-- FORZAMOS A FALSE PARA NUNCA EJECUTAR
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
