# Plan 018 — Protección de los endpoints `/api`

**Spec de origen:** `specs/018-proteccion-endpoints-api/spec.md`, aprobada el 2026-11-16, incluida la precisión de RF-1, RF-2 y RF-13.
**Estado del plan:** aprobado por el responsable el 2026-11-16.
**Rama:** `feature/proteccion-api` (desde `dev`). **Issue:** #10.

## 1. Alcance
Implementar RF-1 a RF-17:
- eliminar los endpoints de depuración y prueba y el código muerto asociado;
- autenticar los crons con `CRON_SECRET` y reservar su ejecución manual a administradores;
- aplicar las reglas de la 017 a documentos ITV, ubicación y diagnóstico;
- hacer que el middleware responda 401 JSON a `/api` sin sesión.

No se tocan las fotos en Storage (spec 019), RLS, el esquema, la lógica de los procesos ni las dependencias.

## 2. Enfoque general
1. **Eliminación.** Se borran los directorios `app/api/public`, `app/api/debug`, `app/api/test` y las rutas `app/api/diagnostico/reservas` y `app/api/diagnostico/forzar-notificaciones`, junto con `lib/init-scheduler.ts`, `lib/scheduler.ts`, `app/diagnostico.tsx` y la importación comentada de `app/layout.tsx`. Next deja de generar esas rutas (404).
2. **Middleware.** Se quitan las excepciones de `/api/debug` y `/api/public` (en la función, en `authorized` y en `config.matcher`). Para cualquier `/api` sin sesión, salvo `/api/auth` y `/api/cron` (que el matcher sigue excluyendo), responde `401 { error: "No autenticado" }` en vez de redirigir al login.
3. **Crons.** Nuevo helper `lib/cron-auth.ts` → `esPeticionCronAutorizada(request)`: compara en tiempo constante `Authorization` con `Bearer ${process.env.CRON_SECRET}` y rechaza si la variable no existe. Los `GET` de los 4 crons lo usan en lugar de la detección por `User-Agent` y `x-vercel-cron`. Los `POST` llaman primero a `autorizarAdmin()` (017) y responden 401 o 403.
4. **Endpoints de la interfaz y diagnóstico.** Usan las guardas de `lib/autorizacion.ts` (017) y un helper nuevo que traduce el rechazo a respuesta HTTP.

## 3. Archivos

| Archivo | Acción | RF |
|---|---|---|
| `app/api/public/**` (18 rutas), `app/api/debug/**` (7), `app/api/test/**` (2) | Eliminar | 1 |
| `app/api/diagnostico/reservas/route.ts`, `app/api/diagnostico/forzar-notificaciones/route.ts` | Eliminar | 2 |
| `lib/init-scheduler.ts`, `lib/scheduler.ts`, `app/diagnostico.tsx`; línea `// import "@/lib/init-scheduler"` de `app/layout.tsx` | Eliminar (código muerto, decisión de la spec) | — |
| `middleware.ts` | Quitar excepciones de `/api/debug` y `/api/public`; responder 401 JSON a `/api` sin sesión | 3, 13 |
| `lib/cron-auth.ts` | Crear: `esPeticionCronAutorizada` | 4–6 |
| `lib/autorizacion.ts` | Añadir `respuestaRechazoApi(error)` → `NextResponse` 401 o 403 con `{ error }` | 8, 9–12, 14, 16 |
| `app/api/cron/{notificaciones,activar-reservas-pendientes,itv-alertas,mantenimiento-alertas}/route.ts` | GET con `esPeticionCronAutorizada`; POST con `autorizarAdmin` | 4–8, 17 |
| `app/api/itv-documentos/route.ts` | GET: admin, o usuario relacionado y la ITV es de esa matrícula; POST y DELETE: solo admin | 9, 10, 13 |
| `app/api/coches/[matricula]/ubicacion/route.ts` | POST y DELETE: solo admin | 11, 13 |
| `app/api/coches/actualizar-ubicacion/route.ts` | POST: admin o usuario relacionado | 12, 13 |
| `app/api/diagnostico/route.ts` | GET: solo admin | 14 |
| `app/admin/page.tsx`, `components/notificaciones-admin.tsx` | Texto de ayuda: `CRON_SECRET_TOKEN` → `CRON_SECRET` | NFR despliegue |
| `NOTIFICACIONES.md`, `vercel-env-setup.md` | Documentar `CRON_SECRET` y quitar las referencias a rutas eliminadas | NFR despliegue |
| `lib/autorizacion.ts` (`estaRelacionadoConCoche`) | Reserva activa o vencida | 18 |
| `app/actions/ubicacion.ts` | Guarda `autorizarLecturaCoche` en las dos acciones | 19 |
| `components/mapa-coches.tsx` | `canRelocate` sin reservas pendientes | 20 |
| `app/actions/notificaciones-v2.ts` | Eliminar | 21 |
| `__tests__/proteccion-api/*.test.ts` | Crear pruebas (§8) | todos |

