# Spec 005 — Reservas temporales de vehículos
## Contexto y objetivo
Esta especificación retrospectiva describe la reserva de vehículos durante intervalos de tiempo, la consulta personal y administrativa, y las transiciones disponibles de la reserva.
## Usuarios / actores
- Empleado autenticado que crea y gestiona sus reservas.
- Administrador que consulta y gestiona reservas de empleados.
- Usuario baneado, al que el flujo de creación deniega nuevas reservas.
## Historias de usuario
- H1: Como empleado quiero consultar disponibilidad y reservar un vehículo para un intervalo.
- H2: Como titular quiero consultar, ampliar, cancelar o completar mis reservas y registrar observaciones/feedback.
- H3: Como administrador quiero revisar y gestionar reservas para mantener el estado operativo de la flota.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO un empleado solicita una reserva, EL SISTEMA verifica sesión, empleado asociado, estado baneado, vehículo existente/no eliminado/no donante y fechas válidas antes de insertarla.
- RF-2: CUANDO se consulta disponibilidad, EL SISTEMA informa si las reservas activas o pendientes del vehículo se solapan con el intervalo solicitado; los intervalos contiguos se consideran disponibles en la comprobación de aplicación.
- RF-3: CUANDO la fecha de inicio es futura, EL SISTEMA crea la reserva con estado pendiente; de otro modo la crea activa.
- RF-4: CUANDO el titular consulta sus reservas, EL SISTEMA devuelve sus registros con información del vehículo, incluyendo una búsqueda alternativa por email si la consulta por ids no devuelve resultados.
- RF-5: CUANDO el titular cancela una reserva pendiente o activa, EL SISTEMA cambia su estado a cancelada y conserva observación, queja y limpieza válidas enviadas.
- RF-6: CUANDO el titular completa una reserva activa o vencida, EL SISTEMA cambia su estado a completada y conserva el feedback enviado.
- RF-7: CUANDO se amplía/modifica una reserva pendiente o activa, EL SISTEMA valida fechas y comprueba conflictos con otras reservas según las reglas implementadas.
- RF-8: CUANDO un administrador consulta reservas, EL SISTEMA lista reservas temporales y proporciona acciones para cancelar reservas no finalizadas y completar reservas activas/vencidas sujetas a las condiciones vigentes.
- RF-9: CUANDO una reserva pendiente alcanza su hora de inicio y la tarea de activación la procesa, EL SISTEMA intenta cambiarla a activa y, si hay datos de empleado/coche y no consta enviado, intenta enviar email de inicio.
## Requisitos no funcionales
- Fechas se intercambian/guardan como valores de fecha-hora; no se encontró un requisito formal sobre zona horaria de negocio.
- No hay SLA ni umbrales de rendimiento documentados.
## Casos límite
- Usuario no autenticado, sin empleado asociado o baneado.
- Matrícula inexistente, coche eliminado o donante.
- Inicio anterior al momento actual, fin no posterior al inicio o conflicto temporal.
- Reserva no propia, reserva ya finalizada o estado no admisible para una transición.
- El feedback es opcional; limpieza acepta `bien`, `regular` o `mal` en las acciones revisadas.
## Fuera de alcance
- Asignaciones permanentes sin intervalo temporal (004).
- Reglas y canales completos de notificaciones (012).
- Análisis de métricas históricas (015).
## Criterios de finalización
- Verificar creación, consulta, disponibilidad, modificación, cancelación y finalización en los estados descritos.
- Verificar denegaciones por usuario/vehículo/fecha y flujo administrativo actual.
- Contrastar estados y restricciones con el esquema desplegado antes de fijar como contrato reglas observadas solo en SQL inicial.
## Dudas abiertas
- [NECESITA ACLARACIÓN] El SQL inicial contempla tres estados, mientras la aplicación usa además `pendiente` y `vencida`; ¿cuál es el esquema y conjunto de estados vigente en producción?
- [NECESITA ACLARACIÓN] El trigger de solapamiento del SQL filtra `activa`, mientras la lógica de aplicación considera otros estados; ¿qué mecanismo determina la disponibilidad efectiva?
- [NECESITA ACLARACIÓN] ¿Qué acciones administrativas se muestran realmente y qué rol puede ejecutarlas en cada entorno?
- [NECESITA ACLARACIÓN] ¿La reserva puede cambiar fecha de inicio desde la interfaz o solo fecha final en el flujo normal?
- [NECESITA ACLARACIÓN] ¿La transición a `vencida` se realiza exclusivamente por cron? Hay funciones/versiones de notificación diferentes.
