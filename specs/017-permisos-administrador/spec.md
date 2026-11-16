# Spec 017 — Protección de páginas y operaciones de administración
## Contexto y objetivo
La aplicación distingue dos roles, `usuario` y `administrador`, pero hoy la restricción a administradores se aplica casi solo en la interfaz: el menú superior de gestión no se muestra a los usuarios. Cualquier usuario autenticado que escriba la URL puede entrar en el catálogo, el alta y la edición de coches, en la gestión de empleados y reservas, en el panel de notificaciones y en la página de diagnóstico. Además, muchas operaciones de servidor (seguros, Solred, ViaT, ITV, mantenimientos, alquileres, empleados, notificaciones) no comprueban ni la sesión ni el rol, así que pueden invocarse sin pasar por las páginas. Solo `/analisis` y `/tarjetas` redirigen hoy a quien no es administrador.

Esta funcionalidad hace que el servidor imponga el rol: las páginas y operaciones de administración quedan reservadas a administradores; un usuario solo puede consultar, sin modificar, la ficha de los coches con los que está relacionado; y las operaciones que usan hoy las pantallas de usuario siguen funcionando.

## Usuarios / actores
- Administrador (empleado con rol `administrador`): mantiene el acceso completo actual.
- Usuario (empleado con rol `usuario`): usa su dashboard, sus reservas, la ubicación de sus coches y la ficha de sus coches en modo consulta.
- Visitante sin sesión: sigue redirigido al inicio de sesión por el middleware actual.
- Procesos programados (cron de Vercel): ejecutan notificaciones y activación de reservas sin sesión de usuario.

## Historias de usuario
- H1: Como responsable de la flota quiero que solo los administradores puedan entrar en las páginas de gestión, aunque se escriba la URL, para proteger los datos de vehículos, empleados y reservas.
- H2: Como responsable de la flota quiero que las operaciones de gestión se rechacen en el servidor si no las pide un administrador, para que no se puedan invocar directamente.
- H3: Como usuario quiero seguir viendo la ficha de mis coches (incluidos el seguro y el PIN de Solred) desde las alertas de mi dashboard, para tener a mano la información que necesito.
- H4: Como usuario que entra en una página que no le corresponde quiero ver un aviso claro, para entender por qué vuelvo a mi dashboard.

## Requisitos funcionales (criterios de aceptación en EARS)

### Páginas de administración
- RF-1: EL SISTEMA considera páginas de administración: el catálogo de coches (`/coches`), el alta (`/coches/nuevo`) y la edición de coches (`/coches/editar/<matrícula>`); todas las páginas de empleados (`/empleados` y sus subpáginas); la gestión de reservas (`/reservas`); el panel de administración (`/admin`); la página de diagnóstico (`/diagnostico`); el análisis (`/analisis`) y las tarjetas (`/tarjetas`).
- RF-2: CUANDO un usuario autenticado sin rol de administrador solicita una página de administración, EL SISTEMA no muestra su contenido ni consulta sus datos, lo redirige al dashboard (`/`) y muestra allí el aviso "No tienes permiso para acceder a esa página".
- RF-3: CUANDO un administrador solicita una página de administración, EL SISTEMA la muestra como hasta ahora.
- RF-4: EL SISTEMA determina el rol en el servidor en cada solicitud, a partir del rol vigente del empleado, sin depender de lo que muestre la interfaz ni de datos enviados por el cliente.
- RF-5: EL SISTEMA muestra el aviso de RF-2 una sola vez por redirección; al recargar el dashboard o navegar después, el aviso no vuelve a aparecer.

### Ficha de coche
- RF-6: CUANDO un administrador solicita la ficha de un coche (`/coches/detalle/<matrícula>`), EL SISTEMA la muestra como hasta ahora, con todas sus acciones.
- RF-7: CUANDO un usuario sin rol de administrador solicita la ficha de un coche con el que está relacionado, EL SISTEMA muestra todas sus secciones (datos, ubicación, fotos, ITV y sus documentos, mantenimientos, seguro, Solred con PIN, ViaT y alquiler) en modo solo lectura, sin controles para añadir, editar, borrar, subir, restaurar ni dar de baja.
- RF-8: EL SISTEMA considera que un usuario está relacionado con un coche cuando se cumple al menos una de estas condiciones: (a) el coche le está asignado de forma permanente, es decir, su campo "asignado a" identifica a ese empleado; (b) existe una reserva temporal del coche a ese empleado en estado activa.
- RF-9: SI un usuario sin rol de administrador solicita la ficha de un coche con el que no está relacionado, o de una matrícula que no existe, ENTONCES EL SISTEMA aplica RF-2 (redirige a `/` con el aviso), sin revelar si la matrícula existe.
- RF-10: EL SISTEMA mantiene los enlaces a la ficha que hay en las alertas del dashboard de usuario; para sus coches siguen llevando a la ficha en modo solo lectura.

