# Plan 017 — Protección de páginas y operaciones de administración

**Spec de origen:** `specs/017-permisos-administrador/spec.md`, aprobada el 2026-11-16 (con la corrección de RF-8 aprobada el mismo día).
**Estado del plan:** aprobado por el responsable el 2026-11-16.
**Rama:** `feature/permisos-admin` (desde `dev`). **Issue:** #8.

## 1. Alcance
Implementar RF-1 a RF-16:
- protección por rol de las páginas de administración, con redirección y aviso;
- ficha de coche en solo lectura para los usuarios relacionados con el coche;
- control de sesión y rol en las Server Actions de gestión.

No se tocan los endpoints `/api`, el middleware, el menú, RLS ni el esquema, y no se añaden dependencias.

## 2. Enfoque general
1. **Un único módulo de autorización en servidor** (`lib/autorizacion.ts`). Resuelve el empleado y su rol vigente a partir del email de la sesión, consultando `empleados` en cada llamada (RF-4). Ofrece tres guardas:
   - `requerirAdminPagina()`: para páginas; redirige con aviso.
   - `autorizarAdmin()`: para acciones; devuelve un resultado que la acción traduce a su forma de error.
   - `autorizarLecturaCoche(matricula)`: admin o usuario relacionado según RF-8.
2. **Páginas:**
   - Las que son Server Components llaman a la guarda al principio de la función de página.
   - Las que son Client Components (`"use client"`) reciben un `layout.tsx` de servidor en su propio segmento que llama a la guarda. Ese layout no tiene subsegmentos, así que se ejecuta en cada entrada a la página.
3. **Ficha de coche:** la página comprueba la relación antes de cargar datos. Para quien no es administrador, oculta las acciones de cabecera y los gestores siguen con `isEditing={false}`, como hoy.
4. **Server Actions:** cada acción de gestión llama a la guarda en su primera línea. Si se rechaza, devuelve el error con la forma que ya usa esa acción (RF-15). Las de consulta que necesita la ficha usan `autorizarLecturaCoche`. Las acciones de usuario (RF-14) y las invocadas por cron (RF-16) no se tocan.
5. **Aviso:** las guardas redirigen a `/?aviso=sin-permiso`. Un componente cliente en el dashboard muestra el aviso y limpia el parámetro de la URL con `router.replace`, para que no vuelva a salir al recargar (RF-5).

## 3. Clasificación de páginas (RF-1, RF-2, RF-6, RF-9)

| Página | Tipo | Dónde va la guarda |
|---|---|---|
| `/coches` | Server | `app/coches/page.tsx` |
| `/coches/nuevo` | Client | nuevo `app/coches/nuevo/layout.tsx` |
| `/coches/editar/[id]` | Server | `app/coches/editar/[id]/page.tsx` |
| `/coches/detalle/[id]` | Server | `app/coches/detalle/[id]/page.tsx`, con regla de lectura (§5) |
| `/empleados` | Server | `app/empleados/page.tsx` |
| `/empleados/[id]` | Server | `app/empleados/[id]/page.tsx` |
| `/empleados/[id]/editar` | Client | nuevo `app/empleados/[id]/editar/layout.tsx` |
| `/empleados/nuevo` | Client | nuevo `app/empleados/nuevo/layout.tsx` |
| `/empleados/nuevo-empleado` | Client | nuevo `app/empleados/nuevo-empleado/layout.tsx` |
| `/reservas` | Client | nuevo `app/reservas/layout.tsx` (segmento sin subpáginas) |
| `/admin` | Client | nuevo `app/admin/layout.tsx` |
| `/diagnostico` | Client | nuevo `app/diagnostico/layout.tsx` |
| `/analisis` | Server | sustituir su `redirect("/")` actual por la guarda (añade el aviso) |
| `/tarjetas` | Server | ídem |

La guarda se ejecuta antes de cualquier consulta de la página, así que no se consultan datos para quien no tiene permiso (RF-2). Para `/coches` (página del listado, spec 016) se reutiliza el resultado de la guarda en vez de llamar otra vez a `esAdministradorPorSesion`.

## 4. Clasificación de Server Actions

**Solo administrador** (`autorizarAdmin`; RF-11, RF-12):