## 4. Middleware (`middleware.ts`)
```
función middleware(req):
  si pathname empieza por /auth → next()
  si no hay token ni cookie de sesión:
     si pathname empieza por /api/ → 401 JSON { error: "No autenticado" }   // RF-13
     si no → redirigir a /auth/signin (como hoy)
  next()

authorized({ token, req }):
  /auth → true
  /api/  → true      // deja pasar a la función para que responda 401 JSON (no redirige)
  resto → !!token || cookie de sesión (como hoy)

matcher: se quitan api/debug y api/public de la exclusión; se mantienen api/auth y api/cron.
```
Se quitan las ramas de `/api/cron`, `/api/debug` y `/api/public` de la función y de `authorized`. La de `/api/cron` no hacía nada porque el matcher ya excluye esa ruta.

## 5. Crons
- **`lib/cron-auth.ts`:**
  ```
  esPeticionCronAutorizada(request):
    secreto ← process.env.CRON_SECRET
    si !secreto → false                                   // RF-6
    cabecera ← request.headers.get("authorization") ?? ""
    esperado ← "Bearer " + secreto
    → longitudes iguales y crypto.timingSafeEqual(cabecera, esperado)   // RF-4, RF-5
  ```
- **GET (los 4):** `if (!esPeticionCronAutorizada(request)) return 401 { error: "No autorizado", timestamp }`. El resto no cambia, salvo `source`, que pasa a ser siempre `"cron"`: ya no existe el caso de un GET manual con `User-Agent`.
- **POST (los 4):** al principio, `const acceso = await autorizarAdmin(); if (!acceso.ok) return respuestaRechazoApi(acceso.error)`. Se aplica a todas las acciones de `notificaciones` (`test`, `send-test`, `send-test-auth-user`, `run`). El resto del cuerpo no cambia (RF-17).
- **Despliegue:** Vercel envía `Authorization: Bearer <CRON_SECRET>` a los crons de `vercel.json` solo si existe una variable de entorno llamada exactamente `CRON_SECRET`. La actual `CRON_SECRET_TOKEN` no sirve para eso. Hay que crear `CRON_SECRET` (puede tener el mismo valor) antes de desplegar en producción. `CRON_SECRET_TOKEN` se puede borrar después, porque el código deja de usarla.

## 6. Endpoints de la interfaz y diagnóstico
- **`respuestaRechazoApi(error)`:** `ERROR_NO_AUTENTICADO` → 401; cualquier otro → 403; cuerpo `{ error }` (RF-16).
- **`/api/itv-documentos`:**
  - **GET:** `autorizarLecturaCoche(matricula)`; si no es admin, comprueba además que `itvs` tenga una fila con `id = itvId` y esa `matricula`. Si no la hay → 403, sin revelar si la ITV existe (caso límite). Para el admin, el comportamiento actual.
  - **POST y DELETE:** `autorizarAdmin()`.
  - Las validaciones de parámetros (400) se mantienen y se ejecutan después de la guarda. Si no hay sesión, el middleware ya habrá respondido 401.
- **`/api/coches/[matricula]/ubicacion`:** POST y DELETE con `autorizarAdmin()`, que sustituye a la comprobación actual de solo sesión.
- **`/api/coches/actualizar-ubicacion`:** lee `matricula` del cuerpo y llama a `autorizarLecturaCoche(matricula)` antes de validar que existe el coche y de actualizar. La regla de relación de la 017 es la de RF-12. El mensaje de log que incluye el email del usuario se conserva tal cual (no es nuevo).
- **`/api/diagnostico`:** GET con `autorizarAdmin()`.

## 6 bis. Ampliación (RF-18 a RF-21, aprobada el 2026-11-16)
- **Relación con el coche** (`lib/autorizacion.ts`, `estaRelacionadoConCoche`): la consulta de reservas pasa de `.eq("estado", "activa")` a `.in("estado", ["activa", "vencida"])`. Afecta a todos los consumidores de `autorizarLecturaCoche`: ficha, lecturas de la 017, documentos ITV y ubicación. Así se cumple RF-18 sin duplicar la regla.
- **Server Actions de ubicación** (`app/actions/ubicacion.ts`): `actualizarUbicacionCoche` y `ubicarCocheEnSede` llaman a `autorizarLecturaCoche(matricula)` antes de geocodificar o actualizar. Si se rechaza, devuelven `{ success: false, error }` (su forma actual). Sustituyen a su comprobación de solo sesión (RF-19).
- **Mapa** (`components/mapa-coches.tsx`): `canRelocate` deja de usar `esMiCoche`, que incluye reservas pendientes, y pasa a `isAdmin || isUserVehicle || reserva del usuario activa o vencida`. `esMiCoche` se mantiene para los colores del marcador, que no cambian (RF-20).
- **`app/actions/notificaciones-v2.ts`**: se elimina (RF-21). La prueba de la 017 que lo listaba entre las acciones "sin guarda" se actualiza; también la de las acciones de ubicación, que pasan a tener guarda.

