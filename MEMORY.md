# Memoria del proyecto

## Estado actual del proyecto

El repositorio es **Fulcrum Flota**, aplicación web existente para gestionar vehículos y operaciones de flota. No es Fulcrum-Soporte: no se encontraron funcionalidades de incidencias. La aplicación contiene páginas, Server Actions y endpoints para varios dominios de flota; el esquema desplegado y el estado de cada entorno no se pueden verificar desde este checkout.

## Estado funcional actual

- **Acceso e identidad:** inicio de sesión corporativo mediante Azure AD/NextAuth. En callbacks se consulta o registra automáticamente un empleado a partir del email. La aplicación maneja roles `usuario` y `administrador`.
- **Flota:** consulta, alta, edición, detalle, búsqueda y actualización de coches; existen asignaciones permanentes y ubicaciones.
- **Reservas:** creación y gestión de reservas temporales, estados activa/completada/cancelada, reservas pendientes y activación programada. Hay vistas de reservas y análisis con información de uso/feedback.
- **Empleados:** listado, alta, edición y detalle; existen operaciones de administración y estado de bloqueo.
- **Datos asociados a vehículos:** ITV y alertas/documentos, mantenimiento y alertas, seguros, tarjetas Solred y VIAT, alquileres y fotografías/documentación.
- **Notificaciones:** lógica para alertas de reservas, ITV y mantenimiento; email mediante Microsoft Graph y mensajes WhatsApp mediante Twilio. Hay rutas de cron y pantallas/endpoints de prueba o diagnóstico.
- **PWA:** manifest, service worker, página offline e iconos presentes.

## Estado técnico actual

- Next.js 14.2.16 (App Router), React 18, TypeScript 5 y Tailwind CSS 3 según `package.json`; `tsconfig.json` tiene `strict: true`.
- Páginas y layouts en `app/`; componentes en `components/`; lógica e integraciones en `lib/`; Server Actions en `app/actions/` y junto a algunas rutas; API Route Handlers en `app/api/`.
- NextAuth 4 con sesión JWT y proveedor Azure AD; middleware en `middleware.ts`. No se encontró Supabase Auth. El middleware deja pasar rutas de auth, cron, debug y public, y varias acciones implementan comprobaciones de sesión/rol por separado; verificar autorización en el punto concreto antes de cambiarlo.
- Supabase/PostgreSQL accedido con `@supabase/supabase-js`: cliente con clave anónima en `lib/supabase.ts` y cliente servidor con service role en `lib/supabase-server.ts`. El uso real de service role implica acceso privilegiado en servidor.
- Storage de Supabase se utiliza para fotos y documentos. La configuración de buckets se describe en scripts SQL, pero el estado remoto no es verificable.
- Despliegue configurado para Vercel en `vercel.json`, que declara cron jobs de notificaciones y activación de reservas cada 30 minutos.
- Pruebas Jest en `__tests__/`, configuración `jest.config.js` y setup Testing Library. `package.json` no declara scripts `test` ni `typecheck`; sí `dev`, `build`, `start` y `lint`. El build Next ignora errores de lint y TypeScript según `next.config.mjs`.

## Modelo de datos actual

Las consultas del código y los SQL de `scripts/` muestran entidades principales `coches`, `empleados`, `reservas`, `itvs`, `mantenimientos`, `seguros`, `alquileres`, `tarjetassolred`, `solred_coches`, `viats`, `viat_coches` (y scripts legados que mencionan `viat_empleados`). Las reservas relacionan coche por matrícula y empleado por id; los datos de tarjetas y seguros se relacionan con vehículos mediante tablas de asignación. ITV y mantenimiento se asocian a vehículos.

Un SQL de creación de reservas define restricciones de fechas, claves foráneas e incluye triggers para detectar solapamientos y actualizar `updated_at`. Hay scripts para habilitar RLS y revocar acceso a `anon`/`authenticated`, y un script de rollback. No hay historial formal de migraciones en el repositorio ni evidencia de qué SQL está aplicado en producción; no tratar scripts como prueba del esquema desplegado. No se encontraron llamadas `.rpc()` en el código inspeccionado.

## Integraciones actuales

- **Supabase:** PostgreSQL y Storage.
- **Microsoft Entra ID/Azure AD con NextAuth:** inicio de sesión corporativo y datos de identidad de sesión.
- **Microsoft Graph:** envío de correo con credenciales de aplicación.
- **Twilio:** envío de WhatsApp y, opcionalmente, consulta del estado del mensaje.
- **Google Maps:** mapas/ubicaciones de vehículos y enlaces o imágenes de mapa en notificaciones.

## Decisiones técnicas actualmente vigentes

- La aplicación está materializada como Next.js App Router con React y TypeScript, no como Next.js 16. La configuración actual está en `next.config.mjs` y `.eslintrc.json`.
- Acceso a datos mayoritariamente mediante consultas directas de Supabase desde Server Actions, páginas y endpoints; no se observa una capa única de repositorios.
- Autenticación corporativa vía NextAuth/Azure AD; roles de negocio en registros de empleados.
- Vercel es el destino de despliegue declarado y programa los crons definidos en `vercel.json`.

## Limitaciones y deuda conocida

- El repositorio no contiene una fuente canónica del esquema Supabase ni un directorio formal de migraciones; `scripts/` contiene SQL manual diverso. El estado aplicado en entornos es desconocido.
- No hay tipos generados de Supabase ni evidencia de sincronización automática del esquema con tipos TS.
- No hay scripts de test/type-check en `package.json`, aunque Jest y TypeScript están disponibles/configurados. El build omite sus errores de lint y TS; deben ejecutarse validaciones aparte.
- No se encontró configuración de CI en los archivos inspeccionados. Esto no descarta automatizaciones externas al repositorio.
- Hay rutas `api/public`, `api/debug` y `api/test`, y excepciones de middleware relacionadas; su exposición/uso y configuración de entorno deben verificarse antes de cambios de seguridad.
- No se encontraron `README.md`, `MEMORY.md` (antes de esta creación) ni especificaciones en `specs/`. Tampoco `supabase/`, `supabase/config.toml`, `supabase/migrations/`, `proxy.ts`, `next.config.ts` ni `eslint.config.mjs`; la ausencia en este checkout no prueba que no existan recursos externos.

## Trabajo en curso

No se ha identificado trabajo en curso que deba persistirse en memoria.

## Próximos pasos confirmados

No hay próximos pasos confirmados actualmente.

## Referencias de contexto

Antes de cambios relevantes, consultar `AGENTS.md`, `docs/constitution.md` y la spec correspondiente bajo `specs/`, cuando exista. La organización y autoridad de estos documentos se rige por la constitución; las instrucciones operativas se rigen por `AGENTS.md`.

## Reglas de mantenimiento de esta memoria

- MEMORY.md representa el estado actual, no el historial del proyecto.
- Cuando cambie una funcionalidad, actualizar su descripción existente en lugar de añadir entradas históricas.
- Eliminar información que haya dejado de ser cierta; no registrar cada modificación ni usar este archivo como changelog.
- No duplicar reglas de `docs/constitution.md` ni instrucciones de `AGENTS.md`.
- No incluir requisitos futuros que pertenezcan a una spec.
- Mantenerlo compacto y actualizarlo únicamente cuando una tarea cambie de forma relevante el estado funcional, técnico, de integración o infraestructura.
