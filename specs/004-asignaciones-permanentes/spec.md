# Spec 004 — Asignaciones permanentes de vehículos
## Contexto y objetivo
Esta especificación retrospectiva registra la consulta y liberación de vehículos asignados de forma permanente a empleados, capacidad distinta de las reservas por intervalo temporal.
## Usuarios / actores
- Administrador que consulta asignaciones y puede liberar cualquier vehículo según la acción observada.
- Empleado autenticado que puede liberar su propio vehículo según la acción observada.
- Empleado relacionado con el vehículo.
## Historias de usuario
- H1: Como usuario autenticado quiero consultar los vehículos asignados para conocer su responsable.
- H2: Como empleado quiero liberar mi vehículo asignado y como administrador quiero poder liberar cualquier asignación.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO un usuario autenticado consulta asignaciones permanentes, EL SISTEMA lista vehículos con `asignadoa` informado y no marcados como donantes.
- RF-2: CUANDO un empleado libera un vehículo, EL SISTEMA verifica que ese vehículo esté asignado al empleado autenticado.
- RF-3: CUANDO un administrador libera un vehículo, EL SISTEMA permite liberar una asignación existente.
- RF-4: SI el vehículo no existe, es donante, no está asignado o el usuario no tiene permiso, ENTONCES EL SISTEMA devuelve un resultado de error.
- RF-5: CUANDO se libera correctamente, EL SISTEMA elimina el valor de asignación del vehículo.
## Requisitos no funcionales
- No se encontraron requisitos cuantitativos aplicables documentados.
## Casos límite
- Vehículo inexistente, donante o sin empleado asignado.
- Usuario no autenticado o empleado distinto del asignado.
- El campo `asignadoa` aparece en código con representación numérica o textual.
## Fuera de alcance
- Reservas temporales y su historial/estados (005).
- Alta/edición general de vehículos (003).
## Criterios de finalización
- Verificar consulta de asignaciones y liberación para administrador, propio empleado y casos denegados.
- Confirmar el efecto de la liberación sobre `coches.asignadoa`.
## Dudas abiertas
- [NECESITA ACLARACIÓN] ¿Qué flujo vigente crea o cambia una asignación permanente? Se encontró su representación en `coches.asignadoa` y listado/liberación, pero no una única vía de asignación claramente consolidada.
- [NECESITA ACLARACIÓN] ¿Sigue utilizándose `reservarCoche`, que también modifica `asignadoa`, o es un flujo legado?
- [NECESITA ACLARACIÓN] ¿La forma textual de `asignadoa` representa un comportamiento permitido o compatibilidad histórica?
