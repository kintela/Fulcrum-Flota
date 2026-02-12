# Sistema de Notificaciones Automáticas - Fulcrum Flota

## Descripción

Sistema automatizado para notificar a los usuarios cuando una reserva vence y para avisar al inicio de la reserva.

## Características

- ✅ **Detección automática** de reservas vencidas
- ✅ **Notificaciones por email** usando Office 365 SMTP
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
# Email corporativo Office 365
EMAIL_USER=tu_email@fulcrum.es
EMAIL_PASSWORD=tu_contraseña_de_aplicacion

# Token de seguridad para cron jobs
CRON_SECRET_TOKEN=genera_un_token_muy_seguro_aqui
```

### 2. Configuración de Office 365

1. **Generar contraseña de aplicación:**
   - Ve a https://account.microsoft.com/security
   - Selecciona "Opciones de seguridad adicionales"
   - En "Contraseñas de aplicación", crea una nueva
   - Usa esta contraseña en `EMAIL_PASSWORD`

2. **Configuración SMTP:**
   - Servidor: `smtp.office365.com`
   - Puerto: `587`
   - Seguridad: `STARTTLS`
   - Autenticación: `LOGIN`

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
npm install nodemailer @types/nodemailer node-cron @types/node-cron
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
4. Consulta la documentación de Office 365 SMTP si es necesario
