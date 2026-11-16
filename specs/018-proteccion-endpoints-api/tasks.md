# Tareas 018 — Protección de los endpoints `/api`

Derivadas de `spec.md` (aprobada el 2026-11-16, con la precisión de RF-1, RF-2 y RF-13) y `plan.md` (aprobado el 2026-11-16). Este archivo es la única fuente del estado de implementación; cada tarea se marca `[x]` solo cuando su validación ha pasado.

Comando de pruebas: `npx jest --runInBand --testEnvironment=node __tests__/proteccion-api`

- [x] **T1 — Eliminar endpoints de depuración y código muerto** (`app/api/{public,debug,test}/**`, `app/api/diagnostico/{reservas,forzar-notificaciones}`, `lib/init-scheduler.ts`, `lib/scheduler.ts`, `app/diagnostico.tsx`, línea comentada de `app/layout.tsx` + `__tests__/proteccion-api/rutas-eliminadas.test.ts`)
  RF: RF-1, RF-2
  Hecho cuando: la prueba confirma que no existe ninguno de esos archivos; no queda ninguna referencia a ellos en `app/`, `components/`, `lib/` ni `hooks/`; tsc no da errores nuevos.

- [x] **T2 — Middleware: sin excepciones de debug/public y 401 JSON en `/api`** (`middleware.ts` + `__tests__/proteccion-api/middleware.test.ts`)
  RF: RF-1, RF-2, RF-3, RF-13
  Hecho cuando: el `matcher` ya no excluye `api/debug` ni `api/public`; las pruebas verifican que `/api/...` sin sesión → 401 JSON, una página sin sesión → redirección al login como hoy, y `/api/...` con sesión → pasa.

- [x] **T3 — Helpers de cron y de respuesta API** (`lib/cron-auth.ts`, `respuestaRechazoApi` en `lib/autorizacion.ts` + `__tests__/proteccion-api/helpers.test.ts`)
  RF: RF-4, RF-5, RF-6, RF-16
  Hecho cuando: `esPeticionCronAutorizada` acepta solo `Bearer <CRON_SECRET>` y rechaza cabecera ausente, secreto distinto, otro esquema, `CRON_SECRET` no definida y longitud distinta; `respuestaRechazoApi` devuelve 401 para "Usuario no autenticado", 403 para el resto, con `{ error }`.

- [x] **T4 — Crons** (`app/api/cron/{notificaciones,activar-reservas-pendientes,itv-alertas,mantenimiento-alertas}/route.ts` + `__tests__/proteccion-api/cron.test.ts`)
  RF: RF-4, RF-5, RF-6, RF-7, RF-8, RF-17
  Hecho cuando: en los 4, el GET solo ejecuta con el secreto correcto (401 con secreto incorrecto, sin cabecera, sin variable, con `User-Agent: vercel-cron` falseado o con el secreto antiguo); el POST responde 401 sin sesión y 403 como usuario, sin ejecutar ni enviar, y ejecuta como administrador; las respuestas autorizadas no cambian.

- [x] **T5 — Documentos ITV** (`app/api/itv-documentos/route.ts` + `__tests__/proteccion-api/interfaz.test.ts`)
  RF: RF-9, RF-10, RF-13, RF-15, RF-17
  Hecho cuando: el GET lo permite al administrador y al usuario relacionado si la ITV es de esa matrícula, y responde 403 al usuario no relacionado o con una ITV de otra matrícula; POST y DELETE dan 403 a un usuario y funcionan para el administrador; las validaciones 400 se mantienen.

- [x] **T6 — Ubicación y diagnóstico** (`app/api/coches/[matricula]/ubicacion/route.ts`, `app/api/coches/actualizar-ubicacion/route.ts`, `app/api/diagnostico/route.ts` + pruebas en `interfaz.test.ts`)
  RF: RF-11, RF-12, RF-13, RF-14, RF-15, RF-17
  Hecho cuando: el editor de ubicación (POST/DELETE) y `/api/diagnostico` dan 403 a un usuario y funcionan para el administrador; `actualizar-ubicacion` actualiza para un usuario relacionado o un administrador y da 403, sin hacer `update`, a un usuario no relacionado.

