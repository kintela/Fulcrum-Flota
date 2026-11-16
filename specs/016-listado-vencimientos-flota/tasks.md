# Tareas 016 — Listado de vencimientos de la flota

Derivadas de `spec.md` (aprobada el 2026-11-16) y `plan.md` (aprobado el 2026-11-16, §11). Los identificadores T1–T5 coinciden con los del plan.

> Nota: este archivo se creó cuando T1–T4 ya estaban implementadas y validadas, en una sola sesión y sin parar entre tareas. Las casillas reflejan el estado real en ese momento. A partir de aquí se actualiza tarea a tarea.

Comando de pruebas: `npx jest --runInBand --testEnvironment=node __tests__/listado-vencimientos`

- [x] **T1 — Lógica pura del listado** (`lib/listado-vencimientos.ts` + `__tests__/listado-vencimientos/logica.test.ts`, pruebas primero)
  RF: RF-10, RF-12, RF-14, RF-15, RF-16, RF-18, RF-19
  Hecho cuando: las pruebas de filtro por alquiler, búsqueda, ordenación (vacíos al final, empate por matrícula, cambio de sentido), plazo (ayer/hoy/+30/+31) y formato dd/mm/aaaa pasan.
  Resultado: 25/25 pruebas en verde.

- [x] **T2 — Server Action `obtenerListadoVencimientos`** (`app/actions/listado-vencimientos.ts` + `__tests__/listado-vencimientos/actions.test.ts`, pruebas primero)
  RF: RF-2, RF-4, RF-5, RF-6, RF-7, RF-8, RF-21
  Hecho cuando: sin sesión o sin rol de administrador devuelve error sin consultar datos; un administrador recibe solo la flota activa sin donantes ni coches de prueba, con asignado, seguro activo, Solred activa e ITV según los criterios de la página, sin PIN; un fallo en una consulta asociada deja ese dato vacío.
  Resultado: 8/8 pruebas en verde (33/33 en total con T1).

- [x] **T3 — Componente modal** (`components/listado-vencimientos-modal.tsx`)
  RF: RF-3, RF-4, RF-6, RF-9, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-17, RF-18, RF-19, RF-20
  Hecho cuando: el botón abre el Dialog, que carga los datos al abrirse y muestra los estados de carga y error, el filtro segmentado, el buscador, la tabla con cabeceras ordenables (`aria-sort`) y las fechas resaltadas con icono y texto accesible; `npx tsc --noEmit` y `npm run lint` no dan errores en el archivo.
  Resultado: tsc y lint sin errores en el archivo. Sin prueba automática de UI (Jest no tiene jsdom; ver plan §8).

- [x] **T4 — Integración en `/coches`** (`app/coches/page.tsx`)
  RF: RF-1, RF-2
  Hecho cuando: la página calcula `esAdmin` en servidor y renderiza el botón "Listados" en la cabecera, antes de "Quitar filtros" y "+ Nuevo Coche", con y sin filtro rápido, solo para administradores; nada más cambia en la página.
  Resultado: tsc y lint sin errores en el archivo; `npm run build` compila.

- [x] **T5 — Validación final y entrega**
  RF: todos (RF-1 a RF-21)
  Hecho cuando:
  - [x] Pruebas de `__tests__/listado-vencimientos` en verde (33/33).
  - [x] `npm run lint` sin errores ni avisos.
  - [x] `npx tsc --noEmit` sin errores en los archivos nuevos o modificados (los del resto del proyecto son preexistentes).
  - [x] `npm run build` compila.
  - [x] Demostración manual como administrador en escritorio y móvil: abrir con y sin filtro rápido, filtrar, buscar, ordenar, revisar colores con datos reales y cerrar con X, Escape y clic fuera, conservando el estado de la página.
  - [x] Comprobación manual con un usuario no administrador: el botón no aparece.
  - [x] `MEMORY.md` actualizado (línea del listado en "Flota").
  - [x] Commit, push de `feature/listados` y PR a `dev` que cierre la issue #6.

Prueba manual confirmada por el responsable el 2026-11-16.
