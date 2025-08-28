import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Clock, Mail, Settings } from 'lucide-react'

interface EstadisticasNotificaciones {
  totalNotificacionesEnviadas: number
  notificacionesHoy: number
  ultimaEjecucion: string | null
  configuracionEmail: boolean
}

interface ResultadoPrueba {
  success: boolean
  message: string
  data?: {
    reservasEncontradas: number
    reservasNotificadas: number
    erroresEnvio: number
  }
  timestamp: string
}

export default function NotificacionesAdmin() {
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoPrueba | null>(null)
  const [estadisticas, setEstadisticas] = useState<EstadisticasNotificaciones | null>(null)
  const [resultadoActivacion, setResultadoActivacion] = useState<any | null>(null)

  const probarConfiguracion = async () => {
    setCargando(true)
    try {
      const response = await fetch('/api/cron/notificaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'test' })
      })

      const data = await response.json()
      setResultado(data)
    } catch (error) {
      setResultado({
        success: false,
        message: 'Error conectando con el servidor',
        timestamp: new Date().toISOString()
      })
    }
    setCargando(false)
  }

  const ejecutarManualmente = async () => {
    setCargando(true)
    try {
      const response = await fetch('/api/cron/notificaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'run' })
      })

      const data = await response.json()
      setResultado(data)
    } catch (error) {
      setResultado({
        success: false,
        message: 'Error ejecutando verificación',
        timestamp: new Date().toISOString()
      })
    }
    setCargando(false)
  }

  const enviarEmailPrueba = async () => {
    setCargando(true)
    try {
      const response = await fetch('/api/cron/notificaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'send-test' })
      })

      const data = await response.json()
      setResultado(data)
    } catch (error) {
      setResultado({
        success: false,
        message: 'Error enviando email de prueba',
        timestamp: new Date().toISOString()
      })
    }
    setCargando(false)
  }

  const activarPendientesManual = async () => {
    setCargando(true)
    try {
      const resp = await fetch('/api/cron/activar-reservas-pendientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'run' }) })
      const data = await resp.json()
      setResultadoActivacion(data)
    } catch (e:any) {
      setResultadoActivacion({ success:false, error:'Error ejecutando activación', details: e?.message, timestamp: new Date().toISOString() })
    }
    setCargando(false)
  }

  const cargarEstadisticas = async () => {
    try {
      // Aquí podrías hacer una llamada a un endpoint que devuelva estadísticas
      // Por ahora simulamos los datos
      setEstadisticas({
        totalNotificacionesEnviadas: 0,
        notificacionesHoy: 0,
        ultimaEjecucion: null,
        configuracionEmail: false
      })
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sistema de Notificaciones</h2>
          <p className="text-muted-foreground">
            Monitoreo y configuración del sistema de notificaciones automáticas
          </p>
        </div>
        <Button onClick={cargarEstadisticas} variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Notificaciones Enviadas
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estadisticas?.totalNotificacionesEnviadas || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total acumulado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Notificaciones Hoy
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estadisticas?.notificacionesHoy || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              En las últimas 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Última Ejecución
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estadisticas?.ultimaEjecucion ? 'Activo' : 'Nunca'}
            </div>
            <p className="text-xs text-muted-foreground">
              {estadisticas?.ultimaEjecucion || 'Sin ejecuciones'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Estado Email
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={estadisticas?.configuracionEmail ? 'default' : 'destructive'}>
                {estadisticas?.configuracionEmail ? 'OK' : 'Error'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Configuración SMTP
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Probar Configuración</CardTitle>
            <CardDescription>
              Verifica que la configuración de email esté correcta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={probarConfiguracion} 
              disabled={cargando}
              className="w-full"
            >
              {cargando ? 'Probando...' : 'Verificar Config'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enviar Email de Prueba</CardTitle>
            <CardDescription>
              Envía un email de prueba para verificar el funcionamiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={enviarEmailPrueba} 
              disabled={cargando}
              variant="outline"
              className="w-full"
            >
              {cargando ? 'Enviando...' : 'Enviar Prueba'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ejecutar Manualmente</CardTitle>
            <CardDescription>
              Ejecuta la verificación de reservas vencidas ahora
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={ejecutarManualmente} 
              disabled={cargando}
              variant="secondary"
              className="w-full"
            >
              {cargando ? 'Ejecutando...' : 'Ejecutar Ahora'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activar Reservas Pendientes</CardTitle>
            <CardDescription>
              Pasa a 'activa' las reservas cuyo inicio ya llegó
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={activarPendientesManual}
              disabled={cargando}
              variant="outline"
              className="w-full"
            >
              {cargando ? 'Activando...' : 'Activar Pendientes'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resultados */}
      {resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {resultado.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Resultado de la Operación
            </CardTitle>
            <CardDescription>
              Ejecutado el {new Date(resultado.timestamp).toLocaleString('es-ES')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className={resultado.success ? 'text-green-600' : 'text-red-600'}>
                {resultado.message}
              </p>
              
              {resultado.data && (
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div>Reservas encontradas: {resultado.data.reservasEncontradas}</div>
                  <div>Notificaciones enviadas: {resultado.data.reservasNotificadas}</div>
                  {resultado.data.erroresEnvio > 0 && (
                    <div className="text-red-600">
                      Errores de envío: {resultado.data.erroresEnvio}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {resultadoActivacion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {resultadoActivacion.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Resultado Activación Pendientes
            </CardTitle>
            <CardDescription>
              Ejecutado el {new Date(resultadoActivacion.timestamp || Date.now()).toLocaleString('es-ES')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className={resultadoActivacion.success ? 'text-green-600' : 'text-red-600'}>
                {resultadoActivacion.success ? `Reservas activadas: ${resultadoActivacion.activadas || 0}` : (resultadoActivacion.error || 'Error')}
              </p>
              {resultadoActivacion.ids && (
                <div className="text-muted-foreground text-xs">
                  IDs: {resultadoActivacion.ids.join(', ')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instrucciones de configuración */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración Requerida</CardTitle>
          <CardDescription>
            Variables de entorno necesarias para el funcionamiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><code>EMAIL_USER</code>: Email corporativo (@fulcrum.es)</div>
            <div><code>EMAIL_PASSWORD</code>: Contraseña de aplicación de Office 365</div>
            <div><code>CRON_SECRET_TOKEN</code>: Token de seguridad para cron jobs</div>
          </div>
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Nota:</strong> Ejecuta el script <code>add-notification-fields.sql</code> 
              en Supabase para agregar los campos necesarios a la base de datos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
