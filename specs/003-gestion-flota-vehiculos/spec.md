# Spec 003 — Gestión de la flota de vehículos
## Contexto y objetivo
Esta especificación retrospectiva describe el catálogo de vehículos, su consulta y mantenimiento básico, incluida la baja lógica y restauración. No atribuye una motivación histórica no documentada.
## Usuarios / actores
- Usuario autenticado que consulta vehículos.
- Administrador para baja lógica y restauración según acciones existentes.
- Empleados mostrados como asignados a los vehículos.
## Historias de usuario
- H1: Como usuario quiero localizar vehículos y consultar su ficha para conocer los datos relevantes de la flota.
- H2: Como administrador quiero dar de baja lógica y restaurar un vehículo para controlar su presencia en las vistas de flota.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO se consulta el catálogo normal, EL SISTEMA muestra vehículos no dados de baja lógica y permite filtrar por asignados, disponibles, alquiler y donantes.
- RF-2: CUANDO se proporciona texto de búsqueda, EL SISTEMA filtra vehículos usando los campos que actualmente incorpora la búsqueda libre.
- RF-3: CUANDO se consulta una ficha, EL SISTEMA muestra los datos disponibles del vehículo y los datos asociados que la ficha actual incorpora.
- RF-4: CUANDO un administrador da de baja un vehículo, EL SISTEMA marca el registro como eliminado y guarda fecha y email del actor; la baja repetida se trata como éxito sin repetir el cambio.
- RF-5: CUANDO un administrador restaura un vehículo dado de baja, EL SISTEMA limpia los datos de baja; restaurar uno ya activo se trata como éxito sin cambio.
## Requisitos no funcionales
- La interfaz y mensajes observados son mayoritariamente en español. No se encontraron umbrales medibles de rendimiento.
## Casos límite
- Matrícula vacía o vehículo inexistente en baja/restauración.
- Bajas lógicas ya aplicadas y restauraciones de vehículos activos.
- La consulta normal excluye eliminados y existe filtro de vehículos dados de baja.
- El catálogo oculta ciertas matrículas de prueba para la mayoría de usuarios; el criterio de excepción está codificado en la consulta.
## Fuera de alcance
- Asignaciones permanentes (004) y reservas temporales (005).
- Ubicación (006), tarjetas (007), ITV/mantenimiento/seguro/alquiler (008–011) y fotografías (013), aunque algunas se muestran en la ficha.
## Criterios de finalización
- Verificar filtros, búsqueda, consulta de ficha, baja lógica y restauración con los casos implementados.
- Confirmar que la baja no se describe como eliminación física.
- Resolver qué filtros y datos relacionados pertenecen al contrato vigente antes de fijar requisitos ambiguos.
## Dudas abiertas
- [NECESITA ACLARACIÓN] ¿La excepción para mostrar matrículas de prueba es comportamiento contractual o una regla operativa temporal?
- [NECESITA ACLARACIÓN] ¿Qué campos asociados de la ficha son parte estable de la experiencia funcional?
- [NECESITA ACLARACIÓN] ¿Cuál es la vía vigente para editar el asignado y cómo se relaciona con asignaciones permanentes y reservas?
