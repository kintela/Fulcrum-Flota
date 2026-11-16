# Spec 014 — Panel operativo
## Contexto y objetivo
Esta especificación retrospectiva registra la información agregada y accesos rápidos que el panel principal presenta para apoyar la consulta diaria de la flota y sus actividades próximas.
## Usuarios / actores
- Usuario autenticado que accede al panel.
- Administradores, cuyos datos o alertas pueden tener tratamiento diferenciado.
- Dominios de vehículos, reservas, ITV, mantenimiento, seguros y alquileres que aportan información.
## Historias de usuario
- H1: Como usuario quiero consultar un resumen de la situación de flota para acceder a información operativa desde un punto común.
- H2: Como usuario quiero acceder desde el panel a los registros o vistas relacionados con los elementos resumidos.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO se carga el panel, EL SISTEMA consulta y presenta los indicadores y listados que el panel actual obtiene de sus fuentes disponibles.
- RF-2: CUANDO hay reservas futuras, EL SISTEMA presenta el subconjunto y ordenamiento aplicados por el panel.
- RF-3: CUANDO hay elementos próximos o vencidos de dominios con alertas en el panel, EL SISTEMA los presenta conforme a las reglas de selección actuales.
- RF-4: CUANDO falla una consulta de un dominio, EL SISTEMA muestra el resultado parcial o error que el panel actual implementa.
- RF-5: CUANDO el usuario selecciona un acceso del panel, EL SISTEMA navega a la vista configurada para ese acceso.
## Requisitos no funcionales
- El panel observado está en español. No se encontró requisito de frescura de datos ni latencia cuantificado.
## Casos límite
- Sin datos para uno o varios indicadores.
- Fuentes parcialmente disponibles o errores de consulta.
- Diferencias de acceso/datos por rol aún no consolidadas como política funcional.
## Fuera de alcance
- Reglas maestras de cada dominio (003, 005, 008–011).
- Informes históricos y análisis estadístico (015).
- Nuevos indicadores o rediseño del panel no evidenciados.
## Criterios de finalización
- Contrastar indicadores, filtros, ordenamientos, navegación y errores parciales con el panel desplegado.
- Confirmar qué consultas son funcionales y cuáles son solo diagnósticas antes de incluirlas como requisitos.
## Dudas abiertas
- [NECESITA ACLARACIÓN] ¿Qué indicadores y umbrales se consideran contractuales y cuáles son meramente informativos?
- [NECESITA ACLARACIÓN] ¿Cuál es la frescura esperada de datos del panel?
- [NECESITA ACLARACIÓN] ¿Qué diferencias de panel o visibilidad corresponden a cada rol?
- [NECESITA ACLARACIÓN] ¿Qué comportamiento se espera ante fallo parcial de fuentes?
