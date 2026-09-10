'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import NotificacionesAdmin from '@/components/notificaciones-admin'
import { Bell, Settings, Database, Mail } from 'lucide-react'

export default function AdminPage() {
  const [probandoEmail, setProbandoEmail] = useState(false)
  const [resultadoEmail, setResultadoEmail] = useState<null | {
    success: boolean
    message: string
    data?: {
      from?: string
      to?: string
      subject?: string
      destinatario?: string
      messageId?: string
      accepted?: string[]
      rejected?: string[]
      response?: string
      timestamp?: string
    }
  }>(null)

  const enviarPruebaEmailEmpleado = async () => {
    setProbandoEmail(true)
    try {
      const response = await fetch('/api/cron/notificaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'send-test-auth-user' })
      })

      const data = await response.json()
      setResultadoEmail({
        success: Boolean(data.success),
        message: data.message || 'Respuesta sin mensaje',
        data: data.data,
      })
    } catch (error) {
      setResultadoEmail({
        success: false,
        message: 'Error enviando email de prueba al empleado autenticado',
      })
    } finally {
      setProbandoEmail(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
          <p className="text-muted-foreground">
            Gestión y configuración del sistema Fulcrum Flota
          </p>
        </div>
      </div>

      <Tabs defaultValue="notificaciones" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notificaciones" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Base de Datos
          </TabsTrigger>
          <TabsTrigger value="sistema" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notificaciones">
          <NotificacionesAdmin />
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Email</CardTitle>
              <CardDescription>
                Configuración del sistema de correo electrónico corporativo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Microsoft Graph</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div>Autenticación: aplicación de Entra ID</div>
                      <div>Permiso: Exchange RBAC Application Mail.Send</div>
                      <div>Buzón remitente: flota@fulcrum.es</div>
                      <div>Dominio: fulcrum.es</div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold">Variables de Entorno</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div><code>GRAPH_TENANT_ID</code>: ID del directorio de Entra</div>
                      <div><code>GRAPH_CLIENT_ID</code>: ID de la aplicación</div>
                      <div><code>GRAPH_CLIENT_SECRET</code>: Secreto de la aplicación</div>
                      <div><code>GRAPH_FROM_EMAIL</code>: Buzón remitente</div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">Prueba de envío</h3>
                        <p className="text-sm text-muted-foreground">
                          Envía un correo de prueba al email del empleado autenticado.
                        </p>
                      </div>
                      <Badge variant="outline">Graph</Badge>
                    </div>

                    <Button onClick={enviarPruebaEmailEmpleado} disabled={probandoEmail}>
                      <Mail className="mr-2 h-4 w-4" />
                      {probandoEmail ? 'Enviando prueba...' : 'Enviar prueba a mi empleado'}
                    </Button>

                    {resultadoEmail && (
                      <Alert variant={resultadoEmail.success ? 'default' : 'destructive'}>
                        <Mail className="h-4 w-4" />
                        <AlertTitle>
                          {resultadoEmail.success ? 'Correo de prueba enviado' : 'Error en la prueba'}
                        </AlertTitle>
                        <AlertDescription>
                          <div>{resultadoEmail.message}</div>
                          {resultadoEmail.data?.destinatario && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Destinatario: {resultadoEmail.data.destinatario}
                            </div>
                          )}
                          {resultadoEmail.data?.from && (
                            <div className="mt-1 text-xs text-muted-foreground break-all">
                              From: {resultadoEmail.data.from}
                            </div>
                          )}
                          {resultadoEmail.data?.to && (
                            <div className="mt-1 text-xs text-muted-foreground break-all">
                              To: {resultadoEmail.data.to}
                            </div>
                          )}
                          {resultadoEmail.data?.subject && (
                            <div className="mt-1 text-xs text-muted-foreground break-all">
                              Subject: {resultadoEmail.data.subject}
                            </div>
                          )}
                          {resultadoEmail.data?.messageId && (
                            <div className="mt-1 text-xs text-muted-foreground break-all">
                              Message-ID: {resultadoEmail.data.messageId}
                            </div>
                          )}
                          {resultadoEmail.data?.accepted && (
                            <div className="mt-1 text-xs text-muted-foreground break-all">
                              Accepted: {resultadoEmail.data.accepted.join(', ') || '[]'}
                            </div>
                          )}
                          {resultadoEmail.data?.rejected && (
                            <div className="mt-1 text-xs text-muted-foreground break-all">
                              Rejected: {resultadoEmail.data.rejected.join(', ') || '[]'}
                            </div>
                          )}
                          {resultadoEmail.data?.response && (
                            <div className="mt-1 text-xs text-muted-foreground break-all">
                              SMTP: {resultadoEmail.data.response}
                            </div>
                          )}
                          {resultadoEmail.data?.timestamp && (
                            <div className="mt-1 text-xs text-muted-foreground break-all">
                              Hora: {resultadoEmail.data.timestamp}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Base de Datos</CardTitle>
              <CardDescription>
                Scripts y configuración de Supabase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Scripts Pendientes</h3>
                  <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm">
                      <strong>add-notification-fields.sql</strong><br />
                      Agrega campos de notificación a la tabla reservas_temporales
                    </p>
                    <code className="text-xs text-blue-800 dark:text-blue-200 mt-2 block">
                      ALTER TABLE reservas_temporales ADD COLUMN notificacion_inicio_reserva_enviada BOOLEAN DEFAULT FALSE;
                      <br />
                      ALTER TABLE reservas_temporales ADD COLUMN fecha_notificacion_inicio_reserva TIMESTAMP WITH TIME ZONE;
                      <br />
                      ALTER TABLE reservas_temporales ADD COLUMN notificacion_reserva_vencida_enviada BOOLEAN DEFAULT FALSE;
                      <br />
                      ALTER TABLE reservas_temporales ADD COLUMN fecha_notificacion_reserva_vencida TIMESTAMP WITH TIME ZONE;
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sistema">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Sistema</CardTitle>
              <CardDescription>
                Configuración general y variables de entorno
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Variables de Entorno Requeridas</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="grid gap-2">
                      <div><code>SUPABASE_URL</code>: URL del proyecto Supabase</div>
                      <div><code>SUPABASE_ANON_KEY</code>: Clave anónima de Supabase</div>
                      <div><code>GRAPH_TENANT_ID</code>: ID del directorio de Entra</div>
                      <div><code>GRAPH_CLIENT_ID</code>: ID de la aplicación</div>
                      <div><code>GRAPH_CLIENT_SECRET</code>: Secreto de la aplicación</div>
                      <div><code>GRAPH_FROM_EMAIL</code>: Buzón remitente</div>
                      <div><code>CRON_SECRET_TOKEN</code>: Token de seguridad para cron jobs</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">Programación de Tareas</h3>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div>• Verificación cada hora (minuto 0)</div>
                    <div>• Verificación cada 15 minutos (8:00-20:00, L-V)</div>
                    <div>• Zona horaria: Europe/Madrid</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
