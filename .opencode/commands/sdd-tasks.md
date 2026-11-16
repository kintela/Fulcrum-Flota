---
description: SDD · Crea o actualiza tareas pequeñas y verificables
agent: plan
---

Lee `docs/constitution.md`, `AGENTS.md`, `MEMORY.md` si existe,
`.agents/skills/sdd/SKILL.md`, `$1/spec.md`, `$1/plan.md` y, si existe,
`$1/tasks.md`.

Si la spec o el plan no están aprobados, tienen dudas abiertas que impiden
determinar el comportamiento o contradicen una fuente de mayor autoridad,
detente y avísame; no generes ni actualices tareas.

Comprueba si `$1/tasks.md` ya existe:
- Si no existe, créalo con el desglose completo derivado de la spec y el plan
  aprobados.
- Si existe, actualiza ese mismo archivo; no crees otro archivo de tareas ni
  reemplaces el contenido existente a ciegas. Conserva secciones y tareas que
  sigan siendo válidas, sus identificadores y el estado de sus casillas.
  Añade las tareas necesarias para cubrir requisitos o cambios nuevos del plan,
  asignándoles identificadores consecutivos posteriores al último existente.
  No dupliques tareas ya cubiertas. Si una tarea completada quedó obsoleta por
  un cambio aprobado de alcance, consérvala como registro de lo completado y
  añade una tarea nueva para el trabajo pendiente; no la desmarques ni reescribas
  como si hubiera cubierto el requisito nuevo. Ajusta tareas incompletas solo
  cuando sea necesario para alinearlas con los documentos aprobados.

- Tareas pequeñas (máx. 20–30 min cada una), en orden de dependencia.
- Cada una con los RF que cubre y una línea "Hecho cuando:" verificable.
- Checkboxes.
- Intenta que no sean más de 10; si salen más, propón dividir la spec.

No amplíes el alcance aprobado ni escribas código, pruebas o migraciones.
Al terminar, resume si creaste o actualizaste `$1/tasks.md`, qué tareas
añadiste/ajustaste y cómo preservaste las tareas ya completadas.