### Operaciones de servidor
- RF-11: CUANDO se invoca una operación de servidor de gestión (crear, modificar, borrar, asignar, desasignar, dar de baja, restaurar, subir o eliminar archivos, enviar o configurar notificaciones, y consultar datos de gestión) sin sesión, EL SISTEMA la rechaza con un resultado de error, sin consultar ni modificar datos.
- RF-12: CUANDO un usuario sin rol de administrador invoca una operación de servidor de gestión, EL SISTEMA la rechaza con un resultado de error de autorización, sin consultar ni modificar datos.
- RF-13: CUANDO un usuario sin rol de administrador invoca una operación de consulta de datos de un coche con el que está relacionado (RF-8) y que la ficha necesita para mostrarse (RF-7), EL SISTEMA la permite; SI el coche no está relacionado con él, ENTONCES la rechaza como en RF-12.
- RF-14: EL SISTEMA mantiene disponibles para usuarios no administradores, con las reglas que tienen hoy, las operaciones que usan sus pantallas actuales: crear, consultar, cancelar y finalizar sus reservas temporales; liberar el coche; consultar y actualizar la ubicación de sus coches o ubicarlos en la sede; y consultar la ficha resumida de un coche desde "Mis reservas".
- RF-15: EL SISTEMA conserva para cada operación su forma de respuesta actual (por ejemplo, `{ success: false, error }`) al rechazarla, de modo que las pantallas existentes muestren el error sin romperse.
- RF-16: SI una operación se ejecuta desde un proceso programado autenticado con su mecanismo actual (cron), ENTONCES EL SISTEMA no le exige sesión de usuario y la ejecuta como hasta ahora.

## Requisitos no funcionales
- Seguridad: la autorización se comprueba en el servidor (páginas y operaciones); ocultar elementos en la interfaz no basta. No se confía en el rol enviado por el cliente.
- Compatibilidad: para los administradores la aplicación se comporta exactamente igual que antes.
- Idioma: el aviso y los mensajes de error, en español.
- Sin cambios de proveedor de identidad, de los roles existentes ni del esquema de base de datos.

## Casos límite
- Empleado cuyo rol cambia de administrador a usuario con la sesión abierta: en la siguiente solicitud se aplica el rol vigente (RF-4).
- Sesión válida de un email que no existe en `empleados` o sin rol reconocible: se trata como usuario no administrador.
- Alias de rol legado `admin`: se trata como administrador, como hoy.
- Coche con "asignado a" en texto libre que no corresponde a un id de empleado: no cuenta como relación por (a); puede contar por (b).
- Reserva que deja de estar activa (finaliza o se cancela) mientras el usuario tiene la ficha abierta: la siguiente solicitud ya se deniega si no hay otra relación.
- Coche dado de baja: un usuario relacionado puede ver su ficha en solo lectura; las acciones de baja y restauración siguen siendo solo de administrador.
- Matrícula con distinto formato (mayúsculas, espacios): la comprobación de relación usa el mismo criterio de matrícula que la ficha.
- Varias pestañas: el aviso aparece solo en la pestaña redirigida.

## Fuera de alcance
- Endpoints `/api` (incluidos `/api/debug`, `/api/public`, `/api/test` y `/api/diagnostico`) y excepciones del middleware: irán en una spec aparte.
- Endurecer las reglas de las operaciones de usuario de RF-14 (por ejemplo, qué coches puede ubicar o liberar un usuario): se mantienen como hoy.
- Cambios en el menú superior, en el dashboard (salvo mostrar el aviso) o en el listado de vencimientos (spec 016, que ya comprueba el rol).
- Políticas RLS de Supabase y cambios de esquema.
- Nuevos roles o permisos más finos que usuario/administrador.

## Criterios de finalización
- Pruebas automatizadas en verde: para cada página de RF-1, redirección de un usuario no administrador y acceso de un administrador; reglas de relación de RF-8 (asignado de forma permanente, reserva activa, reserva no activa, ninguna); rechazo sin sesión y sin rol de las operaciones de gestión (RF-11, RF-12); consultas de ficha permitidas solo para coches relacionados (RF-13); operaciones de usuario de RF-14 sin cambios; operaciones de cron sin sesión (RF-16).
- Prueba manual con un usuario no administrador: URL directas a cada página de administración (redirección con aviso), ficha de un coche propio (solo lectura) y de uno ajeno (redirección), reservar, cancelar, ubicar y liberar como hasta ahora.
- Prueba manual con un administrador: todas las páginas y acciones funcionan igual que antes.
- `npm run lint` y `npx tsc --noEmit` sin errores nuevos; `npm run build` compila.

## Dudas abiertas
Ninguna. Decisiones del responsable del 2026-11-16:
- Alcance: páginas y operaciones de servidor; `/api` en otra spec.
- Ficha de coche para usuarios: solo sus coches, en solo lectura, con todas las secciones.
- "Sus coches": asignado a él (asignación permanente) o con reserva activa.
- Corrección del 2026-11-16, aprobada por el responsable: en RF-8 se unificaron "asignado a" y "asignación permanente", que en los datos son lo mismo (campo `asignadoa` del coche; ver spec 004). El comportamiento no cambia.
- Denegación: redirigir a `/` con aviso, también en `/analisis` y `/tarjetas`.
- Páginas de administrador: `/coches` (catálogo, alta y edición), `/empleados/*`, `/reservas`, `/admin` y `/diagnostico`, además de `/analisis` y `/tarjetas`.
