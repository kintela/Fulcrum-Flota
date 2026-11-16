# Constitución técnica de Fulcrum Flota

**Estado:** principios rectores para la evolución del proyecto. Esta constitución no describe una arquitectura objetivo ni autoriza una migración. Los hechos actuales que se enumeran abajo son una línea base observada en el repositorio, no una declaración de que todo patrón existente sea deliberado o deba perpetuarse.

## 1. Propósito y alcance

Fulcrum Flota es una aplicación web de gestión de flota existente, con áreas de vehículos, reservas, empleados, tarjetas, ITV, mantenimiento, seguros, ubicaciones, fotos y notificaciones. Su evolución debe preservar el comportamiento actual salvo que un cambio aprobado disponga explícitamente lo contrario. Esta constitución gobierna decisiones futuras; no ordena rediseñar, refactorizar ni migrar la aplicación por sí misma.

Los agentes deben distinguir entre hechos constatables del código, decisiones nuevas aprobadas y cuestiones aún no decididas. Un patrón encontrado durante la etapa de vibe coding no se convierte automáticamente en principio arquitectónico.

## 2. Estructura documental y responsabilidades

La estructura documental oficial del proyecto es:

```text
/
├── AGENTS.md
├── MEMORY.md
├── docs/
│   └── constitution.md
├── specs/
│   ├── 001-nombre-funcionalidad/
│   │   ├── spec.md
│   │   └── plan.md
│   ├── 002-nombre-funcionalidad/
│   │   ├── spec.md
│   │   └── plan.md
│   └── ...
├── README.md
└── nombre-proyecto/
    └── ...
```

Responsabilidades:

- `AGENTS.md`: instrucciones operativas sobre cómo deben trabajar los agentes en el repositorio.
- `MEMORY.md`: estado real y vigente del proyecto; debe ser conciso y actualizado, no un histórico ilimitado ni una fuente de requisitos.
- `docs/constitution.md`: principios, restricciones y decisiones fundamentales que gobiernan el proyecto.
- `specs/NNN-nombre-funcionalidad/spec.md`: especificación del cambio y sus criterios de aceptación.
- `specs/NNN-nombre-funcionalidad/plan.md`: plan técnico aprobado para implementar esa especificación.
- `README.md`: documentación general de uso/desarrollo del proyecto; no sustituye especificaciones, planes ni esta constitución.

Las especificaciones y planes se almacenan exclusivamente en `specs/NNN-nombre-funcionalidad/`. No crear `docs/specs/`, `.specify/` ni estructuras alternativas para SDD. La representación anterior fija la organización documental; no requiere mover o reubicar el código existente. En este checkout no se encontró `README.md`, `MEMORY.md` ni carpeta `specs/`; su incorporación y el proceso de aprobación formal deberán resolverse como trabajo explícito, no inferirse de esta constitución.

## 3. Jerarquía de autoridad

De mayor a menor autoridad:

1. `docs/constitution.md`
2. `AGENTS.md`
3. `MEMORY.md`
4. `specs/NNN-nombre-funcionalidad/spec.md`
5. `specs/NNN-nombre-funcionalidad/plan.md`
6. Implementación

La constitución establece principios y restricciones. `AGENTS.md` determina el procedimiento de trabajo y no puede contradecirla. `MEMORY.md` registra el estado observado y no introduce requisitos. Una spec define qué debe hacer un cambio. Un plan aprobado define cómo implementar una spec aprobada. La implementación debe respetar todos los niveles anteriores.

Una contradicción, omisión material o requisito incompatible no se resuelve silenciosamente ni escogiendo el documento más conveniente: se detiene el trabajo afectado, se identifica el conflicto y se solicita una decisión a la persona responsable. La precedencia no autoriza a reinterpretar ni sobrescribir documentos inferiores sin dejar constancia mediante el proceso correspondiente.

## 4. Spec-Driven Development y control de cambios

SDD es el principio fundamental para cambios funcionales relevantes. El flujo obligatorio es:

1. Contexto de la tarea y del usuario.
2. Consulta de esta constitución.
3. Consulta del estado actual en `MEMORY.md` (si todavía no existe, no inventar su contenido; establecer su creación mediante tarea explícita).
4. Elaboración/revisión de la especificación.
5. Aprobación de la especificación.
6. Elaboración del plan derivado de la especificación aprobada.
7. Aprobación del plan.
8. Implementación conforme al plan.
9. Validación y comunicación de resultados.
10. Actualización de `MEMORY.md` cuando cambie el estado real del proyecto.

