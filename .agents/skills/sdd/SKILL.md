---
name: sdd
description: Úsala siempre que trabajes con Spec-Driven Development en este proyecto (docs/constitution.md o cualquier archivo dentro de specs/) - redactar, revisar o cambiar specs, planes y tareas, o implementar y validar tareas de una spec
---
# Spec-Driven Development (SDD)

## Fuentes del proyecto

- `docs/constitution.md` define la autoridad documental, las fases, aprobaciones y estructura oficial.
- `AGENTS.md` define las instrucciones operativas para los agentes.
- `MEMORY.md` resume el estado actual; verificarlo contra el código y actualizarlo solo si el estado real cambió de forma relevante.
- `templates/spec-template.md` es la única plantilla y la referencia obligatoria de los apartados de `spec.md`. Copiar su estructura completa; no sustituirla por un esquema alternativo de esta skill.

Si estas instrucciones parecen contradecir la constitución, AGENTS o la plantilla oficial, prevalecen esos documentos y debe señalarse la contradicción, no resolverla silenciosamente.

## Flujo

Contexto → Constitución → Estado actual (`MEMORY.md`) → Spec → Aprobación de spec → Plan → Aprobación de plan → Tareas (`tasks.md`) → Implementación tarea a tarea → Validación → Actualización de memoria si cambió el estado real.

- No pasar a una fase que requiera aprobación sin aprobación explícita del usuario.
- La spec aprobada define qué comportamiento se implementa. Si falta una decisión funcional, detenerse y preguntar; no inventar requisitos.
- Si cambia el alcance, actualizar primero la spec y obtener aprobación; después actualizar y aprobar el plan antes de continuar.
- Las specs se guardan en `specs/NNN-nombre-funcionalidad/spec.md`; el plan aprobado en `specs/NNN-nombre-funcionalidad/plan.md`; sus tareas en `specs/NNN-nombre-funcionalidad/tasks.md`, creado tras aprobar el plan y con cada tarea marcada `[x]` solo cuando su validación pase.
- No actualizar `MEMORY.md` tras cada fase automáticamente. Aplicar las reglas de mantenimiento de `MEMORY.md` y `docs/constitution.md`.

## Especificación

- Antes de redactar, leer `templates/spec-template.md` y reproducir todos sus encabezados y apartados, completándolos.
- No omitir secciones. Si una sección no aplica, decirlo explícitamente.
- Resolver las dudas funcionales antes de solicitar aprobación para implementación. Las dudas no resueltas deben quedar marcadas `[NECESITA ACLARACIÓN]` y bloquear aprobación si impiden determinar el comportamiento.
- La spec expresa el QUÉ y el POR QUÉ. No incluir diseño técnico, arquitectura o nombres de archivos como requisitos funcionales.
- Escribir requisitos funcionales verificables en EARS: CUANDO, SI, MIENTRAS o EL SISTEMA.
- Distinguir comportamiento existente, decisiones aprobadas y cuestiones abiertas. No convertir preferencias técnicas en requisitos.

## Plan, implementación y validación

- El plan deriva de la spec aprobada, identifica qué requisitos cubre y describe el enfoque técnico, riesgos y validación aplicable. No ampliar el alcance de la spec.
- No imponer herramientas o comandos de test que el repositorio no tenga. Seguir los comandos de validación y limitaciones descritos en `AGENTS.md` y `docs/constitution.md`.
- Implementar solo después de aprobar spec y plan. Si aparece una contradicción o cambio de alcance, parar y volver a las fases de spec/plan.
- Validar los criterios de aceptación y comunicar qué validaciones se ejecutaron y sus resultados.
