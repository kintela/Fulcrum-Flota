# Spec 018 — Protección de los endpoints `/api`
## Contexto y objetivo
La spec 017 protegió por rol las páginas y las Server Actions, pero dejó fuera los endpoints `/api`. Hoy:
- 27 rutas de `/api/public`, `/api/debug` y `/api/test` no piden ni sesión, porque el middleware las excluye. Algunas cambian reservas, envían emails o WhatsApp reales o muestran configuración, y ninguna la usa la aplicación.
- Los 4 endpoints `/api/cron` aceptan la ejecución programada si el `User-Agent` contiene `vercel-cron` o llega la cabecera `x-vercel-cron`, algo que cualquiera puede falsear. Además, sus ejecuciones manuales (POST), que lanzan los botones de `/admin`, no comprueban nada en 3 de las 4 rutas.
- Los endpoints que usa la interfaz (documentos ITV, editor de ubicación y ubicación al aparcar) y `/api/diagnostico` solo piden sesión, sin rol ni relación con el coche.

Esta funcionalidad:
- elimina los endpoints de depuración y prueba que no se usan;
- autentica los crons con el mecanismo oficial de Vercel y reserva su ejecución manual a administradores;
- aplica a los endpoints de la interfaz las mismas reglas de la 017: administrador, o usuario relacionado con el coche (asignado, o con reserva activa o vencida; ver RF-18).

El acceso a las fotos en Storage queda para la spec 019.

**Ampliación aprobada el 2026-11-16, durante la validación:**
- se alinean con las mismas reglas las Server Actions de ubicación, que la 017 había dejado como estaban;
- se corrige la definición de "coche relacionado" para incluir las reservas vencidas (coche aún no devuelto);
- se elimina `app/actions/notificaciones-v2.ts`, que se quedó sin uso.

## Usuarios / actores
- Administrador: lanza manualmente los procesos programados desde `/admin`, usa `/diagnostico`, gestiona documentos ITV y edita ubicaciones.
- Usuario no administrador: consulta los documentos ITV de sus coches y guarda la ubicación de sus coches al aparcar.
- Vercel Cron: ejecuta cada 30 minutos los 4 procesos programados.
- Cliente externo sin sesión: no debe poder ejecutar ningún proceso ni consultar ni modificar datos.

## Historias de usuario
- H1: Como responsable de la flota quiero que nadie de fuera pueda lanzar notificaciones, cambiar reservas o ver configuración mediante URLs de depuración, para proteger los datos y evitar mensajes no deseados.
- H2: Como responsable de la flota quiero que los procesos programados solo se ejecuten cuando los lanza Vercel o un administrador, para evitar ejecuciones falsas.
- H3: Como usuario quiero seguir guardando la ubicación de mi coche al aparcar y viendo los documentos ITV de mis coches, como hasta ahora.

## Requisitos funcionales (criterios de aceptación en EARS)

### Endpoints de depuración y prueba
- RF-1: EL SISTEMA deja de exponer todos los endpoints bajo `/api/public`, `/api/debug` y `/api/test`: las rutas dejan de existir. Una petición con sesión recibe 404; una sin sesión recibe antes el 401 de RF-13.
- RF-2: EL SISTEMA deja de exponer `/api/diagnostico/reservas` y `/api/diagnostico/forzar-notificaciones`, con las mismas respuestas que RF-1.
- RF-3: EL SISTEMA deja de tratar `/api/public` y `/api/debug` como excepciones de autenticación en el middleware.

### Procesos programados (`/api/cron/*`)
- RF-4: CUANDO llega una ejecución programada (GET) a un endpoint `/api/cron/*` con la cabecera `Authorization: Bearer <secreto>` y el secreto coincide con la variable de entorno `CRON_SECRET`, EL SISTEMA ejecuta el proceso como hasta ahora.
- RF-5: SI una ejecución programada (GET) llega sin esa cabecera o con un secreto distinto, ENTONCES EL SISTEMA la rechaza con 401 sin ejecutar el proceso, aunque el `User-Agent` o la cabecera `x-vercel-cron` indiquen Vercel.
- RF-6: SI la variable `CRON_SECRET` no está configurada, ENTONCES EL SISTEMA rechaza todas las ejecuciones programadas (GET) con 401.
- RF-7: CUANDO un administrador con sesión lanza manualmente (POST) un proceso de `/api/cron/*` desde el panel `/admin`, EL SISTEMA lo ejecuta como hasta ahora, con las mismas acciones y respuestas.
- RF-8: SI una ejecución manual (POST) a `/api/cron/*` llega sin sesión, ENTONCES EL SISTEMA responde 401; SI llega con sesión de un usuario no administrador, ENTONCES responde 403. En ambos casos no ejecuta el proceso ni envía mensajes.