No se implementa una funcionalidad relevante sin una especificación aprobada. La spec se ubica en `specs/NNN-nombre-funcionalidad/spec.md`; el plan correspondiente en `specs/NNN-nombre-funcionalidad/plan.md`. El plan debe derivarse de la spec aprobada y la implementación del plan aprobado. Durante la implementación no se introducen funcionalidades, decisiones arquitectónicas ni cambios de alcance sin respaldo en ambos documentos.

Si aparece una necesidad que contradice o amplía la spec, se detiene el cambio afectado. Primero se actualiza la spec y se obtiene su aprobación; después se actualiza y aprueba el plan, y solo entonces se continúa. Se permiten especificaciones retrospectivas únicamente para describir comportamiento ya existente y verificable como línea base. Deben distinguir hechos observados de dudas, que se marcarán `[NECESITA ACLARACIÓN]`; no justifican cambios anteriores ni autorizan por sí mismas modificaciones del comportamiento. Los planes permanecen prospectivos y se derivan de una especificación aprobada.

El criterio de qué tareas menores pueden tratarse como mantenimiento no funcional, y la forma verificable de registrar aprobación, están pendientes de definición. Si existe duda razonable sobre relevancia o alcance, se solicita aclaración antes de editar código.

## 5. Principios arquitectónicos

### 5.1 Línea base y evolución del framework

El repositorio observado declara Next.js `14.2.16`, React `^18` y TypeScript `^5` en `package.json`. La aplicación utiliza Next.js App Router (`app/`), rutas `page.tsx`, `layout.tsx`, Route Handlers `route.ts` y Server Actions marcadas con `"use server"`. `next.config.mjs` configura opciones de build. No existen en este checkout `next.config.ts`, `proxy.ts` ni `eslint.config.mjs`.

Por tanto, Next.js 16 no es la versión actual comprobada. Los principios de este documento aplican a la arquitectura App Router vigente y a sus evoluciones compatibles; una actualización mayor a Next.js 16 requiere evaluación, decisión explícita y especificación/plan aprobados. La mención de Next 16 en una petición no debe interpretarse como autorización para migrar.

### 5.2 Next.js, React y límites de ejecución

- Mantener Next.js App Router y React como base arquitectónica mientras no exista decisión aprobada de cambio fundamental.
- Elegir Server Components por defecto cuando el trabajo pueda resolverse en servidor. Usar Client Components cuando se necesiten estado/interacción del navegador o APIs cliente; limitar su ámbito y no enviar secretos o lógica privilegiada al cliente.
- Mantener una separación clara entre código de navegador y código de servidor. Las credenciales privilegiadas, operaciones sensibles y acceso a servicios con secretos deben ejecutarse exclusivamente en un contexto de servidor.
- Usar Server Actions para operaciones de servidor iniciadas desde la interfaz solo cuando encajen con el flujo y el contrato del caso; no son una frontera de autorización automática. Validar entradas y autenticar/autorizar cada operación sensible en servidor.
- Los Route Handlers sirven para contratos HTTP e integraciones que requieran endpoints. Elegir entre Server Action y Route Handler por necesidad funcional/protocolo explícita, no por preferencia general.
- Mantener la estructura existente de `app/`, `components/`, `lib/` y acciones mientras resulte adecuada. No se impone una arquitectura de capas, repositorios ni un patrón de organización no demostrado como necesario.
- No cambiar contratos, estados, efectos secundarios ni flujos de navegación existentes salvo especificación aprobada.

### 5.3 TypeScript

TypeScript es el lenguaje principal y `tsconfig.json` activa `strict`. El código nuevo debe conservar tipado estricto y modelar explícitamente entradas, resultados y errores relevantes. Evitar introducir `any`, aserciones o supresiones para eludir el sistema de tipos; si una frontera externa requiere incertidumbre, limitarla y validarla. No se declara aquí una política de migración masiva de código legado.

## 6. Datos y persistencia

### 6.1 Supabase y PostgreSQL

El repositorio utiliza `@supabase/supabase-js` y PostgreSQL administrado por Supabase. Actualmente hay un cliente público en `lib/supabase.ts` y un cliente servidor con `SUPABASE_SERVICE_ROLE_KEY` en `lib/supabase-server.ts`; las acciones consultan tablas mediante el cliente Supabase. La ubicación de esquema y scripts existente está en `scripts/*.sql`; no se encontró directorio `supabase/`, configuración Supabase ni historial formal de migraciones.

Supabase se mantiene como plataforma de datos hasta que una decisión explícita y una especificación aprobada dispongan lo contrario. PostgreSQL debe preservar integridad referencial y restricciones de dominio en la base de datos cuando sea necesario, además de validación en la aplicación. La lógica crítica de integridad no debe depender exclusivamente de validaciones de interfaz o de una secuencia no atómica de operaciones cliente.

### 6.2 Cambios de esquema y migraciones

