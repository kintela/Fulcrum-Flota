# Instrucciones para agentes

## Contexto
Aplicación privada de gestión de flota: vehículos, reservas, empleados, tarjetas, ITV, mantenimiento, seguros, ubicaciones, fotos y notificaciones. Interfaz en español. Se está introduciendo Spec-Driven Development; hasta que existan los documentos correspondientes, no des por aprobados requisitos o decisiones que no estén documentados. Para cada tarea, acuerda alcance y criterios de aceptación si no están claros; no deduzcas requisitos a partir de endpoints de diagnóstico.

## Flujo Spec-Driven obligatorio

- Cada funcionalidad debe tener su especificación en `specs/NNN-nombre-funcionalidad/spec.md` su plan en `specs/NNN-nombre-funcionalidad/plan.md` y sus tareas en `specs/NNN-nombre-funcionalidad/tasks.md`. `NNN` y el nombre identifican la funcionalidad; si no hay convención para asignar el número, consúltala antes de crear una carpeta.
- La especificación define qué debe hacer la funcionalidad y sus criterios de aceptación. El plan debe derivarse de una especificación aprobada y describir cómo implementarla.
- La implementación debe derivarse del plan aprobado. No añadas funcionalidades, decisiones arquitectónicas ni cambios de alcance no respaldados por la especificación y el plan.
- Antes de implementar una funcionalidad, consulta ambos documentos y confirma que están aprobados. La forma de registrar formalmente una aprobación está pendiente de definir; no la supongas.
- Si durante el trabajo aparece una necesidad que contradice o amplía la especificación, detén la parte afectada. Actualiza primero la especificación, solicita su aprobación y actualiza el plan antes de continuar. No resuelvas el cambio solo en el código.
- Se permiten especificaciones retrospectivas cuando el objetivo explícito sea registrar comportamiento ya existente como línea base. Deben contrastarse con código y otras evidencias, marcar incertidumbres como `[NECESITA ACLARACIÓN]` y no presentarse como justificación de cambios anteriores ni como autorización para modificar comportamiento. Los planes siguen siendo prospectivos y deben derivarse de una spec aprobada.

## Jerarquía documental

La autoridad documental, de mayor a menor, es:

1. `docs/constitution.md`
2. `AGENTS.md`
3. `MEMORY.md`
4. `specs/NNN-nombre-funcionalidad/spec.md`
5. `specs/NNN-nombre-funcionalidad/plan.md`
6. `specs/NNN-nombre-funcionalidad/tasks.md`
7. Implementación

La constitución gobierna los principios del proyecto. `AGENTS.md` rige la forma de trabajar de los agentes y no puede contradecirla. `MEMORY.md` describe el estado actual y no introduce requisitos. La especificación define qué hace una funcionalidad; el plan define cómo implementar una especificación aprobada. El código debe respetar todos los niveles anteriores. Si hay contradicción entre documentos, no la resuelvas silenciosamente: identifica los documentos y el conflicto y solicita una decisión antes de implementar.

Consulta `docs/constitution.md` y `MEMORY.md` antes de iniciar trabajo relevante. Si falta alguno de esos documentos, no inventes su contenido: informa de la ausencia y solicita una decisión según corresponda.

## Stack y arquitectura
- Next.js 14.2 App Router, React 18, TypeScript 5 y Tailwind CSS 3.
- Supabase (`@supabase/supabase-js`) para datos y Storage. `lib/supabase.ts` usa clave anónima; `lib/supabase-server.ts` usa `SUPABASE_SERVICE_ROLE_KEY` en servidor.
- NextAuth 4 con Azure AD: `lib/auth.ts`, endpoint `app/api/auth/[...nextauth]/route.ts`, protección en `middleware.ts`. El rol se consulta en `empleados` y se añade a la sesión.
- `app/` contiene páginas, endpoints y Server Actions; `components/` contiene UI y componentes de dominio; `lib/` concentra integraciones, datos y lógica. No se observa una capa uniforme de repositorios.
- Integraciones: Microsoft Graph para email (`lib/email.ts`), Twilio WhatsApp (`lib/whatsapp.ts`), Google Maps y Supabase Storage. Cron de Vercel en `vercel.json`, autenticado con `CRON_SECRET` (`lib/cron-auth.ts`).

