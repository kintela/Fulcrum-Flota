# Plan 016 — Listado de vencimientos de la flota

**Spec de origen:** `specs/016-listado-vencimientos-flota/spec.md`, aprobada por el responsable el 2026-11-16.
**Estado del plan:** aprobado por el responsable el 2026-11-16 (se mantiene Jest como herramienta de pruebas).
**Rama:** `feature/listados` (desde `dev`). **Issue:** #6.

## 1. Alcance
Implementar RF-1 a RF-21 de la spec 016: el botón "Listados" para administradores en `/coches`, el modal con la tabla de vencimientos (seguro, Solred, ITV), el filtro por alquiler, la búsqueda, la ordenación por columnas y el resaltado por plazos. No se modifica el esquema de base de datos, ni el comportamiento de las tarjetas de coche, los filtros rápidos o la búsqueda existentes de la página. Tampoco se añaden dependencias de producción.

## 2. Enfoque general
Se sigue el patrón existente de `components/historial-reservas-modal.tsx`: un componente cliente con el `Dialog` de `components/ui/dialog.tsx` que, al abrirse, llama a una Server Action.

1. La página `app/coches/page.tsx` (Server Component) determina en servidor si el usuario es administrador. Solo en ese caso renderiza el botón "Listados".
2. Al abrir el modal, el cliente llama a la Server Action `obtenerListadoVencimientos()`. La acción vuelve a autenticar al usuario, comprueba que sea administrador y devuelve las filas ya resueltas: matrícula, marca y modelo, persona asignada, alquiler y las tres fechas.
3. El filtro, la búsqueda, la ordenación y el cálculo del plazo se hacen en el cliente sobre esas filas, con funciones puras de un módulo `lib/` que no importa nada de servidor.

## 3. Archivos

| Archivo | Acción | Responsabilidad | RF |
|---|---|---|---|
| `lib/listado-vencimientos.ts` | Crear | Tipos (`FilaVencimiento`, `FiltroAlquiler`, `ColumnaOrden`, `EstadoPlazo`) y funciones puras: `filtrarPorAlquiler`, `coincideBusqueda`, `ordenarFilas`, `calcularEstadoPlazo(fecha, hoy)` y `formatearFecha`. Sin imports de servidor, para poder usarlo en el cliente. | RF-10, 12, 14–19 |
| `app/actions/listado-vencimientos.ts` | Crear (`"use server"`) | `obtenerListadoVencimientos()`: sesión y rol de administrador; consultas a Supabase; composición de filas; resultado `{ success, filas?, error? }`. | RF-2, 4–8, 21 |
| `components/listado-vencimientos-modal.tsx` | Crear (`"use client"`) | Botón "Listados" y `Dialog`: carga al abrir, estados de carga y error, selector de alquiler, buscador, tabla con cabeceras ordenables e indicadores de plazo. | RF-3, 4, 6, 9–20 |
| `app/coches/page.tsx` | Modificar (mínimo) | Calcular `esAdmin` con `esAdministradorPorSesion(session)` y renderizar `<ListadoVencimientosModal />` como primer elemento del grupo de botones de la cabecera, antes de "Quitar filtros" y "+ Nuevo Coche", con o sin filtro activo. Nada más cambia. | RF-1, 2 |
| `__tests__/listado-vencimientos/logica.test.ts` | Crear | Pruebas de las funciones puras. | ver §8 |
| `__tests__/listado-vencimientos/actions.test.ts` | Crear | Pruebas de la Server Action con mocks de `next-auth`, `@/lib/roles` y `@/lib/supabase-server`. | ver §8 |

## 4. Datos (solo lectura, sin cambios de esquema)
La Server Action usa `supabaseServer` (service role, solo en servidor) y reproduce los criterios que hoy aplica `getCoches` en `app/coches/page.tsx`, para cumplir "el mismo criterio que la página de coches":

- **Coches:** `coches` con `eliminado = false`; se excluyen en código `donante === true` (RF-8) y las matrículas `0000-` salvo para el usuario con la excepción actual (misma regla que `esCochePruebaOculto`).
- **Persona asignada:** mapa `empleados(id, nombre, apellidos)` y la misma resolución de `asignadoa`: número o cadena numérica → nombre o `ID: n`; texto libre → texto; vacío → sin asignar (RF-7).
- **Seguro:** `seguros` con `activo = true`, `fecha_vencimiento` por matrícula; si hay varias, gana la última del recorrido, como en la página (RF-5).
- **Solred:** `solred_coches` con `activa = true` y la relación `tarjetassolred(fechavencimiento)`. Solo se selecciona la fecha y el número, nunca el `pin` (RF-21).
- **ITV:** `itvs(matricula, fechaproximarevision, fecharevision)` ordenado por `fechaproximarevision desc, fecharevision desc`; se toma el primer registro por matrícula (RF-5).

Si falla una consulta asociada (seguro, Solred, ITV, empleados), la acción devuelve las filas con ese dato vacío y deja traza en el log del servidor. Si falla la consulta de coches, devuelve `{ success: false, error }`. El modal muestra un mensaje de error y la página de coches no se ve afectada (caso límite "fallo al obtener datos").