- Todo cambio persistente de base de datos —esquema, índices, constraints, funciones, triggers, políticas o datos de referencia necesarios para una versión— debe quedar versionado como migración revisable, repetible según el procedimiento establecido y asociado al cambio aprobado.
- Una migración ya aplicada en un entorno compartido o productivo es inmutable. Los cambios posteriores se realizan en una nueva migración compensatoria/evolutiva; nunca se edita la migración aplicada para cambiar retrospectivamente su resultado.
- Antes de cambiar datos, analizar tablas y columnas afectadas, consumidores, claves foráneas, restricciones, RLS, RPC y triggers; describir impacto, compatibilidad, despliegue y recuperación en el plan.
- No ejecutar DDL, migraciones ni modificaciones de datos remotas sin autorización explícita y sin identificar el entorno objetivo.
- SQL actualmente encontrado en `scripts/` no está organizado como historial formal. El directorio futuro, nomenclatura, herramienta, mecanismo de aplicación, registro por entorno y estrategia de rollback son decisiones pendientes. Definirlos antes de añadir la primera migración bajo un proceso formal; esta constitución no autoriza a crear ahora `supabase/` ni una estructura alternativa.

### 6.3 RLS, RPC y triggers

- Las políticas de Row Level Security deben aplicar el principio de mínimo privilegio y tener en cuenta todas las rutas de acceso a los datos.
- La autorización no se delega a RLS como sustituto de controles de aplicación, ni a la aplicación como sustituto de restricciones de datos: cada capa protege su frontera.
- El cliente con service-role puede omitir controles RLS; su uso se limita a servidor y cada operación debe aplicar autenticación/autorización de negocio de forma explícita. Nunca usarlo desde navegador.
- RPC, funciones PostgreSQL y triggers son mecanismos válidos cuando aportan atomicidad, integridad o una operación de datos claramente justificada. Su uso, privilegios, efectos secundarios y seguridad deben estar especificados, versionados en migración y revisados; no se exigen como patrón universal.
- Este checkout contiene scripts SQL que crean triggers y activan RLS, pero no proporciona una fuente completa/canónica del estado desplegado. No inferir que un script concreto se aplicó en todos los entornos.

## 7. Seguridad y privacidad

### 7.1 Autenticación y autorización

La autenticación observada usa NextAuth 4 con proveedor Azure AD (`lib/auth.ts`) y middleware (`middleware.ts`). No se encontró uso de Supabase Auth. El código no debe cambiar unilateralmente el proveedor de identidad ni introducir un segundo proveedor; cualquier transición entre Microsoft Entra ID, NextAuth y/o Supabase Auth requiere decisión explícita y especificación/plan aprobados que contemplen sesiones, identidad, usuarios, permisos y migración.

- El middleware/proxy puede filtrar o redirigir solicitudes, pero no es la única frontera de seguridad. Cada Server Action, Route Handler y operación privilegiada debe autenticar y autorizar en servidor, según identidad, rol, recurso y acción.
- No confiar en datos de rol, identificadores, permisos o estados proporcionados por el cliente. Revalidar en servidor y aplicar mínimo privilegio.
- Mantener coherentes las reglas de autorización de la aplicación y las políticas RLS. Los bypass explícitos de middleware para cron, rutas públicas o diagnóstico requieren análisis de acceso y autenticación propia de cada endpoint; “public” no significa seguro automáticamente.
- Cambios al significado de roles, permisos, acceso cruzado entre usuarios o la autoridad de identidad requieren especificación aprobada.

### 7.2 Secretos y ejecución

- Ningún secreto, token privado, clave de servicio o credencial se incorpora al repositorio, al bundle del navegador, a respuestas HTTP ni a logs. Las variables `NEXT_PUBLIC_*` son públicas por diseño y nunca deben contener secretos.
- Las claves privilegiadas, entre ellas `SUPABASE_SERVICE_ROLE_KEY`, secretos de Entra/Graph, NextAuth y Twilio, se consumen solo en servidor y se configuran fuera del código. No leer, revelar ni copiar valores de `.env.local` en documentación o salidas.
- Validar presencia/configuración sin exponer valores. Errores y observabilidad deben evitar tokens, datos personales innecesarios y contenido sensible.
- Antes de importar una utilidad desde un Client Component, verificar que no arrastre dependencias, variables o lógica de servidor al bundle cliente.

### 7.3 Microsoft Entra ID y Microsoft Graph

