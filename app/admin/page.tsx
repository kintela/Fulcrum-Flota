'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import NotificacionesAdmin from '@/components/notificaciones-admin'
import { Bell, Settings, Database, Mail } from 'lucide-react'

export default function AdminPage() {
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
                    <h3 className="text-lg font-semibold">Office 365 SMTP</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div>Servidor: smtp.office365.com</div>
                      <div>Puerto: 587</div>
                      <div>Seguridad: STARTTLS</div>
                      <div>Dominio: fulcrum.es</div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold">Variables de Entorno</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div><code>EMAIL_USER</code>: Usuario de email corporativo</div>
                      <div><code>EMAIL_PASSWORD</code>: Contraseña de aplicación</div>
                    </div>
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
                      <div><code>EMAIL_USER</code>: Usuario de email corporativo</div>
                      <div><code>EMAIL_PASSWORD</code>: Contraseña de aplicación Office 365</div>
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