| Módulo | Acciones | Forma del rechazo (RF-15) |
|---|---|---|
| `alquileres` | `crearAlquiler`, `actualizarAlquiler`, `eliminarAlquiler` | `{ success: false, error }` |
| `itvs` | `crearITV`, `actualizarITV`, `eliminarITV` | `{ success: false, error }` |
| `mantenimientos` | `crearMantenimiento`, `actualizarMantenimiento`, `eliminarMantenimiento` | `{ success: false, error }` |
| `seguros` | `crearSeguro`, `actualizarSeguro`, `eliminarSeguro` | `{ success: false, error }` |
| `solred` | `obtenerTarjetasSolred`, `asignarTarjetaSolred`, `desasignarTarjetaSolred`, `crearTarjetaSolred` | `[]` en `obtenerTarjetasSolred` (su retorno de error actual); `{ success: false, error }` en el resto |
| `viats` | `obtenerTarjetasViat`, `asignarTarjetaViat`, `desasignarTarjetaViat`, `crearTarjetaViat` | `obtenerTarjetasViat` lanza `Error("No autorizado")`, como ya hace en sus errores; el resto, `{ success: false, error }` |
| `tarjetas-admin` | las 8 acciones | `{ success: false, error }` |
| `empleados` | `obtenerEmpleados`, `obtenerEmpleadoPorId` | `[]` / `null` (su retorno de error actual) |
| `reservas-admin` | `obtenerReservasTemporales`, `obtenerAsignacionesPermanentes` (ya piden sesión; se añade rol) | `{ success: false, error }` |
| `coches` | `eliminarCoche`, `restaurarCoche` (ya comprueban rol; se migran a la guarda común sin cambiar su respuesta) | `{ success: false, error }` |
| `notificaciones` | `obtenerEstadisticasNotificaciones` (sin consumidores de cron) | `{ success: false, error }` |
| `verificar-datos` | `verificarDatos` (sin consumidores) | `{ success: false, error }` |
| `coches/nuevo/actions` | `crearCoche` | `{ success: false, error }` |
| `coches/editar/[id]/actions` | `editarCoche` | lanza `Error("No autorizado")`, como en sus errores actuales |
| `empleados/nuevo/actions`, `empleados/nuevo-empleado/actions` | `crearEmpleado` | `{ success: false, error }` |
| `empleados/[id]/editar/actions` | `editarEmpleado`; `obtenerEmpleado` | `{ success: false, error }`; `null` |

**Lectura de un coche: administrador o usuario relacionado** (`autorizarLecturaCoche(matricula)`; RF-13). Son las que cargan los gestores de la ficha:
- `itvs.obtenerITVsPorMatricula`, `mantenimientos.obtenerMantenimientosPorMatricula`, `alquileres.obtenerAlquileresPorMatricula`, `seguros.obtenerSeguroActivo`, `seguros.obtenerHistorialSeguros` → `{ success: false, error }`.
- `solred.obtenerTarjetaAsignada`, `viats.obtenerTarjetaViatAsignada`, `viats.obtenerHistorialViatCoche` → `null` / `[]` (su retorno de error actual).

**Sin cambios:**
- **De usuario (RF-14):** todo `reservas-temporales` (incluidos `obtenerHistorialReservasPorMatricula` y `verificarDisponibilidad`, que usa el mapa del dashboard), `reservas.reservarCoche` y `reservas.liberarCoche` (ya tiene regla propia, spec 004), `ubicacion.*`, `coches.obtenerFichaCoche` (la usa "Mis reservas") y `listado-vencimientos` (ya protegido).
- **De cron (RF-16):** `verificarReservasVencidas`, `verificarReservasVencidasV2`, `verificarAlertasITV`, `verificarAlertasMantenimiento`, `activarReservasPendientes`. Solo los invocan Route Handlers de `/api/cron`, `/api/public`, `/api/debug`, `/api/test` y `/api/diagnostico`. Su protección corresponde a la spec de `/api`.