Microsoft Entra ID es el proveedor configurado actualmente a través de NextAuth/Azure AD. Microsoft Graph se usa en `lib/email.ts` para obtener token mediante credenciales de aplicación y enviar correo; los secretos y tokens de esa integración deben permanecer en servidor. Los permisos concedidos deben ser los mínimos necesarios, con el alcance de buzón revisado por el responsable de identidad. Los cambios de scopes, modelo de permisos, identidad, remitente o tratamiento de destinatarios deben estar justificados y aprobados; no asumir que una respuesta de aceptación del servicio equivale a entrega final.

## 8. Dependencias y tecnologías

- Añadir una dependencia solo si hay necesidad concreta, justificada en el plan, y no existe una solución razonable con capacidades ya disponibles en el stack.
- Considerar mantenimiento, seguridad, tamaño, licencias, compatibilidad con Next/React y superficie de ejecución cliente/servidor antes de proponerla.
- Todo cambio de dependencias debe mantener sincronizados `package.json` y `package-lock.json`; evitar actualizaciones incidentales y rangos/versiones no acordados.
- Sustituir tecnologías fundamentales, incorporar infraestructura o realizar una migración mayor requiere decisión explícita y especificación aprobada. No inferir una actualización de Next.js/React por encontrarse disponible una versión nueva.

## 9. Calidad, validación y mantenimiento

- TypeScript estricto y ESLint son controles del proyecto. El código nuevo debe pasar ambos controles sin agregar supresiones evitables.
- `package.json` declara `npm run build` y `npm run lint`; no declara script de test ni de type-check. `next.config.mjs` tiene `ignoreDuringBuilds` y `ignoreBuildErrors`, así que un build satisfactorio no prueba por sí solo lint ni tipos.
- Existe configuración Jest (`jest.config.js`, `jest.setup.js`) y suite en `__tests__/`, pero no se encontró política formal de cobertura, matriz de pruebas, CI ni estrategia acordada para pruebas unitarias/integración/E2E. La estrategia de testing y el umbral requerido son decisiones pendientes: no inventar un requisito de cobertura ni afirmar que exista CI.
- Para cada cambio, validar el alcance con pruebas pertinentes si existen, lint, type-check y build según impacto y disponibilidad. Revisar manualmente el diff completo: alcance, secretos, autorización, migraciones, cambios no solicitados y coherencia con spec/plan. Informar validaciones realizadas, omitidas y fallidas; no silenciar problemas preexistentes.
- Priorizar cambios pequeños, revisables y compatibles. Preservar el comportamiento actual salvo especificación aprobada en contrario. Evitar refactors oportunistas, cambios no relacionados y arreglos de deuda fuera de alcance.
- Cuando un cambio aprobado altere el estado operativo/arquitectónico real (versiones, servicios, variables requeridas, migraciones o flujos), actualizar `MEMORY.md` de forma concisa una vez que el cambio esté validado. No registrar en memoria propuestas como si ya estuvieran desplegadas.

## 10. Decisiones fundamentales reservadas

Ningún agente puede decidir unilateralmente:

- cambios importantes de arquitectura o estructura;
- sustitución de Next.js, React, TypeScript u otra tecnología fundamental;
- cambio del proveedor de autenticación o del modelo fundamental de autorización;
- eliminación o sustitución de Supabase/PostgreSQL;
- cambios significativos del modelo de datos;
- incorporación de infraestructura nueva;
- migraciones tecnológicas mayores, incluido el salto a Next.js 16.

Requieren una decisión explícita del responsable y, si afectan comportamiento o arquitectura, una especificación y un plan aprobados antes de implementarse. La constitución no implica que esas propuestas deban ejecutarse.

## 11. Hechos observados y decisiones pendientes

La inspección de este checkout confirma `package.json`/`package-lock.json`, Next.js 14.2.16, React 18, TypeScript 5, App Router, NextAuth/Azure AD, clientes Supabase en `lib/supabase.ts` y `lib/supabase-server.ts`, Server Actions bajo `app/actions/`, rutas API, `middleware.ts`, scripts SQL bajo `scripts/`, Microsoft Graph, Twilio y Jest.

No se encontraron `supabase/README.md`, `supabase/config.toml`, migraciones en `supabase/migrations/`, `lib/supabase/`, `proxy.ts`, `eslint.config.mjs`, `next.config.ts`, `README.md`, `MEMORY.md` ni `specs/`. La configuración observada es `next.config.mjs` y `.eslintrc.json`. La ausencia de estos archivos en el checkout no demuestra que no existan recursos o configuración fuera del repositorio.

Quedan pendientes de decisión: proceso y autoridad de aprobación, clasificación de cambio funcional relevante, herramienta/ubicación y flujo de migraciones, fuente canónica del esquema por entorno, estrategia/umbral de tests, CI, formato de actualizaciones de memoria, versión objetivo de Next.js y política de transición si se decide Next 16. Hasta que se decidan, no inventar estándares ni presentarlos como prácticas actuales.
