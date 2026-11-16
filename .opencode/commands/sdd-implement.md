---
description: SDD · Implementa UNA tarea, tests primero (uso - /sdd-implement 002-nombre T3)
agent: build
---

Implementa EXCLUSIVAMENTE la tarea $2 definida en `specs/$1/tasks.md`.

## Comprobación previa obligatoria

Antes de escribir o modificar archivos:
- Comprueba que `$2` identifica exactamente una tarea existente en
  `specs/$1/tasks.md`.
- Si la tarea está marcada `[x]`, DETENTE: ya está completada. No repitas su
  implementación ni cambies su checkbox; informa al usuario.
- Si la tarea está marcada `[ ]`, confirma que sus dependencias anteriores
  están completadas. Si no lo están, DETENTE e informa cuáles faltan; no las
  implementes como parte de esta invocación.
- Si el identificador no existe o es ambiguo, DETENTE y pide el identificador
  correcto.
- Trata las demás tareas, especialmente las ya marcadas `[x]`, como fuera de
  alcance. No las reabras, reescribas ni modifiques sus archivos salvo que sea
  imprescindible para la tarea solicitada; en ese caso, detente y explica el
  bloqueo antes de editar.

Antes de modificar código:
- Lee `specs/$1/spec.md`.
- Lee `specs/$1/plan.md`.
- Lee `specs/$1/tasks.md`.
- Lee `docs/constitution.md`.
- Aplica la skill `sdd`.
- Identifica los RF que cubre la tarea $2.

## Proceso obligatorio

1. Implementa SOLO la tarea $2. No implementes trabajo perteneciente a tareas posteriores.

2. Sigue TDD:
   - Escribe primero los tests necesarios para $2.
   - Ejecuta los tests y confirma que fallan por la funcionalidad aún no implementada.
   - Implementa el código mínimo necesario para hacerlos pasar.
   - Ejecuta nuevamente los tests.

3. Valida la implementación ejecutando:
   - Los tests afectados.
   - `node --test` cuando corresponda.
   - `npx tsc --noEmit`.
   - El lint definido por el proyecto.

4. Si alguna validación falla, corrige únicamente aquello relacionado con $2.

5. Cuando todas las validaciones sean correctas:
   - Marca únicamente $2 como completada en `specs/$1/tasks.md`.
   - Indica junto a la tarea qué RF cubre, si no estuviera ya indicado.

6. Al finalizar, informa brevemente de:
   - Tarea implementada.
   - Archivos creados/modificados.
   - Tests añadidos.
   - RF cubiertos.
   - Resultado de las validaciones.

## Restricciones

- NO implementes ninguna otra tarea.
- NO anticipes código necesario únicamente para tareas posteriores.
- NO cambies la arquitectura definida en `plan.md`.
- NO añadas funcionalidad que no esté respaldada por `spec.md`.
- Si para implementar $2 es imprescindible modificar algo fuera de su alcance, DETENTE y explica el bloqueo.
- Si los tests no pueden escribirse o ejecutarse, DETENTE y explica el motivo.
- NO marques la tarea como completada si alguna validación requerida falla.

Después de completar $2, PÁRATE. No empieces la siguiente tarea.