### Endpoints usados por la interfaz
- RF-9: CUANDO se solicita la lista o los enlaces de lectura de los documentos de una ITV (`/api/itv-documentos`, GET), EL SISTEMA los devuelve a un administrador o a un usuario relacionado con el coche de esa ITV; a cualquier otro usuario autenticado le responde 403.
- RF-10: CUANDO se solicita subir o borrar documentos ITV (`/api/itv-documentos`, POST y DELETE), EL SISTEMA solo lo permite a un administrador; a cualquier otro usuario autenticado le responde 403.
- RF-11: EL SISTEMA solo permite a administradores guardar o borrar la ubicación de un coche desde el editor de ubicación (`/api/coches/<matrícula>/ubicacion`, POST y DELETE); a cualquier otro usuario autenticado le responde 403.
- RF-12: CUANDO un usuario guarda la ubicación de un coche al aparcar (`/api/coches/actualizar-ubicacion`, POST), EL SISTEMA lo permite si es administrador o está relacionado con ese coche (RF-18: asignado, o con reserva activa o vencida); en otro caso responde 403 y no cambia la ubicación.
- RF-13: SI una petición a cualquier endpoint `/api` que exige sesión (todos salvo `/api/auth/*` y `/api/cron/*`, que tienen su propio mecanismo) llega sin sesión, ENTONCES EL SISTEMA responde 401 con JSON, sin redirigir a la página de inicio de sesión y sin consultar ni modificar datos.
- RF-14: CUANDO un administrador usa `/api/diagnostico` (la página `/diagnostico`), EL SISTEMA responde como hasta ahora; a un usuario no administrador le responde 403 y a una petición sin sesión, 401.

### Ampliación: relación con el coche, Server Actions de ubicación y código sin uso
- RF-18: EL SISTEMA considera que un usuario está relacionado con un coche cuando el coche le está asignado de forma permanente o cuando tiene una reserva temporal de ese coche en estado activa o vencida. Esta definición sustituye a la de la spec 017 (RF-8) y se aplica a todo lo que la usa: ficha, lecturas de datos del coche, documentos ITV y ubicación.
- RF-19: CUANDO un usuario guarda la ubicación de un coche mediante las Server Actions `actualizarUbicacionCoche` (mapa del dashboard) o `ubicarCocheEnSede` ("Ubicar en sede" en "Mis reservas"), EL SISTEMA lo permite si es administrador o está relacionado con el coche (RF-18); en otro caso devuelve `{ success: false, error }` sin cambiar la ubicación. Esto sustituye, para estas dos acciones, al "sin cambios" de la spec 017 (RF-14).
- RF-20: MIENTRAS un usuario no administrador ve el mapa del dashboard, EL SISTEMA solo le permite arrastrar para reubicar los coches con los que está relacionado (RF-18); no los que solo tiene en reserva pendiente.
- RF-21: EL SISTEMA deja de incluir `app/actions/notificaciones-v2.ts`, que no tiene consumidores.

### Comportamiento común
- RF-15: EL SISTEMA determina el rol y la relación con el coche en el servidor, con las mismas reglas que la spec 017 (rol vigente del empleado en cada petición; relación según RF-18).
- RF-16: EL SISTEMA responde a los rechazos con JSON `{ "error": "<mensaje>" }` en español y el código correspondiente (401 sin sesión o secreto, 403 sin permiso), sin incluir detalles internos.
- RF-17: EL SISTEMA mantiene sin cambios, para las peticiones autorizadas, el contrato de cada endpoint conservado (método, parámetros, forma de la respuesta y efectos).

## Requisitos no funcionales
- Seguridad: ningún endpoint `/api`, salvo los de NextAuth (`/api/auth`), puede ejecutar procesos ni acceder a datos sin sesión válida o, en los crons, sin el secreto de Vercel.
- El secreto de cron solo se compara en el servidor y nunca aparece en respuestas, logs ni en la interfaz.
- Despliegue: la variable `CRON_SECRET` debe configurarse en Vercel antes de desplegar en producción; si falta, los procesos programados dejan de ejecutarse (RF-6). La documentación operativa del repositorio debe reflejar el nombre nuevo.
- Sin cambios de esquema ni dependencias nuevas.

