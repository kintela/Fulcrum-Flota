# Sistema de Notificaciones Automáticas - Fulcrum Flota

## Descripción

Sistema automatizado para notificar a los usuarios cuando una reserva vence y para avisar al inicio de la reserva.

## Características

- ✅ **Detección automática** de reservas vencidas
- ✅ **Notificaciones por email** usando Microsoft Graph
- ✅ **Sin cambio automático de estado** (solo notificación)
- ✅ **Plantillas HTML profesionales** para los emails
- ✅ **Programación automática** con cron jobs
- ✅ **Panel de administración** para monitoreo y pruebas
- ✅ **Control de duplicados** - no envía múltiples notificaciones
- ✅ **Manejo robusto de errores** y logging

## Configuración Inicial

### 1. Variables de Entorno

Copia `.env.example` a `.env.local` y configura las siguientes variables:

```bash
# Aplicación de Entra ID para Microsoft Graph
GRAPH_TENANT_ID=identificador_del_directorio
GRAPH_CLIENT_ID=identificador_de_la_aplicacion
GRAPH_CLIENT_SECRET=secreto_de_la_aplicacion
GRAPH_FROM_EMAIL=flota@fulcrum.es

# Destinatario de la prueba automática (opcional)
EMAIL_TEST_RECIPIENT=rquintela@fulcrum.es

# Token de seguridad para cron jobs
CRON_SECRET_TOKEN=genera_un_token_muy_seguro_aqui
```

### 2. Configuración de Microsoft Graph

1. Registra una aplicación independiente para Flota en Microsoft Entra ID.
2. Crea un secreto de cliente y guarda su **valor** en `GRAPH_CLIENT_SECRET`.
3. Asigna `Application Mail.Send` únicamente sobre `flota@fulcrum.es` mediante RBAC para aplicaciones de Exchange Online. Consulta `GRAPH-EMAIL.md` para los comandos.
4. No concedas además `Mail.Send` globalmente en Entra: ambos permisos son acumulativos y el global anularía en la práctica la limitación por buzón.
5. Configura en Vercel las cuatro variables `GRAPH_*` para Production y vuelve a desplegar.

La aplicación envía mediante `POST /users/flota@fulcrum.es/sendMail`. No utiliza la cuenta ni la contraseña personal de ningún empleado y guarda la copia en los elementos enviados del buzón de Flota.

### 3. Base de Datos

Ejecuta el siguiente script SQL en tu panel de Supabase:

```sql
-- Agregar campos para el sistema de notificaciones
ALTER TABLE reservas 
ADD COLUMN IF NOT EXISTS notificacion_inicio_reserva_enviada BOOLEAN DEFAULT FALSE;

ALTER TABLE reservas 
ADD COLUMN IF NOT EXISTS fecha_notificacion_inicio_reserva TIMESTAMP WITH TIME ZONE;

ALTER TABLE reservas 
ADD COLUMN IF NOT EXISTS notificacion_reserva_vencida_enviada BOOLEAN DEFAULT FALSE;

ALTER TABLE reservas 
ADD COLUMN IF NOT EXISTS fecha_notificacion_reserva_vencida TIMESTAMP WITH TIME ZONE;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_reservas_notificacion 
ON reservas(notificacion_reserva_vencida_enviada, fecha_fin);

CREATE INDEX IF NOT EXISTS idx_reservas_fecha_notificacion_reserva_vencida 
ON reservas(fecha_notificacion_reserva_vencida);

CREATE INDEX IF NOT EXISTS idx_reservas_fecha_notificacion_inicio 
ON reservas(fecha_notificacion_inicio_reserva);
```

### 4. Instalación de Dependencias

```bash
npm install node-cron @types/node-cron
```

## Uso

### Panel de Administración

Accede a `/admin` para:

- ✅ **Probar configuración** de email
- ✅ **Ejecutar verificaciones** manualmente
- ✅ **Ver estadísticas** del sistema
- ✅ **Monitorear** el estado general

### API Endpoints

#### GET `/api/cron/notificaciones`
Endpoint para cron jobs automáticos (requiere autenticación)

