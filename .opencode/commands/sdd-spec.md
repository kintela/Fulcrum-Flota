---
description: SDD · Crea o actualiza el plan técnico de una spec aprobada
agent: plan
---
Lee docs/constitution.md, AGENTS.md, MEMORY.md si existe y
specs/$1/spec.md. Usa la skill sdd.

Si la spec no está aprobada, tiene dudas abiertas que impiden determinar el
comportamiento o contradice una fuente de mayor autoridad, detente y avísame;
no generes ni actualices el plan.

Comprueba si specs/$1/plan.md ya existe:
- Si no existe, crea un plan técnico nuevo derivado exclusivamente de la spec
  aprobada.
- Si existe, léelo completo y actualízalo para alinearlo con la spec aprobada.
  Conserva las decisiones y contenido vigentes que sigan siendo válidos; cambia
  solo lo necesario, elimina contradicciones con la spec y señala los impactos
  del cambio de alcance. No reemplaces el plan a ciegas ni descartes contenido
  ajeno al cambio solicitado.

En ambos casos, el plan debe incluir alcance, archivos que se crearán o
modificarán y responsabilidad de cada uno, enfoque de datos/migraciones y
seguridad cuando aplique, algoritmo en pseudocódigo si aporta claridad,
presentación de interfaz cuando aplique, decisiones técnicas justificadas con
alternativas relevantes, riesgos/compatibilidad/reversión y estrategia de
validación aplicable. Marca qué RF cubre cada parte y no amplíes el alcance.

NO escribas código de aplicación, pruebas ni migraciones. Al terminar, resume
si creaste o actualizaste el plan y qué cambió; deja explícito que el plan
requiere aprobación antes de implementar.