## Estructura relevante
- `app/`: rutas y layouts, `app/api/**/route.ts`, Server Actions y áreas de coches, reservas, empleados, tarjetas, análisis, auth y administración.
- `components/`, `components/ui/`: componentes de dominio y UI Radix/shadcn.
- `lib/`: clientes externos, auth/roles, acceso a datos, lógica de dominio y utilidades.
- `hooks/`, `types/`, `styles/`: hooks, declaraciones TS y estilos compartidos.
- `public/`: recursos estáticos y PWA (manifest, service worker, página offline e iconos).
- `scripts/`: SQL operativo/migraciones y generador MJS. No se observa framework de migraciones ni ejecución automatizada del SQL.
- `__tests__/`: pruebas Jest organizadas sobre todo por dominio; config en `jest.config.js` y `jest.setup.js`.
- Configuración raíz: Next, TypeScript, ESLint, Tailwind, PostCSS, Jest y Vercel. Documentación: `NOTIFICACIONES.md`, `GRAPH-EMAIL.md`, `vercel-env-setup.md`.

## Comandos oficiales y validación
Scripts declarados en `package.json`:
```bash
npm run dev       # Next en puerto 3000
npm run build     # next build
npm start         # next start
npm run lint      # next lint
```
No hay scripts `test` ni `typecheck`. Invocaciones directas de herramientas configuradas:
```bash
npx jest --runInBand
npx tsc --noEmit
```
No denominar estas últimas scripts oficiales. Jest usa `next/jest`, `jsdom`, `jest.setup.js` y alias `@/`. TypeScript está en modo `strict`. `next.config.mjs` ignora errores de ESLint y TypeScript durante build, por lo que build no sustituye lint/type-check.

Antes de terminar, ejecuta pruebas relevantes (o la suite completa si el cambio es transversal), `npm run lint`, `npx tsc --noEmit` y, cuando corresponda, `npm run build`. Informa comandos y resultados; si omites alguno, indica por qué. No ocultes ni corrijas errores preexistentes fuera del alcance.

## Convenciones
- Alias `@/*` apunta a la raíz (ver `tsconfig.json`); sigue el estilo local de imports.
- Conviven nombres españoles e ingleses; conserva idioma y nomenclatura del código cercano.
- App Router usa `page.tsx`, `layout.tsx`, `route.ts`; Server Actions en `actions.ts` locales o `app/actions/`.
- Conserva el patrón cliente/servidor existente y las directivas React existentes. No muevas lógica entre cliente y servidor sin justificar efectos y seguridad.
- ESLint extiende `next/core-web-vitals` y `next/typescript`; las reglas locales desactivan varias comprobaciones (ver `.eslintrc.json`). No asumas formato automático o reglas no configuradas.
- Las pruebas se encuentran bajo `__tests__`, generalmente con nombres `.test.ts` o `.test.tsx`.

