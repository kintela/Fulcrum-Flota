# Spec 009 — Mantenimiento de vehículos
## Contexto y objetivo
Esta especificación retrospectiva describe el historial de mantenimientos y la información de fecha y kilometraje recomendados para el siguiente mantenimiento. Actualizada el 2026-11-16 para reflejar la spec 017 (protección por rol de páginas y operaciones de administración).
## Usuarios / actores
- Administrador: mantiene los registros de mantenimiento (017).
- Usuario no administrador: consulta en solo lectura los mantenimientos de los coches con los que está relacionado (017).
- Administrador destinatario de alertas de mantenimiento.
## Historias de usuario
- H1: Como usuario quiero registrar mantenimientos realizados y el siguiente recomendado para mantener el historial del vehículo.
- H2: Como administrador quiero recibir avisos sobre mantenimientos vencidos o próximos según los registros actuales.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO se consulta por matrícula, EL SISTEMA devuelve mantenimientos ordenados por fecha realizada descendente.
- RF-2: CUANDO se crea un mantenimiento, EL SISTEMA requiere matrícula, fecha realizada, fecha próxima y kilómetros próximos.
- RF-3: CUANDO se actualiza un mantenimiento, EL SISTEMA requiere fecha realizada, fecha próxima y kilómetros próximos, y actualiza los campos opcionales enviados o los limpia cuando están vacíos.
- RF-4: CUANDO se elimina un mantenimiento, EL SISTEMA intenta borrar el registro por id.
- RF-5: CUANDO se verifican alertas, EL SISTEMA selecciona el registro considerado más reciente por matrícula, omite vehículos donantes y clasifica la fecha próxima como vencida o dentro de 30 días.
- RF-6: CUANDO hay alertas y destinatarios administradores con email, EL SISTEMA intenta enviar un resumen por email y marca las alertas correspondientes cuando al menos un envío tiene éxito.
- RF-7: SI quien crea, actualiza o elimina un mantenimiento no es administrador, o quien consulta los de un coche no es administrador ni está relacionado con él, ENTONCES EL SISTEMA rechaza la operación (017).
## Requisitos no funcionales
- No se encontró objetivo cuantitativo de rendimiento ni cobertura.
- Los avisos usan email mediante la integración actual de Microsoft Graph; la entrega final no está garantizada por una aceptación del proveedor.
## Casos límite
- Falta cualquiera de los campos obligatorios de creación/edición.
- Valores numéricos opcionales vacíos se convierten en null al editar.
- Sin alertas pendientes, la función devuelve un resultado exitoso sin envío.
- Sin email de administradores no se envía el resumen según la lógica observada.
## Fuera de alcance
- Revisiones ITV (008), pólizas (010) y contratos de alquiler (011).
- Reglas de edición de vehículos o notificaciones de otros dominios.
## Criterios de finalización
- Verificar consulta y ciclo CRUD con validaciones obligatorias/opcionales observadas.
- Verificar clasificación de alertas, destinatarios y actualización de flags en un entorno de datos representativo.
- No convertir kilómetros próximos en alerta automática: el proceso inspeccionado calcula por fecha.
## Dudas abiertas
- [NECESITA ACLARACIÓN] ¿El registro más reciente por fecha de mantenimiento es siempre el que determina la alerta vigente?
- [NECESITA ACLARACIÓN] ¿El sistema debe alertar por umbral de kilómetros? No se encontró esa evaluación en el proceso inspeccionado.

