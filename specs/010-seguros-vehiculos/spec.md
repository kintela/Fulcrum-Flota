# Spec 010 — Seguros de vehículos
## Contexto y objetivo
Esta especificación retrospectiva describe los seguros asociados a vehículos, su consulta como seguro activo e historial y el mantenimiento de pólizas. Actualizada el 2026-11-16 para reflejar la spec 017 (protección por rol de páginas y operaciones de administración).
## Usuarios / actores
- Administrador: crea, actualiza y elimina pólizas (017).
- Usuario no administrador: consulta en solo lectura el seguro activo y el historial de los coches con los que está relacionado (017).
## Historias de usuario
- H1: Como usuario quiero consultar el seguro vigente y el historial para conocer la cobertura registrada del vehículo.
- H2: Como operador autorizado quiero crear, actualizar o eliminar pólizas para mantener sus datos actuales.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO se consulta el seguro activo por matrícula, EL SISTEMA devuelve el registro activo o null si no existe.
- RF-2: CUANDO se consulta el historial, EL SISTEMA devuelve los registros de la matrícula ordenados por fecha de contratación descendente.
- RF-3: CUANDO se crea o actualiza una póliza, EL SISTEMA valida el tipo entre las opciones reconocidas y requiere número de póliza, fechas de contratación/vencimiento y compañía.
- RF-4: CUANDO una póliza se guarda como activa, EL SISTEMA intenta desactivar los otros seguros activos para la matrícula.
- RF-5: CUANDO se elimina por id, EL SISTEMA borra el registro y devuelve resultado de éxito o error.
- RF-6: SI quien crea, actualiza o elimina una póliza no es administrador, o quien consulta las de un coche no es administrador ni está relacionado con él, ENTONCES EL SISTEMA rechaza la operación (017).
## Requisitos no funcionales
- No se encontraron objetivos cuantitativos de rendimiento, disponibilidad o cobertura.
## Casos límite
- No hay póliza activa: consulta devuelve null como resultado válido.
- Tipo de seguro no reconocido o falta de alguno de los campos requeridos: la operación devuelve error.
- El intento de desactivar seguros previos captura/loguea errores y el flujo continúa; resultado de consistencia requiere aclaración.
## Fuera de alcance
- Alertas de ITV/mantenimiento y contratos de alquiler.
- Políticas RLS de Supabase (la autorización de las acciones está en la spec 017).
## Criterios de finalización
- Verificar consultas, alta/edición/eliminación, validaciones y consulta sin póliza activa.
- Verificar la regla de activación con datos reales representativos y confirmar la restricción de unicidad desplegada antes de considerarla contrato.
## Dudas abiertas
- [NECESITA ACLARACIÓN] ¿Se permite más de un seguro activo por matrícula en el esquema desplegado?
- [NECESITA ACLARACIÓN] ¿Qué debe ocurrir si falla la desactivación de pólizas anteriores antes de guardar la nueva?

