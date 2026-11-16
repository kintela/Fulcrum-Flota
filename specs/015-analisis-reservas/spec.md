# Spec 015 — Análisis de reservas
## Contexto y objetivo
Esta especificación retrospectiva describe las vistas analíticas de reservas que agregan registros históricos para mostrar métricas y tendencias. Se limita a consultas e indicadores evidenciados, sin definir métricas nuevas.
## Usuarios / actores
- Usuario de la aplicación con acceso a la sección de análisis.
- Administrador u otro rol que puede tener acceso diferenciado: pendiente de confirmar.
- Registros históricos de reservas y empleados como fuentes de datos.
## Historias de usuario
- H1: Como usuario autorizado quiero consultar métricas y tendencias de reservas para entender el uso registrado de los vehículos.
- H2: Como usuario quiero filtrar el análisis por los criterios disponibles para explorar los datos mostrados.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO se abre el análisis, EL SISTEMA consulta los datos de reserva que usa la vista actual y calcula las métricas implementadas.
- RF-2: CUANDO el usuario cambia un filtro disponible, EL SISTEMA actualiza las métricas/listados con el subconjunto que aplica actualmente.
- RF-3: CUANDO hay datos suficientes, EL SISTEMA presenta las agrupaciones, ordenamientos y visualizaciones disponibles en la interfaz.
- RF-4: SI no hay registros o falla la consulta, ENTONCES EL SISTEMA presenta el estado vacío o error implementado.
- RF-5: EL SISTEMA distingue estados de reserva según los valores que la consulta analítica considera, sin inferir que coinciden con todos los estados operativos.
## Requisitos no funcionales
- La interfaz observada está en español. No se encontraron compromisos cuantitativos de rendimiento ni reglas formales de retención histórica.
## Casos límite
- Registros incompletos, estados históricos desconocidos o timestamps interpretados con zona horaria distinta.
- Denominadores vacíos y métricas calculadas sobre subconjuntos filtrados.
- Datos que no coinciden con las etiquetas/estados actuales de reserva.
## Fuera de alcance
- Creación, modificación y transición de reservas (005).
- Nuevos indicadores o interpretaciones de negocio no presentes en la interfaz.
- Exportación o acceso a datos personales no observado.
## Criterios de finalización
- Verificar cada métrica, agrupación, filtro, orden y estado vacío/error contra la implementación vigente y datos de prueba conocidos.
- Confirmar definiciones de denominador, periodo, estado y zona horaria antes de tratar cifras como contrato.
- Verificar el acceso real de servidor a la sección analítica.
## Dudas abiertas
- [NECESITA ACLARACIÓN] ¿Cuáles son las definiciones aprobadas de cada métrica y su denominador?
- [NECESITA ACLARACIÓN] ¿Qué periodo temporal y zona horaria delimitan los filtros y agregaciones?
- [NECESITA ACLARACIÓN] ¿Qué conjunto de estados y reservas excluidas aplica al análisis?
- [NECESITA ACLARACIÓN] ¿Qué roles pueden consultar datos analíticos y con qué granularidad?