## 7. Decisiones técnicas
- **401 JSON en el middleware para `/api`, en lugar de redirigir.** Un cliente `fetch` no puede seguir un redirect al login con sentido, y RF-13 exige 401. Se hace en el middleware para cubrir de una vez todos los `/api`, incluidas las rutas eliminadas.
- **`timingSafeEqual` para el secreto:** evita filtrar el secreto por diferencias de tiempo en la comparación. Es de `node:crypto`, sin dependencias nuevas. Los Route Handlers se ejecutan en runtime Node.
- **Un único helper de cron** compartido por las 4 rutas, para que no vuelvan a divergir.
- **Reutilizar las guardas de la 017** (`autorizarAdmin`, `autorizarLecturaCoche`): misma regla de rol vigente y de relación. No se duplica lógica.
- **No se mantiene compatibilidad con `CRON_SECRET_TOKEN`:** Vercel no la enviaría, y aceptarla solo dejaría una segunda vía manual que la spec no pide.

## 8. Validación
- **Pruebas automatizadas** (Jest `--testEnvironment=node` + `@jest/globals`, como en 016 y 017):
  - `cron.test.ts`: para cada uno de los 4 crons:
    - GET con el secreto correcto (ejecuta el proceso), incorrecto, sin cabecera, sin `CRON_SECRET` definida, con `User-Agent: vercel-cron` sin cabecera y con el secreto antiguo → 401 sin ejecutar;
    - POST sin sesión → 401, como usuario → 403 (sin ejecutar ni enviar), como administrador → ejecuta.
    - Las acciones y `lib/email` se simulan.
  - `interfaz.test.ts`:
    - `itv-documentos`: GET como admin, como usuario relacionado con ITV de su matrícula, como usuario relacionado con ITV de otra matrícula (403) y como no relacionado (403); POST y DELETE como usuario (403) y como admin.
    - Ubicación: editor como usuario (403) y como admin; `actualizar-ubicacion` como relacionado, no relacionado (403, sin `update`) y admin.
    - `diagnostico`: usuario (403) y admin.
  - `rutas-eliminadas.test.ts`: no existen archivos bajo `app/api/{public,debug,test}`, `app/api/diagnostico/{reservas,forzar-notificaciones}`, `lib/scheduler.ts`, `lib/init-scheduler.ts` ni `app/diagnostico.tsx`; el `matcher` del middleware ya no excluye `api/debug` ni `api/public`.
  - `middleware.test.ts`: `/api/...` sin sesión → 401 JSON; página sin sesión → redirect al login; `/api/...` con sesión → pasa.
  - Las suites de 016 y 017 siguen en verde.
- **Prueba manual:**
  - como administrador: botones de `/admin` (cada proceso y los emails de prueba), `/diagnostico`, subir y borrar un documento ITV, y el editor de ubicación;
  - como usuario: documentos ITV de su coche y aparcar desde el móvil;
  - sin sesión: `curl` a una ruta `/api` → 401 JSON.
- **Tras desplegar con `CRON_SECRET`:** revisar en los logs de Vercel que los 4 crons responden 200.
- **Controles:** `npm run lint`, `npx tsc --noEmit` (0 errores nuevos, comparando con la versión sin cambios), `npm run build`.

## 9. Riesgos, compatibilidad y reversión
- **Crons parados si falta `CRON_SECRET` en producción.** Es el riesgo principal. Mitigación: la PR y la issue lo indican como paso previo, y la comprobación de logs tras desplegar.
- **Clientes externos que usaran rutas eliminadas** (por ejemplo, algún script o un monitor apuntando a `/api/public/...`): dejarán de funcionar. No se ha encontrado ninguno en el repositorio.
- **El cambio del middleware a 401 JSON para `/api`** afecta a todos los `fetch` de la interfaz sin sesión. Hoy recibirían una redirección HTML que tampoco pueden usar, así que no empeora ningún flujo.
- **Documentación de la 017:** `MEMORY.md` y las specs 006, 008 y 012 (dudas sobre la autenticación de cron y de los endpoints) se actualizarán al cerrar, para que no quede nada desfasado.
- **Reversión:** basta con revertir los commits. Las rutas eliminadas se recuperan del historial. No hay migraciones.

## 10. Tareas
El desglose en tareas (T1–T12), con sus RF, su "Hecho cuando:" y su estado `[x]`/`[ ]`, está en [`tasks.md`](tasks.md), que es la única fuente del estado de implementación.
