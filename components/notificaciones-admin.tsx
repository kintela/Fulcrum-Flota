import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { AlertCircle, CheckCircle, Clock, Mail, RefreshCw, Settings } from 'lucide-react'

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

interface ResultadoITV {
  success: boolean
  message: string
  data?: {
    itvsVencidas: number
    itvsProximas: number
    notificacionesEnviadas: number
    erroresEnvio: number
  }
  timestamp: string
}

interface ResultadoMantenimiento {
  success: boolean
  message: string
  data?: {
    mantenimientosVencidos: number
    mantenimientosProximos: number
    notificacionesEnviadas: number
    erroresEnvio: number
  }
  timestamp: string
}

interface ReservaPendienteOption {
  id: number
  matricula: string
  fechaInicio: string
  fechaFin: string
  readyOnNextCron: boolean
}

export default function NotificacionesAdmin() {
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoPrueba | null>(null)
  const [estadisticas, setEstadisticas] = useState<EstadisticasNotificaciones | null>(null)
  const [resultadoActivacion, setResultadoActivacion] = useState<any | null>(null)
  const [resultadoITV, setResultadoITV] = useState<ResultadoITV | null>(null)
  const [resultadoMantenimiento, setResultadoMantenimiento] = useState<ResultadoMantenimiento | null>(null)
  const [reservasPendientes, setReservasPendientes] = useState<ReservaPendienteOption[]>([])
  const [reservaPendienteSeleccionada, setReservaPendienteSeleccionada] = useState<string>("")
  const [reservasPendientesError, setReservasPendientesError] = useState("")
  const [simulatedReferenceTime, setSimulatedReferenceTime] = useState<string | null>(null)

  const formatoFechaReserva = (value: string) =>
    new Date(value).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const descripcionReservaSeleccionada = useMemo(() => {
    const selected = reservasPendientes.find((reserva) => String(reserva.id) === reservaPendienteSeleccionada)
    if (!selected) return null
    return `${selected.matricula} · ${formatoFechaReserva(selected.fechaInicio)} → ${formatoFechaReserva(selected.fechaFin)}`
  }, [reservasPendientes, reservaPendienteSeleccionada])

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
    if (!reservaPendienteSeleccionada) {
      setResultadoActivacion({
        success: false,
        error: 'Selecciona una reserva pendiente para probar',
        timestamp: new Date().toISOString()
      })
      return
    }

    setCargando(true)
    try {
      const resp = await fetch('/api/cron/activar-reservas-pendientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run',
          reservaId: Number(reservaPendienteSeleccionada),
          forceWindowBypass: true,
        })
      })
      const data = await resp.json()
      setResultadoActivacion(data)
      await cargarReservasPendientes()
    } catch (e:any) {
      setResultadoActivacion({ success:false, error:'Error ejecutando activación', details: e?.message, timestamp: new Date().toISOString() })
    }
    setCargando(false)
  }

  const ejecutarAlertasITV = async () => {
    setCargando(true)
    try {
      const response = await fetch('/api/cron/itv-alertas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'run' })
      })

      const data = await response.json()
      setResultadoITV(data)
    } catch (error) {
      setResultadoITV({
        success: false,
        message: 'Error ejecutando alertas ITV',
        timestamp: new Date().toISOString()
      })
    }
    setCargando(false)
  }

  const ejecutarAlertasMantenimiento = async () => {
    setCargando(true)
    try {
      const response = await fetch('/api/cron/mantenimiento-alertas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'run' })
      })

      const data = await response.json()
      setResultadoMantenimiento(data)
    } catch (error) {
      setResultadoMantenimiento({
        success: false,
        message: 'Error ejecutando alertas de mantenimiento',
        timestamp: new Date().toISOString()
      })
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

  const cargarReservasPendientes = async () => {
    try {
      setReservasPendientesError("")
      const response = await fetch("/api/admin/reservas-pendientes", { cache: "no-store" })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setReservasPendientes([])
        setReservasPendientesError(data.error || "No se pudieron cargar las reservas pendientes")
        setSimulatedReferenceTime(null)
        return
      }

      const reservas = Array.isArray(data.reservas) ? data.reservas : []
      setReservasPendientes(reservas)
      setSimulatedReferenceTime(data.simulatedReferenceTime || null)
      setReservaPendienteSeleccionada((actual) => {
        if (actual && reservas.some((reserva: ReservaPendienteOption) => String(reserva.id) === actual)) {
          return actual
        }
        return reservas[0] ? String(reservas[0].id) : ""
      })
    } catch (error) {
      setReservasPendientes([])
      setReservasPendientesError("Error cargando reservas pendientes")
      setSimulatedReferenceTime(null)
    }
  }

  useEffect(() => {
    cargarEstadisticas()
    cargarReservasPendientes()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sistema de Notificaciones</h2>
          <p className="text-muted-foreground">
            Monitoreo y configuración del sistema de notificaciones automáticas
          </p>
        </div>
        <Button
          onClick={() => {
            cargarEstadisticas()
            cargarReservasPendientes()
          }}
          variant="outline"
        >
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
            <CardTitle>Reservas Vencidas</CardTitle>
            <CardDescription>
              Ejecuta ahora la verificación de reservas vencidas
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
              Selecciona una sola reserva pendiente y fuerza todo el proceso automático solo sobre esa reserva, aunque todavía no haya entrado en ventana
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Reserva pendiente a probar</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cargarReservasPendientes}
                  disabled={cargando}
                  className="h-8 px-2"
                >
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Recargar
                </Button>
              </div>
              <Select
                value={reservaPendienteSeleccionada}
                onChange={(event) => setReservaPendienteSeleccionada(event.target.value)}
                disabled={cargando || reservasPendientes.length === 0}
              >
                <SelectValue placeholder="Selecciona una reserva pendiente" />
                <SelectContent>
                  {reservasPendientes.map((reserva) => (
                    <SelectItem key={reserva.id} value={String(reserva.id)}>
                      {`${reserva.matricula} · ${formatoFechaReserva(reserva.fechaInicio)} → ${formatoFechaReserva(reserva.fechaFin)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {descripcionReservaSeleccionada && (
                <div className="text-xs text-muted-foreground">{descripcionReservaSeleccionada}</div>
              )}
              {simulatedReferenceTime && (
                <div className="text-xs text-muted-foreground">
                  Referencia del próximo cron: {new Date(simulatedReferenceTime).toLocaleString('es-ES')}
                </div>
              )}
              {reservasPendientesError && (
                <div className="text-xs text-red-600">{reservasPendientesError}</div>
              )}
              {!reservasPendientesError && reservasPendientes.length === 0 && (
                <div className="text-xs text-muted-foreground">No hay reservas pendientes disponibles.</div>
              )}
              {reservaPendienteSeleccionada && (
                <div className="text-xs text-muted-foreground">
                  {(() => {
                    const selected = reservasPendientes.find((reserva) => String(reserva.id) === reservaPendienteSeleccionada)
                    if (!selected) return null
                    return selected.readyOnNextCron
                      ? "Esta reserva ya entraría en la próxima ventana automática."
                      : "Esta reserva todavía no entra en la próxima ventana automática, pero puedes forzarla aquí."
                  })()}
                </div>
              )}
            </div>
            <Button
              onClick={activarPendientesManual}
              disabled={cargando || !reservaPendienteSeleccionada}
              variant="outline"
              className="w-full"
            >
              {cargando ? 'Forzando...' : 'Forzar activación completa de esta reserva'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas ITV</CardTitle>
            <CardDescription>
              Ejecuta ahora las alertas de ITVs vencidas y próximas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={ejecutarAlertasITV}
              disabled={cargando}
              variant="secondary"
              className="w-full"
            >
              {cargando ? 'Ejecutando...' : 'Ejecutar ITV'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas Mantenimiento</CardTitle>
            <CardDescription>
              Ejecuta ahora las alertas de mantenimientos vencidos y próximos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={ejecutarAlertasMantenimiento}
              disabled={cargando}
              variant="secondary"
              className="w-full"
            >
              {cargando ? 'Ejecutando...' : 'Ejecutar Mantenimiento'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resultados combinados */}
      {(resultado || resultadoActivacion || resultadoITV || resultadoMantenimiento) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Resultados de Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {resultado && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Reservas Vencidas</div>
                  <div className="text-xs text-muted-foreground">
                    Ejecutado el {new Date(resultado.timestamp).toLocaleString('es-ES')}
                  </div>
                </div>
                <p className={resultado.success ? 'text-green-600' : 'text-red-600'}>{resultado.message}</p>
                {resultado.data && (
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div>Reservas encontradas: {resultado.data.reservasEncontradas}</div>
                    <div>Notificaciones enviadas: {resultado.data.reservasNotificadas}</div>
                    {resultado.data.erroresEnvio > 0 && <div className="text-red-600">Errores de envío: {resultado.data.erroresEnvio}</div>}
                    {Array.isArray(resultado.data.detalleNotificaciones) && resultado.data.detalleNotificaciones.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="font-semibold text-gray-700">Detalle:</div>
                        {resultado.data.detalleNotificaciones.map((item: any) => {
                          const canales: string[] = []
                          if (item.emailEnviado) canales.push('Email')
                          if (item.whatsappEnviado) canales.push('WhatsApp')
                          return (
                            <div key={item.id} className="text-xs text-gray-600">
                              • Reserva {item.id} · {item.matricula} {item.marca} {item.modelo} · {item.empleadoNombre} ({item.empleadoEmail}){canales.length ? ` · Enviado: ${canales.join(' y ')}` : ''}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {resultadoActivacion && (
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Activación de Reservas Pendientes</div>
                  <div className="text-xs text-muted-foreground">
                    Ejecutado el {new Date(resultadoActivacion.timestamp || Date.now()).toLocaleString('es-ES')}
                  </div>
                </div>
                {resultadoActivacion.simulatedReferenceTime && (
                  <div className="text-muted-foreground text-xs">
                    Simulado como cron de las {new Date(resultadoActivacion.simulatedReferenceTime).toLocaleString('es-ES')}
                  </div>
                )}
                {resultadoActivacion.targetReservaId && (
                  <div className="text-muted-foreground text-xs">
                    Reserva objetivo: #{resultadoActivacion.targetReservaId}
                  </div>
                )}
                {resultadoActivacion.forceWindowBypass && (
                  <div className="text-muted-foreground text-xs">
                    Ejecución forzada ignorando la ventana automática de activación
                  </div>
                )}
                <p className={resultadoActivacion.success ? 'text-green-600' : 'text-red-600'}>
                  {resultadoActivacion.success ? `Reservas activadas: ${resultadoActivacion.activadas || 0}` : (resultadoActivacion.error || 'Error')}
                </p>
                {resultadoActivacion.ids && (
                  <div className="text-muted-foreground text-xs">IDs: {resultadoActivacion.ids.join(', ')}</div>
                )}
                {(resultadoActivacion.emailsEnviados !== undefined || resultadoActivacion.whatsappsEnviados !== undefined || resultadoActivacion.erroresAcceso !== undefined) && (
                  <div className="text-muted-foreground text-xs flex gap-4 mt-1">
                    {resultadoActivacion.emailsEnviados !== undefined && <span>Emails: {resultadoActivacion.emailsEnviados}</span>}
                    {resultadoActivacion.whatsappsEnviados !== undefined && <span>WhatsApps: {resultadoActivacion.whatsappsEnviados}</span>}
                    {resultadoActivacion.erroresAcceso !== undefined && <span>Errores acceso: {resultadoActivacion.erroresAcceso}</span>}
                  </div>
                )}
                {Array.isArray(resultadoActivacion.detalles) && resultadoActivacion.detalles.length > 0 && (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {resultadoActivacion.detalles.map((detalle: string, index: number) => (
                      <div key={`${detalle}-${index}`}>• {detalle}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {resultadoITV && (
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Alertas ITV</div>
                  <div className="text-xs text-muted-foreground">
                    Ejecutado el {new Date(resultadoITV.timestamp).toLocaleString('es-ES')}
                  </div>
                </div>
                <p className={resultadoITV.success ? 'text-green-600' : 'text-red-600'}>
                  {resultadoITV.message}
                </p>
                {resultadoITV.data && (
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div>ITVs vencidas: {resultadoITV.data.itvsVencidas}</div>
                    <div>ITVs próximas: {resultadoITV.data.itvsProximas}</div>
                    <div>Notificaciones enviadas: {resultadoITV.data.notificacionesEnviadas}</div>
                    {resultadoITV.data.erroresEnvio > 0 && (
                      <div className="text-red-600">Errores de envío: {resultadoITV.data.erroresEnvio}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {resultadoMantenimiento && (
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Alertas Mantenimiento</div>
                  <div className="text-xs text-muted-foreground">
                    Ejecutado el {new Date(resultadoMantenimiento.timestamp).toLocaleString('es-ES')}
                  </div>
                </div>
                <p className={resultadoMantenimiento.success ? 'text-green-600' : 'text-red-600'}>
                  {resultadoMantenimiento.message}
                </p>
                {resultadoMantenimiento.data && (
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div>Mantenimientos vencidos: {resultadoMantenimiento.data.mantenimientosVencidos}</div>
                    <div>Mantenimientos próximos: {resultadoMantenimiento.data.mantenimientosProximos}</div>
                    <div>Notificaciones enviadas: {resultadoMantenimiento.data.notificacionesEnviadas}</div>
                    {resultadoMantenimiento.data.erroresEnvio > 0 && (
                      <div className="text-red-600">Errores de envío: {resultadoMantenimiento.data.erroresEnvio}</div>
                    )}
                  </div>
                )}
              </div>
            )}
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