## 5. Seguridad
- **Doble control:** la página no renderiza el botón para quien no es administrador (RF-1), y la Server Action vuelve a comprobar sesión y rol en cada llamada (RF-2, requisito no funcional de servidor). Si no hay sesión → `"Usuario no autenticado"`; si no es administrador → `"No autorizado"`. En ninguno de los dos casos se consulta la base de datos.
- El rol se resuelve con `esAdministradorPorSesion` (`lib/roles.ts`), que lee `empleados.role` y acepta el alias legado `admin`. Es el helper existente; no se cambia el modelo de roles.
- El módulo `lib/listado-vencimientos.ts` no importa `supabase-server` ni nada con secretos, así que el bundle cliente queda limpio. El componente cliente solo importa ese módulo, la acción y componentes UI.
- La respuesta solo contiene los campos de la tabla: ni PIN, ni teléfonos ni otros datos del seguro.

## 6. Lógica cliente (pseudocódigo)
```
filas      ← resultado de la acción (al abrir; se recarga en cada apertura)
filtro     ← "todos" | "alquiler" | "no_alquiler"      (inicial "todos")
texto      ← ""                                        (se ignora el espacio al principio y al final)
orden      ← { columna: "matricula", sentido: "asc" }  (inicial)

visibles = ordenarFilas(
             filas.filter(f => filtrarPorAlquiler(f, filtro) && coincideBusqueda(f, texto)),
             orden)

coincideBusqueda: texto normalizado (minúsculas, sin acentos) contenido en
                  matrícula (también sin espacios ni guiones), marca, modelo o persona asignada

ordenarFilas(columna, sentido):
  sin valor en la columna → siempre al final (en ambos sentidos)
  fechas → comparación cronológica; textos → localeCompare("es", sensitivity "base")
  empate → matrícula asc

clic en cabecera c: si c == orden.columna → invertir sentido; si no → { c, "asc" }
El orden se mantiene al cambiar el filtro o el texto (RF-17).

calcularEstadoPlazo(fecha, hoy):
  días = diferencia en días naturales entre la fecha (AAAA-MM-DD interpretada como fecha local) y hoy (00:00 local)
  días < 0        → "vencida"  (rojo + icono de alerta)
  0 ≤ días ≤ 30   → "proxima"  (ámbar + icono de reloj)
  días > 30       → "normal"
```
`hoy` se inyecta como parámetro para poder probarlo. Las fechas `AAAA-MM-DD` se interpretan como fecha local y no con `new Date(string)` (que las toma como UTC), para que no cambie el día por el desfase horario.

## 7. Interfaz
- **Botón:** estilo de los botones de la cabecera (`px-4 py-2 rounded-md`), color neutro distinto del azul de "+ Nuevo Coche", con el icono `ListChecks` de `lucide-react` (ya es dependencia) y el texto "Listados".
- **Modal:** `DialogContent` ancho (`max-w-6xl`), alto máximo con desplazamiento interno. Título "Listado de vencimientos" y una descripción breve. Cierre con la X, Escape o clic fuera: ya lo hace el Dialog de Radix (RF-20).
- **Controles sobre la tabla:** un selector segmentado de tres botones (Todos / Alquiler / No alquiler) y un `input` de búsqueda con el icono `Search`, con el mismo estilo que el buscador de la página. Se muestra un contador "N vehículos".
- **Tabla:** los componentes de `components/ui/table.tsx`, dentro de un contenedor con `overflow-x-auto` para móvil. Columnas: Matrícula · Modelo · Asignado a · Seguro · Solred · ITV. Las cabeceras son botones con un icono de sentido (`ArrowUp`/`ArrowDown`/`ArrowUpDown`) y `aria-sort`.
- **Celdas de fecha:** `dd/mm/aaaa`; vencida en `text-red-600 font-semibold` con `AlertTriangle`; próxima en `text-amber-600 font-semibold` con `Clock`; las dos con un `title`/`aria-label` en texto ("Vencida", "Vence en N días"). Celdas sin dato en gris cursiva: "Sin seguro", "Sin tarjeta", "Sin datos", "Sin asignar".
- **Estados:** "Cargando…" mientras llega la respuesta; mensaje de error si `success: false`; "No hay vehículos que coincidan" si no queda ninguna fila (RF-13).

## 8. Validación

**Limitación detectada (preexistente):** `jest.config.js` usa `testEnvironment: "jest-environment-jsdom"`, pero el paquete no está en `package.json` ni en `node_modules`. Hoy ninguna suite de Jest arranca con la configuración por defecto. Las pruebas de lógica pura sí pasan forzando el entorno node (comprobado con `__tests__/coches/busqueda-libre.test.ts --testEnvironment=node`). Este plan no añade dependencias ni corrige esa configuración: queda fuera de alcance y requiere tu autorización (ver §10).

