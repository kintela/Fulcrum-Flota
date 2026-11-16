# Spec 012 — Notificaciones operativas
## Contexto y objetivo
Esta especificación retrospectiva recoge los envíos de notificaciones por email y WhatsApp asociados a reservas y alertas de operación que están presentes en la aplicación. No unifica implementaciones divergentes ni presupone entrega garantizada. Actualizada el 2026-11-16 para reflejar la spec 018 (protección de los endpoints `/api`).
## Usuarios / actores
- Empleado que recibe comunicaciones relacionadas con reservas.
- Administrador que recibe alertas operativas.
- Servicios de Microsoft Graph y Twilio usados por los flujos observados.
- Tareas programadas/manuales que inician algunos envíos.
## Historias de usuario
- H1: Como empleado quiero recibir comunicaciones sobre cambios relevantes de mis reservas.
- H2: Como administrador quiero recibir alertas sobre elementos operativos vencidos o próximos según los procesos vigentes.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO los flujos de reserva invocan una notificación y están configurados sus destinatarios y proveedor, EL SISTEMA intenta enviar los mensajes implementados por email y/o WhatsApp.
- RF-2: CUANDO una reserva pendiente alcanza el inicio y la tarea correspondiente procesa el registro, EL SISTEMA intenta notificar el inicio según la versión de proceso ejecutada.
- RF-3: CUANDO los procesos de ITV o mantenimiento detectan alertas elegibles y hay destinatarios administradores con email, EL SISTEMA intenta enviar un resumen por email.
- RF-4: SI no hay destinatarios o falla un proveedor, ENTONCES EL SISTEMA devuelve/registra el resultado de error según el flujo, sin afirmar que el mensaje fue recibido por el usuario.
- RF-5: CUANDO Vercel Cron invoca un endpoint `/api/cron/*` (GET) con `Authorization: Bearer <CRON_SECRET>`, EL SISTEMA ejecuta el proceso; sin ese secreto responde 401. La ejecución manual (POST) desde `/admin` solo la puede lanzar un administrador (018).
## Requisitos no funcionales
- Las integraciones requieren configuración externa por nombre de variable; sus valores son secretos y no forman parte de esta especificación.
- No se encontró garantía de entrega, reintentos uniforme ni objetivo de tiempo de envío.
## Casos límite
- Configuración de proveedor incompleta, destinatarios sin email/teléfono y error de proveedor.
- Múltiples implementaciones/versiones de envío de reservas: la versión `notificaciones-v2`, sin consumidores, se eliminó en la 018.
- Variable `CRON_SECRET` no configurada en Vercel: los procesos programados responden 401 y no se ejecutan.
## Fuera de alcance
- Contenido y datos maestros de cada dominio que origina la alerta (005, 008, 009).
- Gestión de preferencias de notificación o centro de notificaciones, no verificados.
- Garantía de entrega final en buzón o dispositivo.
## Criterios de finalización
- Identificar las rutas, tareas y versiones consumidas en el despliegue antes de establecer un contrato único.
- Verificar destinatarios, contenido, autenticación, idempotencia y manejo de fallos de cada proceso vigente.
- No considerar el éxito de la llamada al proveedor prueba de recepción del mensaje.
## Dudas abiertas
- [NECESITA ACLARACIÓN] ¿Qué procesos de notificación están activos en producción y cuáles son legados? (Las rutas manuales de `/api/public`, `/api/debug` y `/api/test` y la versión `notificaciones-v2` se eliminaron en la 018.)
- [NECESITA ACLARACIÓN] ¿Qué estrategia de idempotencia/reintentos se espera para no duplicar comunicaciones?
- [NECESITA ACLARACIÓN] ¿Qué destinatarios, canales y mensajes son requisitos estables frente a opciones de implementación?
