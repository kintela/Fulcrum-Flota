# Tareas 017 — Protección de páginas y operaciones de administración

Derivadas de `spec.md` (aprobada el 2026-11-16, con la corrección de RF-8) y `plan.md` (aprobado el 2026-11-16). Este archivo es la única fuente del estado de implementación; cada tarea se marca `[x]` solo cuando su validación ha pasado.

Comando de pruebas: `npx jest --runInBand --testEnvironment=node __tests__/permisos-admin`

- [x] **T1 — Módulo de autorización** (`lib/autorizacion.ts` + `__tests__/permisos-admin/autorizacion.test.ts`, pruebas primero)
  RF: RF-4, RF-8, RF-9, RF-11, RF-12, RF-13
  Hecho cuando: `obtenerContexto`, `requerirAdminPagina`, `autorizarAdmin` y `autorizarLecturaCoche` pasan las pruebas de: sin sesión, usuario, administrador (incluido el alias `admin`), empleado inexistente; relación por asignación permanente (id numérico y cadena), por reserva activa, con reserva no activa, con `asignadoa` en texto libre y sin relación; y redirección a `/?aviso=sin-permiso`.

- [x] **T2 — Aviso en el dashboard** (`components/aviso-sin-permiso.tsx` + `app/page.tsx`)
  RF: RF-2, RF-5
  Hecho cuando: con `?aviso=sin-permiso` el dashboard muestra "No tienes permiso para acceder a esa página", el parámetro se quita de la URL con `router.replace` y el aviso no reaparece al recargar; sin el parámetro no se muestra nada. tsc y lint sin errores en los archivos.

- [x] **T3 — Guardas en páginas de servidor** (`/coches`, `/coches/editar/[id]`, `/empleados`, `/empleados/[id]`, `/analisis`, `/tarjetas` + `__tests__/permisos-admin/paginas.test.ts`)
  RF: RF-1, RF-2, RF-3, RF-4
  Hecho cuando: cada página llama a `requerirAdminPagina()` antes de consultar datos; las pruebas verifican que un usuario es redirigido sin consultas y un administrador no; `/analisis` y `/tarjetas` redirigen ahora con aviso; `/coches` reutiliza el contexto para el botón "Listados".

- [x] **T4 — Layouts de guarda para páginas cliente** (`/coches/nuevo`, `/empleados/nuevo`, `/empleados/nuevo-empleado`, `/empleados/[id]/editar`, `/reservas`, `/admin`, `/diagnostico` + pruebas en `paginas.test.ts`)
  RF: RF-1, RF-2, RF-3
  Hecho cuando: existe un `layout.tsx` de servidor en cada segmento que llama a `requerirAdminPagina()` y renderiza `children`; las pruebas verifican la redirección de un usuario y el paso de un administrador.

- [x] **T5 — Ficha de coche en solo lectura** (`app/coches/detalle/[id]/page.tsx` + `components/viat-manager.tsx` + pruebas en `paginas.test.ts`)
  RF: RF-6, RF-7, RF-9, RF-10
  Hecho cuando: un usuario relacionado ve la ficha sin "Editar Coche" ni "Restaurar" y con "Volver al inicio"; uno no relacionado o con matrícula inexistente es redirigido con aviso antes de cargar datos; el administrador ve la ficha igual que antes; `ViatManager` solo llama a `obtenerTarjetasViat` cuando `isEditing` es `true`.

- [x] **T6 — Acciones de gestión: ITV, mantenimientos, seguros y alquileres** (`app/actions/{itvs,mantenimientos,seguros,alquileres}.ts` + `__tests__/permisos-admin/acciones.test.ts`)
  RF: RF-11, RF-12, RF-13, RF-15
  Hecho cuando: las acciones de crear, actualizar y eliminar rechazan sin sesión y sin rol con `{ success: false, error }` y sin llamar a Supabase; las de lectura por matrícula se permiten a un administrador o a un usuario relacionado y se rechazan en otro caso.

- [x] **T7 — Acciones de tarjetas: Solred, ViaT y tarjetas-admin** (`app/actions/{solred,viats,tarjetas-admin}.ts` + pruebas en `acciones.test.ts`)
  RF: RF-11, RF-12, RF-13, RF-15
  Hecho cuando: las acciones de gestión rechazan con su forma de error actual (`[]` en `obtenerTarjetasSolred`, `Error("No autorizado")` en `obtenerTarjetasViat`, `{ success: false, error }` en el resto) y sin llamar a Supabase; `obtenerTarjetaAsignada`, `obtenerTarjetaViatAsignada` y `obtenerHistorialViatCoche` se permiten solo a un administrador o a un usuario relacionado (`null`/`[]` si no).

- [x] **T8 — Resto de acciones de gestión** (`empleados`, `reservas-admin`, `coches` (baja y restauración), `notificaciones.obtenerEstadisticasNotificaciones`, `verificar-datos` y las acciones locales de `coches/nuevo`, `coches/editar/[id]`, `empleados/nuevo`, `empleados/nuevo-empleado`, `empleados/[id]/editar` + pruebas en `acciones.test.ts`)
  RF: RF-11, RF-12, RF-14, RF-15, RF-16
  Hecho cuando: todas rechazan sin sesión y sin rol con su forma de error actual (`[]`/`null` en las de consulta que ya la usan, `Error("No autorizado")` en `editarCoche`); `eliminarCoche` y `restaurarCoche` mantienen sus respuestas; las pruebas comprueban que las acciones de usuario (RF-14) y de cron (RF-16) no consultan el rol.

- [x] **T9 — Validación final y entrega**
  RF: todos (RF-1 a RF-16)
  Hecho cuando:
  - [x] Pruebas de `__tests__/permisos-admin` y `__tests__/listado-vencimientos` en verde (216 + 33 = 249).
  - [x] `npm run lint` sin errores ni avisos.
  - [x] `npx tsc --noEmit` sin errores nuevos (comparado con la versión sin cambios: 0 nuevos).
  - [x] `npm run build` compila.
  - [x] Prueba manual como usuario: URL directas a cada página de administración (redirección y aviso que desaparece al recargar), ficha de su coche en solo lectura, ficha ajena redirigida, y reservar, cancelar, finalizar, ubicar y liberar como hoy.
  - [x] Prueba manual como administrador: todo igual que antes.
  - [x] Specs retrospectivas (001–005, 007–011, 013–015) y spec/plan 016 actualizadas para reflejar la 017; `MEMORY.md` y `AGENTS.md` actualizados.
  - [x] Commit, push de `feature/permisos-admin` y PR a `dev` que cierre la issue #8.

Prueba manual confirmada por el responsable el 2026-11-16.