## Reglas de cambio
- Inspecciona primero los componentes, acciones, endpoints, utilidades y pruebas relacionadas. Haz cambios mínimos, localizados y compatibles; evita refactorizaciones no solicitadas y no cambies comportamiento ajeno a los criterios de aceptación.
- Para trabajo de funcionalidad, aplica el flujo Spec-Driven y la jerarquía documental anteriores. Los cambios pequeños de mantenimiento que no introduzcan ni alteren comportamiento pueden seguir las instrucciones de tarea y estas reglas; si su alcance o efecto resulta dudoso, pregunta antes.
- Añade/actualiza pruebas para cambios de comportamiento. No introduzcas abstracciones nuevas solo por preferencia; sigue el patrón más cercano y registra cualquier decisión arquitectónica no evidente.
- No añadas dependencias sin necesidad justificada y autorización explícita. Comprueba antes si existe una dependencia/herramienta equivalente; si se aprueba, actualiza manifiesto y lockfile de forma coherente. No actualices paquetes incidentalmente.
- Ningún agente puede decidir unilateralmente cambios importantes de arquitectura, sustituir tecnologías fundamentales, cambiar el proveedor de autenticación o el modelo fundamental de autorización, eliminar o sustituir Supabase, cambiar significativamente el modelo de datos, incorporar infraestructura nueva o emprender migraciones tecnológicas importantes. Estos cambios requieren decisión explícita y, si afectan al comportamiento o la arquitectura, una especificación aprobada antes de implementarlos.
- Prioriza cambios pequeños y controlados y preserva el comportamiento existente salvo que una especificación aprobada indique lo contrario. Evita refactors oportunistas; no mezcles mantenimiento ajeno al alcance con una funcionalidad.
- Los cambios de datos requieren revisar todas las consultas y consumidores afectados, constraints, relaciones, roles y políticas RLS. No edites o ejecutes SQL contra entornos sin autorización. Los SQL de `scripts/` son manuales; define explícitamente orden, impacto, reversión y compatibilidad. No inventes esquema: la fuente completa del esquema desplegado está pendiente de definir en el repositorio.
- Para APIs/Server Actions conserva contratos, validación, códigos de estado y manejo de errores existentes. Verifica autenticación/autorización en el servidor; middleware no reemplaza autorización de una operación. No expongas secretos, datos sensibles ni endpoints de diagnóstico. Evalúa efectos externos, idempotencia y autenticación de cron antes de cambiar integraciones.
- Secretos y configuración local no se versionan ni se imprimen. Consulta nombres/uso de variables en el código y documentación; no leas ni divulgues valores de `.env.local`. No hay inventario formal de variables/entornos: pendiente de definir.
- No cambies comportamiento, dependencias, despliegue o esquema de base de datos fuera de lo pedido.
- Después de una tarea, actualiza `MEMORY.md` únicamente si el trabajo validado cambió de forma relevante el estado funcional, técnico, de integración o infraestructura. Edita la fotografía actual (no añadas un historial), elimina lo que dejó de ser cierto y no registres propuestas como estado ya implementado. Si no hubo cambio de estado relevante, no es necesario modificarlo.

## Consultar antes de implementar
1. `AGENTS.md`, `docs/constitution.md` y `MEMORY.md` para cambios relevantes; consulta también la spec y el plan aprobados correspondientes cuando existan.
2. `package.json`, `package-lock.json`, `tsconfig.json`, `.eslintrc.json`, `next.config.mjs` y configuración Jest relevante.
3. La página/componente de la funcionalidad, sus `actions.ts`/`app/actions/`, API routes y utilidades `lib/` relacionadas.
4. `middleware.ts`, `lib/auth.ts`, `lib/autorizacion.ts`, `lib/roles.ts`, `lib/user-role.ts` para cambios con sesión, permisos o acceso a datos.
5. Pruebas relacionadas en `__tests__/`.
6. SQL pertinente en `scripts/`, documentación operacional y `vercel.json` si afecta datos, notificaciones, variables, cron o despliegue.
7. Variables necesarias por nombre, sin consultar ni revelar valores secretos.

## Pendiente de definir
No se encontró documentación suficiente para establecer gestor/versión de Node soportada (existe `.nvmrc`, debe consultarse), estrategia de ramas/commits, CI, ambientes de datos, esquema canónico de Supabase, convenciones formales de API, cobertura mínima de tests, reglas de formato y proceso de aprobación/despliegue. No inventes estos acuerdos: pregunta o documenta la decisión antes de depender de ellos.
