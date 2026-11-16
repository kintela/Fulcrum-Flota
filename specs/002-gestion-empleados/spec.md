# Spec 002 — Gestión del directorio de empleados
## Contexto y objetivo
Esta especificación retrospectiva describe los registros de empleados usados por la aplicación para asociar identidad, rol y operaciones de flota, y las vistas/acciones existentes para consultarlos y mantenerlos. Actualizada el 2026-11-16 para reflejar la spec 017 (protección por rol de páginas y operaciones de administración).
## Usuarios / actores
- Administrador: único rol que puede consultar el directorio y usar los formularios de alta y edición (017).
- Usuario corporativo creado por el flujo de autoaprovisionamiento (001).
## Historias de usuario
- H1: Como administrador quiero consultar empleados para identificar a las personas asociadas a la flota.
- H2: Como administrador quiero dar de alta o editar un empleado para mantener su información de contacto y rol.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO se consulta el listado, EL SISTEMA obtiene empleados ordenados por nombre.
- RF-2: CUANDO se envía el alta con nombre, apellidos y email válidos, EL SISTEMA verifica que el email no esté duplicado e intenta crear el registro.
- RF-3: SI faltan campos obligatorios, el email no tiene formato aceptado o ya existe, ENTONCES EL SISTEMA devuelve un error y no confirma el alta.
- RF-4: CUANDO se edita un empleado, EL SISTEMA valida id, campos obligatorios, formato y duplicidad del email excluyendo el registro editado.
- RF-5: CUANDO se guarda la edición, EL SISTEMA normaliza el rol a los valores reconocidos y guarda el estado baneado enviado; para rol administrador fuerza `baneado` a falso.
- RF-6: SI quien accede a las páginas de empleados o invoca sus operaciones no es administrador, ENTONCES EL SISTEMA redirige al dashboard con aviso o rechaza la operación, según la spec 017.
## Requisitos no funcionales
- La interfaz de gestión observada está en español. No se encontró una política formal de validación más allá de las comprobaciones implementadas.
## Casos límite
- Email duplicado al crear o editar.
- Id no numérico al editar/consultar.
- Al editar, si no se proporciona rol se intenta preservar el existente.
- El rol legado `admin` se normaliza como administrador en utilidades de roles.
## Fuera de alcance
- Inicio de sesión y autoaprovisionamiento (001).
- Reglas de autorización por rol: definidas en la spec 017.
- Gestión de asignaciones y reservas de vehículos (004–005).
## Criterios de finalización
- Comprobar listado/detalle, alta y edición con casos válidos e inválidos descritos.
- Verificar en la implementación actual el manejo de email duplicado y normalización de rol.
- No asumir que los controles de interfaz equivalen a autorización de servidor.
## Dudas abiertas
- [NECESITA ACLARACIÓN] ¿Qué efecto tiene `baneado` fuera de la creación de reservas?
- [NECESITA ACLARACIÓN] ¿La eliminación de empleados forma parte del comportamiento vigente? No se identificó una acción correspondiente en las rutas revisadas.