## 5. Módulo de autorización (`lib/autorizacion.ts`, solo servidor)
```
obtenerContexto():
  session ← getServerSession(authOptions)
  email ← session?.user?.email normalizado (minúsculas, sin espacios)
  si no hay email → { autenticado: false }
  empleado ← empleados.select("id, role, email").ilike("email", email)
             y se toma la fila cuyo email normalizado == email          // rol vigente (RF-4)
             (ilike porque los emails guardados pueden tener mayúsculas, como ya
              asume validarAdmin en tarjetas-admin; la comparación exacta evita
              que los comodines _ y % casen con otro email)
  esAdmin ← parseRolUsuario(empleado?.role) == administrador   // acepta el alias legado "admin"
  → { autenticado: true, email, empleadoId: empleado?.id ?? null, esAdmin }
  (empleado inexistente o sin rol reconocible → esAdmin = false; caso límite)

requerirAdminPagina():
  ctx ← obtenerContexto()
  si !ctx.esAdmin → redirect("/?aviso=sin-permiso")
  → ctx

autorizarAdmin():
  ctx ← obtenerContexto()
  si !ctx.autenticado → { ok: false, error: "Usuario no autenticado" }
  si !ctx.esAdmin     → { ok: false, error: "No autorizado" }
  → { ok: true, ctx }

estaRelacionadoConCoche(empleadoId, matricula):          // RF-8
  coche ← coches.select("asignadoa").eq("matricula", matricula).maybeSingle()
  (a) asignadoa es número o cadena numérica y == empleadoId → true
  (b) reservas.select("id").eq("matricula", matricula).eq("empleado_id", empleadoId).eq("estado", "activa").limit(1) → hay fila → true
  → false

autorizarLecturaCoche(matricula):
  ctx ← obtenerContexto()
  si !ctx.autenticado → { ok: false, error: "Usuario no autenticado" }
  si ctx.esAdmin → { ok: true, ctx }
  si ctx.empleadoId == null o !estaRelacionadoConCoche(ctx.empleadoId, matricula) → { ok: false, error: "No autorizado" }
  → { ok: true, ctx }
```
- Las matrículas se comparan con el mismo valor que usa la ficha (`eq("matricula", params.id)`), sin normalizaciones nuevas (caso límite de formato).
- Un `asignadoa` en texto libre no coincide con ningún id y no cuenta por (a).
- En la ficha, el error "No autorizado" y la matrícula inexistente se tratan igual para quien no es administrador: redirección con aviso (RF-9). Así no se revela si la matrícula existe.
- El módulo usa `supabaseServer` y `next/navigation`, así que solo se importa desde código de servidor (páginas, layouts y acciones).

## 6. Ficha de coche (`app/coches/detalle/[id]/page.tsx`)
1. Al inicio: `ctx = obtenerContexto()`. Si no es administrador y `autorizarLecturaCoche(params.id)` falla → `redirect("/?aviso=sin-permiso")`. Se hace antes de `getCoche`.
2. Si no es administrador:
   - no se renderizan "Editar Coche" ni `RestoreCocheButton`;
   - los enlaces "Volver a Coches" y "Volver a coches dados de baja" apuntan a `/` con el texto "Volver al inicio";
   - los gestores siguen con `isEditing={false}`, que ya oculta añadir, editar, borrar y subir en Fotos, ITV (incluidos sus documentos), Mantenimiento, Seguro, ViaT y Alquiler.
3. Para el administrador no cambia nada (RF-6).
4. `components/viat-manager.tsx`: hoy llama a `obtenerTarjetasViat` (lista de todas las tarjetas, usada para el selector de asignación) aunque `isEditing` sea `false`. Como pasa a ser solo de administrador, solo se llamará cuando `isEditing` sea `true`. En modo lectura se cargan únicamente la tarjeta asignada y el historial, que es lo que se muestra.
5. La sección Solred de la ficha se carga en la propia página con `supabaseServer`; queda cubierta por la comprobación del paso 1.

**Fuera de este plan, aunque afecta a la ficha:** las fotos se leen desde el cliente con el cliente Supabase anónimo (`lib/storage.ts`) y los documentos ITV con `/api/itv-documentos`. Ninguno de los dos pasa por Server Actions, así que siguen como hoy y quedan para la spec de `/api` y Storage.

## 7. Aviso en el dashboard (RF-2, RF-5)
- **Nuevo `components/aviso-sin-permiso.tsx`** (`"use client"`):
  - lee `useSearchParams()`;
  - si `aviso === "sin-permiso"`, muestra un `Alert` (de `components/ui/alert.tsx`) con "No tienes permiso para acceder a esa página" y un botón para cerrarlo;
  - a la vez ejecuta `router.replace("/", { scroll: false })` para quitar el parámetro: al recargar o navegar ya no aparece, y solo sale en la pestaña redirigida.
- **`app/page.tsx`:** renderiza `<AvisoSinPermiso />` dentro de un `Suspense` (necesario para `useSearchParams` en App Router), encima de `DashboardClient`. El dashboard no cambia en nada más.

## 8. Archivos

| Archivo | Acción | RF |
|---|---|---|
| `lib/autorizacion.ts` | Crear: contexto, guardas y relación con el coche | 2, 4, 8, 9, 11–13 |
| `components/aviso-sin-permiso.tsx` | Crear | 2, 5 |
| `app/page.tsx` | Añadir el aviso | 2, 5 |
| 8 páginas Server (§3) | Añadir la guarda (o sustituir el `redirect` en `/analisis` y `/tarjetas`) | 1–3, 6, 7, 9 |
| 7 `layout.tsx` nuevos (§3) | Guarda para páginas cliente | 1–3 |
| `components/viat-manager.tsx` | Cargar la lista de tarjetas solo en edición | 7, 13 |
| 13 archivos de acciones (§4) | Añadir la guarda en las acciones listadas | 11–13, 15 |
| `__tests__/permisos-admin/*.test.ts` | Crear pruebas (§10) | todos |

