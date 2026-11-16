# Spec 007 — Gestión de tarjetas Solred y ViaT
## Contexto y objetivo
Esta especificación retrospectiva describe la administración de tarjetas Solred y ViaT y su vinculación histórica o vigente con vehículos. Actualizada el 2026-11-16 para reflejar la spec 017 (protección por rol de páginas y operaciones de administración).
## Usuarios / actores
- Administrador: único rol que administra el inventario de tarjetas y asigna o desasigna tarjetas a vehículos (017).
- Usuario no administrador: puede consultar la tarjeta asignada y el historial de los coches con los que está relacionado (017).
- Vehículo asociado a una asignación.
## Historias de usuario
- H1: Como administrador quiero consultar y mantener tarjetas para conocer su estado y caducidad.
- H2: Como operador quiero asignar o desasignar una tarjeta a un vehículo para reflejar el recurso actualmente asociado.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO un administrador consulta tarjetas Solred o ViaT, EL SISTEMA muestra los registros y, cuando puede resolverla, la matrícula asociada.
- RF-2: CUANDO un administrador crea o actualiza una tarjeta, EL SISTEMA valida identificador, caducidad y, para Solred, PIN según las validaciones implementadas.
- RF-3: CUANDO se asigna una tarjeta activa a un vehículo, EL SISTEMA comprueba que exista y registra la asignación con la fecha vigente.
- RF-4: CUANDO se cambia o desasigna una tarjeta, EL SISTEMA cierra o marca inactiva la asignación anterior según el flujo de ese tipo de tarjeta.
- RF-5: SI una tarjeta ya está asignada a otro vehículo o tiene una asignación vigente, ENTONCES EL SISTEMA devuelve el error correspondiente o impide eliminarla.
- RF-6: CUANDO se consulta el vehículo, EL SISTEMA puede mostrar las tarjetas actualmente asociadas y sus datos relevantes; a un usuario no administrador solo para coches con los que está relacionado (017).
- RF-7: SI quien invoca la creación, edición, eliminación, asignación o desasignación de tarjetas, o el listado completo de tarjetas, no es administrador, ENTONCES EL SISTEMA rechaza la operación (017).
## Requisitos no funcionales
- No se identificaron objetivos cuantitativos ni requisitos externos de procesamiento de transacciones.
## Casos límite
- Número/identificador duplicado, tarjeta inactiva, PIN o fecha inválidos.
- Asignación repetida de la misma tarjeta a la misma matrícula puede tratarse como operación sin cambio o actualizar observaciones (según tipo).
- Eliminación denegada ante asignación vigente o referencia histórica indicada por el error de base de datos.
## Fuera de alcance
- Gestión general de vehículos (003).
- Generación/envío de alertas por caducidad (012/014).
- Procesamiento de consumos o transacciones financieras: no se encontró evidencia.
## Criterios de finalización
- Verificar operaciones CRUD administrativas y asignación/desasignación para ambos tipos de tarjeta, sin equiparar sus reglas donde difieren.
- Verificar los casos de duplicidad, vigencia y referencias según comportamiento observable actual.
## Dudas abiertas
- [NECESITA ACLARACIÓN] Existen acciones antiguas y acciones `admin` para Solred con validaciones distintas; ¿cuáles son los puntos de entrada vigentes?
- [NECESITA ACLARACIÓN] ¿Cuál es la fuente autoritativa para decidir una asignación activa cuando `activa` y `fecha_desasignacion` no coinciden?
- [NECESITA ACLARACIÓN] ¿Qué registro debe considerarse vigente en el historial si hay más de una asignación activa?
