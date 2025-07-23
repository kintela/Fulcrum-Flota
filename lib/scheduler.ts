import cron from 'node-cron'

// Función para ejecutar la verificación de notificaciones
async function ejecutarVerificacionNotificaciones() {
  try {
    console.log('🔄 Ejecutando verificación programada de reservas vencidas:', new Date().toISOString())
    
    const response = await fetch('http://localhost:3000/api/cron/notificaciones', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    const resultado = await response.json()
    
    if (response.ok) {
      console.log('✅ Verificación completada:', {
        reservasEncontradas: resultado.data?.reservasEncontradas || 0,
        reservasNotificadas: resultado.data?.reservasNotificadas || 0,
        erroresEnvio: resultado.data?.erroresEnvio || 0
      })
    } else {
      console.error('❌ Error en verificación:', resultado.error)
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando cron job:', error)
  }
}

// Programar la tarea para ejecutarse cada hora
export function iniciarCronJob() {
  console.log('🚀 Iniciando sistema de notificaciones programadas')
  
  // Verificar configuración
  if (!process.env.CRON_SECRET_TOKEN) {
    console.error('❌ CRON_SECRET_TOKEN no configurado')
    return
  }

  // Ejecutar cada hora en el minuto 0
  cron.schedule('0 * * * *', ejecutarVerificacionNotificaciones, {
    timezone: "Europe/Madrid"
  })

  console.log('⏰ Cron job programado: cada hora en el minuto 0')
  
  // También programar una verificación cada 15 minutos durante horas laborales (8-20h)
  cron.schedule('*/15 8-20 * * 1-5', ejecutarVerificacionNotificaciones, {
    timezone: "Europe/Madrid"
  })

  console.log('⏰ Cron job adicional: cada 15 minutos de 8:00 a 20:00, Lunes a Viernes')
}

// Función para detener todos los cron jobs
export function detenerCronJobs() {
  cron.getTasks().forEach(task => {
    task.stop()
  })
  console.log('🛑 Todos los cron jobs detenidos')
}

// Función para ejecutar manualmente
export async function ejecutarManualmente() {
  console.log('🔧 Ejecutando verificación manual...')
  await ejecutarVerificacionNotificaciones()
}