## 9. Decisiones técnicas
- **Rol consultado en la BD en cada petición, no tomado de `session.user.role`** (que viene del JWT). RF-4 pide el rol vigente; el rol del JWT no se refresca hasta el siguiente inicio de sesión. Coste: una lectura de `empleados` por página o acción protegida, la misma que ya hacen `esAdministradorPorSesion` y varias acciones.
- **Guardas explícitas por página y acción, sin reglas por ruta en `middleware.ts`.** El middleware se ejecuta en el edge sin acceso cómodo a Supabase con service role. Además, la constitución (§7.1) pide autorizar cada operación en servidor. Comprobar en el middleware se descarta también porque tocaría las excepciones de `/api`, que quedan fuera de alcance.
- **Layouts de segmento para páginas cliente, en vez de convertirlas en Server Components.** Así no se toca el código de esas páginas. Al ser segmentos hoja, el layout se ejecuta en cada entrada.
- **No reutilizar `esAdministradorPorSesion`** (`lib/roles.ts`) como guarda general. Devuelve solo un booleano y no distingue "sin sesión" de "sin rol", que RF-11 y RF-12 separan. Se deja tal cual para sus consumidores actuales.
- **Rechazo con la forma de error de cada acción** (RF-15), en vez de lanzar siempre. Las pantallas existentes ya saben mostrar esos errores.

## 10. Validación
- **Pruebas automatizadas** (Jest con `--testEnvironment=node` e `@jest/globals`, como en la spec 016; mocks de `next-auth/next`, `next/navigation`, `@/lib/supabase-server`):
  - `autorizacion.test.ts`:
    - sin sesión, usuario y admin (también el alias `admin`), y empleado inexistente;
    - relación por asignación permanente (id numérico y cadena), por reserva activa, con reserva no activa, con `asignadoa` en texto libre y sin relación;
    - `requerirAdminPagina` redirige a `/?aviso=sin-permiso`.
  - `paginas.test.ts`: para cada página Server y cada layout nuevo, un usuario es redirigido sin que se consulten datos y un administrador no; ficha propia, ajena e inexistente para un usuario.
  - `acciones.test.ts`:
    - para todas las acciones de §4 "Solo administrador": rechazo sin sesión y sin rol, con la forma correcta y sin llamadas a Supabase;
    - para las de "Lectura de un coche": permitido si hay relación y rechazado si no;
    - las acciones de usuario y de cron no consultan el rol.
  - Las pruebas de 016 siguen en verde.
- **Prueba manual:**
  - como usuario: URL directas a cada página de §3 (redirección y aviso, que desaparece al recargar), ficha de su coche (solo lectura, sin "Editar", vuelve al inicio), ficha ajena (redirección), y reservar, cancelar, finalizar, ubicar y liberar como hoy;
  - como administrador: todo igual que antes, incluida la edición en la ficha y en `/coches/editar`.
- **Controles:** `npm run lint`, `npx tsc --noEmit` (sin errores en archivos tocados), `npm run build`.

## 11. Riesgos, compatibilidad y reversión
- **Pantalla de usuario no detectada que use una acción que pasa a ser de administrador:** se rompería para usuarios. Mitigación: el inventario de §4 se hizo por importaciones en `app/` y `components/`; la prueba manual como usuario recorre todos sus flujos; y el rechazo devuelve un error legible, no una caída.
- **Un administrador degradado sigue viendo una página ya cargada** hasta que navega o recarga. Cualquier acción que lance se rechaza en servidor.
- **Rendimiento:** una consulta extra a `empleados` (y, en la ficha de usuario, a `coches` y `reservas`) por petición protegida. Es despreciable para el volumen de la flota.
- **`/api` sigue abierta** (incluidas las rutas que invocan las acciones de cron y `/api/itv-documentos`): es conocido y está fuera de alcance; irá en la spec siguiente.
- **Spec 004 retrospectiva:** su RF-1 dice que cualquier usuario autenticado consulta las asignaciones permanentes. Con la 017, `obtenerAsignacionesPermanentes` pasa a ser solo de administrador (solo la usa `/reservas`). La 017 aprobada prevalece como cambio; al cerrar, se anotará en la 004 que ese RF quedó modificado por la 017.
- **Reversión:** basta con revertir los commits de la rama. No hay migraciones.

## 12. Tareas
El desglose en tareas (T1–T9), con sus RF, su "Hecho cuando:" y su estado `[x]`/`[ ]`, está en [`tasks.md`](tasks.md), que es la única fuente del estado de implementación.