- [x] **T7 — `CRON_SECRET` en interfaz y documentación** (`app/admin/page.tsx`, `components/notificaciones-admin.tsx`, `NOTIFICACIONES.md`, `vercel-env-setup.md`)
  RF: requisito no funcional de despliegue
  Hecho cuando: no queda ninguna referencia a `CRON_SECRET_TOKEN` ni a rutas eliminadas en el código ni en esa documentación; la documentación explica que Vercel envía `Authorization: Bearer <CRON_SECRET>`.

- [ ] **T8 — Validación final y entrega** (abierta: faltan la validación con el uso real y la comprobación de los crons tras desplegar)
  RF: todos (RF-1 a RF-21)
  Hecho cuando:
  - [x] Pruebas de `__tests__/proteccion-api`, `__tests__/permisos-admin` y `__tests__/listado-vencimientos` en verde (345).
  - [x] `npm run lint` sin errores ni avisos.
  - [x] `npx tsc --noEmit` sin errores nuevos (comparado con la versión sin cambios: 0 nuevos; desaparecen 11 de archivos eliminados).
  - [x] `npm run build` compila.
  - [x] Prueba manual como administrador (parcial, 2026-11-16): botones de `/admin` (email de prueba y reservas vencidas) y `/diagnostico` correctos. **Pendiente:** subir y borrar un documento ITV, y el editor de ubicación.
  - [ ] Prueba manual como usuario: documentos ITV de su coche, aparcar desde el móvil, reubicar su coche en el mapa y, con una reserva vencida, "Ubicar en sede" y completarla. **No realizada:** el responsable decide validarla con el uso real en producción durante los próximos días; si no hay incidencias, se dará por buena.
  - [x] `MEMORY.md`, `AGENTS.md` y specs afectadas actualizadas (001, 003, 006, 008, 012, 013 y 017, con la nueva definición de relación).
  - [x] Commit, push de `feature/proteccion-api` y PR a `dev` que cierre la issue #10.
  - [ ] Tras desplegar en producción: los 4 crons responden 200 en los logs de Vercel; después, eliminar `CRON_SECRET_TOKEN` de Vercel.

## Ampliación aprobada el 2026-11-16 (RF-18 a RF-21)

> Estas tareas se añadieron durante la validación de T8, cuyas comprobaciones vuelven a quedar abiertas para repetirlas con todo el código.

- [x] **T9 — Relación con reserva activa o vencida** (`lib/autorizacion.ts` + `__tests__/permisos-admin/autorizacion.test.ts`)
  RF: RF-18
  Hecho cuando: las pruebas verifican relación con reserva activa y con reserva vencida, y sin relación con reserva pendiente, completada o cancelada; las suites de 017 y 018 siguen en verde.

- [x] **T10 — Server Actions de ubicación** (`app/actions/ubicacion.ts` + `__tests__/permisos-admin/acciones.test.ts`)
  RF: RF-19
  Hecho cuando: `actualizarUbicacionCoche` y `ubicarCocheEnSede` rechazan a un usuario no relacionado con `{ success: false, error }` sin geocodificar ni actualizar, y funcionan para un usuario relacionado y para un administrador.

- [x] **T11 — Mapa: reubicar solo coches relacionados** (`components/mapa-coches.tsx`)
  RF: RF-20
  Hecho cuando: `canRelocate` es `isAdmin || isUserVehicle || reserva del usuario activa o vencida`; los colores de los marcadores no cambian; tsc y lint sin errores en el archivo.

- [x] **T12 — Eliminar `notificaciones-v2`** (`app/actions/notificaciones-v2.ts` + `rutas-eliminadas.test.ts`)
  RF: RF-21
  Hecho cuando: el archivo no existe, no queda ninguna referencia y la prueba lo comprueba.
