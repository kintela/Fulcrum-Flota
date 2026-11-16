# Spec 003 — Gestión de la flota de vehículos
## Contexto y objetivo
Esta especificación retrospectiva describe el catálogo de vehículos, su consulta y mantenimiento básico, incluida la baja lógica y restauración. No atribuye una motivación histórica no documentada. Actualizada el 2026-11-16 para reflejar la spec 017 (protección por rol de páginas y operaciones de administración). Incluye también el listado de vencimientos de la spec 016.
## Usuarios / actores
- Administrador: consulta el catálogo, da de alta, edita, da de baja lógica y restaura vehículos (017).
- Usuario no administrador: solo consulta, en modo lectura, la ficha de los coches con los que está relacionado: asignados a él o con una reserva activa suya (017).
- Empleados mostrados como asignados a los vehículos.
## Historias de usuario
- H1: Como administrador quiero localizar vehículos y consultar su ficha para conocer los datos relevantes de la flota.
- H2: Como administrador quiero dar de baja lógica y restaurar un vehículo para controlar su presencia en las vistas de flota.
- H3: Como usuario quiero consultar la ficha de mis coches para tener a mano su información.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO un administrador consulta el catálogo normal, EL SISTEMA muestra vehículos no dados de baja lógica y permite filtrar por asignados, disponibles, alquiler y donantes.
- RF-2: CUANDO se proporciona texto de búsqueda, EL SISTEMA filtra vehículos usando los campos que actualmente incorpora la búsqueda libre.
- RF-3: CUANDO un administrador consulta una ficha, EL SISTEMA muestra los datos disponibles del vehículo y los datos asociados que la ficha actual incorpora, con sus acciones de edición.
- RF-4: CUANDO un administrador da de baja un vehículo, EL SISTEMA marca el registro como eliminado y guarda fecha y email del actor; la baja repetida se trata como éxito sin repetir el cambio.
- RF-5: CUANDO un administrador restaura un vehículo dado de baja, EL SISTEMA limpia los datos de baja; restaurar uno ya activo se trata como éxito sin cambio.
- RF-6: CUANDO un usuario no administrador consulta la ficha de un coche con el que está relacionado, EL SISTEMA la muestra en solo lectura; para cualquier otro coche, o una matrícula inexistente, lo redirige al dashboard con aviso (017).
- RF-7: SI un usuario no administrador accede al catálogo, al alta o a la edición de coches, ENTONCES EL SISTEMA lo redirige al dashboard con aviso (017).
- RF-8: CUANDO un administrador abre "Listados" en el catálogo, EL SISTEMA muestra los vencimientos de seguro, Solred e ITV de la flota activa según la spec 016.
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
- [NECESITA ACLARACIÓN] ¿Qué campos asociados de la ficha son parte estable de la experiencia funcional? (La visibilidad por rol ya está fijada por la spec 017.)
- [NECESITA ACLARACIÓN] ¿Cuál es la vía vigente para editar el asignado y cómo se relaciona con asignaciones permanentes y reservas?