## Casos límite
- Petición GET a un cron con `User-Agent: vercel-cron` pero sin `Authorization`: 401.
- `Authorization` con otro esquema (`Basic …`) o con el secreto antiguo `CRON_SECRET_TOKEN`: 401.
- Administrador degradado a usuario con la sesión abierta: en la siguiente ejecución manual recibe 403 (rol vigente).
- Documento ITV de una ITV inexistente, o de un coche con el que el usuario no tiene relación: 403 para quien no es administrador, sin revelar si la ITV existe.
- Aparcar justo cuando la reserva acaba de cancelarse o completarse en otra pestaña: si ya no hay relación, 403 y la ubicación no cambia.
- Coche con `asignadoa` en texto libre: no cuenta como asignación (igual que en la 017).
- Reserva vencida (terminada pero sin completar): el usuario puede ubicar el coche y ver su ficha hasta que la complete (RF-18).
- Reserva pendiente (aún no empezada): no da relación; el usuario no puede reubicar ese coche ni ver su ficha por esa reserva.
- Reserva completada o cancelada: no da relación.
- Ejecución programada y manual simultáneas del mismo proceso: se comportan como hoy; la idempotencia no cambia en esta spec.

## Fuera de alcance
- Acceso a fotos en Supabase Storage (cliente anónimo desde el navegador): spec 019.
- Políticas RLS de Supabase.
- Cambios en la lógica de los procesos de notificación, activación de reservas o alertas, y en su idempotencia.
- Endpoints de NextAuth (`/api/auth/*`).

## Criterios de finalización
- Pruebas automatizadas en verde para:
  - los 4 crons: GET con secreto correcto, incorrecto, ausente, sin variable configurada y con `User-Agent` falseado; POST sin sesión, como usuario y como administrador;
  - `/api/itv-documentos`: GET permitido a un usuario relacionado y denegado a uno no relacionado; POST y DELETE solo para administradores;
  - los dos endpoints de ubicación, con las reglas de RF-11 y RF-12;
  - `/api/diagnostico`: 401, 403 y acceso de administrador;
  - una comprobación de que no queda ningún archivo de ruta bajo `app/api/public`, `app/api/debug`, `app/api/test`, ni en `diagnostico/reservas` o `diagnostico/forzar-notificaciones`, ni `app/actions/notificaciones-v2.ts`;
  - la relación con el coche: asignado, reserva activa, reserva vencida, reserva pendiente (sin relación) y sin reserva;
  - las dos Server Actions de ubicación: usuario relacionado (incluida reserva vencida), no relacionado y administrador.
- Prueba manual:
  - como administrador: los botones de `/admin`, `/diagnostico`, subir y borrar un documento ITV, y el editor de ubicación;
  - como usuario: ver los documentos ITV de su coche, aparcar desde el móvil, reubicar su coche en el mapa, y con una reserva vencida, "Ubicar en sede" y completarla.
- Tras desplegar con `CRON_SECRET` configurada: comprobar en los logs de Vercel que las 4 ejecuciones programadas siguen funcionando.
- `npm run lint` y `npx tsc --noEmit` sin errores nuevos; `npm run build` compila.

## Dudas abiertas
Ninguna. Decisiones del responsable del 2026-11-16:
- Precisión de RF-1, RF-2 y RF-13 al preparar el plan (aprobada el 2026-11-16): sin sesión, el middleware responde 401 JSON a cualquier `/api` protegido, en lugar de redirigir al login; por eso las rutas eliminadas dan 401 sin sesión y 404 con sesión.
- Alcance: solo `/api`; las fotos en Storage van en la spec 019.
- `/api/public`, `/api/debug` y `/api/test`: se eliminan.
- Crons: secreto oficial de Vercel (`CRON_SECRET`, `Authorization: Bearer`) para las ejecuciones programadas, sin detección por `User-Agent`; las manuales, solo administradores.
- Endpoints de la interfaz: reglas de la 017 (documentos ITV: leer administrador o relacionado, subir y borrar solo administrador; editor de ubicación solo administrador; aparcar administrador o relacionado).
- `/api/diagnostico`: solo administradores; `diagnostico/reservas` y `diagnostico/forzar-notificaciones` se eliminan.
- Código muerto (`lib/init-scheduler.ts`, `lib/scheduler.ts`, la importación comentada en `app/layout.tsx` y `app/diagnostico.tsx`): se elimina.
- Ampliación aprobada durante la validación: eliminar `notificaciones-v2`; alinear las Server Actions de ubicación con las mismas reglas; relación con el coche = asignado, o reserva activa o vencida (RF-18 a RF-21).