**Headers requeridos:**
```
Authorization: Bearer tu_cron_secret_token
```

#### POST `/api/cron/notificaciones`
Endpoint para ejecución manual

**Acciones disponibles:**
```json
{ "action": "test" }    // Probar configuración
{ "action": "run" }     // Ejecutar verificación
```

## Programación Automática

### Desarrollo Local

El sistema incluye un scheduler que se ejecuta automáticamente:

```typescript
// En tu servidor de desarrollo
import { iniciarCronJob } from '@/lib/scheduler'

// Inicia el sistema de notificaciones
iniciarCronJob()
```

### Horarios Programados

- **Cada hora** (minuto 0): Verificación general
- **Cada 15 minutos** (8:00-20:00, L-V): Verificación intensiva en horario laboral

### Producción

Para producción, configura un cron job externo que llame al endpoint:

```bash
# Cada hora
0 * * * * curl -H "Authorization: Bearer tu_token" https://tu-dominio.com/api/cron/notificaciones
```

## Estructura del Sistema

```
lib/
├── email.ts                 # Sistema de email con Office 365
├── scheduler.ts             # Programador de tareas automáticas

app/
├── actions/
│   └── notificaciones.ts    # Lógica de verificación de reservas
├── api/
│   └── cron/
│       └── notificaciones/
│           └── route.ts     # API endpoint para cron jobs
└── admin/
    └── page.tsx             # Panel de administración

components/
└── notificaciones-admin.tsx # Componente del panel admin

scripts/
└── add-notification-fields.sql # Script de base de datos
```

## Lógica de Funcionamiento

1. **Verificación:** El sistema busca reservas que:
   - Tengan `fecha_fin` anterior o igual a ahora
   - Estén en estado "activa"
   - No hayan sido notificadas (`notificacion_reserva_vencida_enviada = false`)

2. **Notificación y Finalización:** Para cada reserva encontrada:
   - Envía email al usuario responsable
   - **Cambia automáticamente el estado a "completada"**
   - Marca la reserva como notificada
   - Registra la fecha de notificación

3. **Email:** Incluye información detallada:
   - Matrícula del vehículo
   - Tiempo de retraso
   - **Aviso de que la reserva fue marcada como completada automáticamente**
   - Instrucciones para contactar administración si necesita extender

## Troubleshooting

### Error de autenticación SMTP
- Verifica que uses una contraseña de aplicación, no la contraseña normal
- Confirma que el email sea del dominio @fulcrum.es
- Revisa que la autenticación de dos factores esté habilitada

### Cron jobs no se ejecutan
- Verifica que `CRON_SECRET_TOKEN` esté configurado
- Confirma que el servidor esté corriendo continuamente
- Revisa los logs del sistema para errores

### Emails no se envían
- Usa el panel de administración para probar la configuración
- Verifica la conectividad SMTP en el puerto 587
- Revisa los logs de error en la consola

### Base de datos
- Ejecuta el script SQL de migración
- Verifica los permisos de la tabla `reservas_temporales`
- Confirma que los índices se hayan creado correctamente

## Logs del Sistema

El sistema genera logs detallados para facilitar el debugging:

```
🚀 Iniciando verificación programada de reservas vencidas
🔍 Encontradas 2 reservas vencidas pendientes de notificación
📧 Enviando notificación a usuario@fulcrum.es para vehículo 1234-ABC
✅ Verificación completada: 2 encontradas, 2 notificadas, 0 errores
```

## Seguridad

- **Autenticación:** Todos los endpoints requieren token de autorización
- **Validación:** Verificación de configuración antes de enviar emails
- **Rate Limiting:** Control de frecuencia para evitar spam
- **Error Handling:** Manejo robusto de errores sin exposición de datos sensibles

## Soporte

Para problemas o preguntas sobre el sistema de notificaciones:

1. Revisa los logs del sistema
2. Usa el panel de administración para diagnosticar
3. Verifica la configuración de variables de entorno
4. Consulta `GRAPH-EMAIL.md` y los registros de Vercel si el envío mediante Graph falla