Estrategia:
- **Pruebas automatizadas** en entorno node, sin dependencias nuevas. Se ejecutan con `npx jest --runInBand --testEnvironment=node __tests__/listado-vencimientos`. El flag es obligatorio: Jest valida el entorno de `jest.config.js` antes de leer el docblock `@jest-environment node` de cada archivo. Las pruebas importan `@jest/globals` para no depender de `@types/jest`, que no está instalado.
  - `logica.test.ts`: filtro por alquiler (RF-10); búsqueda por matrícula con y sin guion, marca, modelo y persona, sin mayúsculas ni acentos, con espacios alrededor, combinada con el filtro (RF-12); orden inicial y por cada columna asc/desc, filas sin dato al final en ambos sentidos, empate por matrícula (RF-14–16); plazo: ayer → vencida, hoy → próxima, +30 → próxima, +31 → normal (RF-18); formato `dd/mm/aaaa` sin desfase de día (RF-19).
  - `actions.test.ts`: sin sesión → error y sin consultas; usuario no administrador → `"No autorizado"` y sin consultas (RF-2); administrador → excluye bajas, donantes y matrículas `0000-`, resuelve el asignado, toma el seguro activo, la Solred activa y la ITV según el criterio, y no devuelve el PIN (RF-4–8, 21); fallo en una consulta asociada → filas con ese dato vacío.
- **Sin prueba automatizada (requiere jsdom):** RF-1, RF-3, RF-9, RF-11, RF-13, RF-17 y RF-20 en el componente. Se cubren con la demo manual.
- **Demo manual** con `npm run dev`, en escritorio y en vista móvil: como administrador, abrir "Listados" en la vista principal y con un filtro rápido activo, filtrar, buscar, ordenar varias columnas, comprobar los colores con datos reales, cerrar con X, Escape y clic fuera, y verificar que la página conserva su filtro y su búsqueda. Como usuario no administrador, comprobar que no aparece el botón.
- **Controles:** `npm run lint`, `npx tsc --noEmit` y `npm run build`. Se informará de errores preexistentes sin corregirlos.

## 9. Decisiones técnicas
- **Carga diferida con Server Action, en vez de calcular las filas en la página y pasarlas como props.** Así se evitan cinco consultas extra en cada carga de `/coches`, aunque nadie abra el modal; los datos nunca llegan al HTML de quien no es administrador, y se sigue un patrón que ya existe en el repo. Coste: un pequeño tiempo de carga al abrir el modal.
- **Filtrado, búsqueda y orden en el cliente.** El volumen es una flota de empresa (decenas o pocos cientos de filas), así que no compensa paginar ni consultar en servidor en cada pulsación.
- **Reproducir los criterios de `getCoches` en la acción, en vez de extraerlos a un helper compartido y modificar la página.** Extraerlos sería un refactor del listado existente, fuera de alcance según `AGENTS.md`. El riesgo de que los dos criterios se separen con el tiempo se mitiga con las pruebas de §8 y con un comentario que remite a la página. Si en el futuro se quiere unificar, será un cambio aparte.
- **Búsqueda propia (`coincideBusqueda`) en vez de reutilizar `coincideBusquedaLibre`.** Esta última busca también por PIN, teléfonos y otros campos que no están en el listado. Se reutiliza su misma normalización (minúsculas, sin acentos, matrícula compacta), copiada en el módulo nuevo para no cambiar `lib/coches-busqueda.ts`.
- **Selector segmentado en vez de `Select` de Radix.** Las tres opciones quedan visibles con un solo clic y funcionan mejor en móvil. Ambos son UI existente; ninguno añade dependencias.

## 10. Riesgos, compatibilidad y reversión
- **Compatibilidad:** el único archivo existente que se modifica es `app/coches/page.tsx`, con una consulta extra de rol por carga (la misma que ya hacen otras pantallas) y un componente añadido. Para quien no es administrador, la página no cambia.
- **Rendimiento:** la consulta de rol añade una lectura a `empleados` por cada carga de `/coches`. El listado solo consulta al abrir el modal.
- **Datos incoherentes** (varios seguros o Solred activos): se muestra un único valor, el mismo que en la página (caso límite de la spec).
- **Excepción de coches de prueba:** depende de un email fijo en `page.tsx` que la acción tendrá que replicar. Se documenta en el código remitiendo a la regla de la página (duda abierta de la spec 003).
- **Jest sin jsdom:** limita la cobertura automática de la interfaz (ver §8). Si quieres, la instalación de `jest-environment-jsdom` como devDependency puede ir en un cambio de mantenimiento aparte, con tu autorización.
- **Reversión:** basta con revertir el commit o los commits de la rama. No hay migraciones ni datos que restaurar.

## 11. Tareas
El desglose en tareas (T1–T5), los RF que cubre cada una, su criterio "Hecho cuando:" y su estado `[x]`/`[ ]` están en [`tasks.md`](tasks.md), que es la única fuente del estado de implementación.

`MEMORY.md` solo se actualizará al final si el estado funcional cambia (se añadirá la mención del listado de vencimientos en "Flota").
