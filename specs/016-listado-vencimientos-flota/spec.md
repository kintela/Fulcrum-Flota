# Spec 016 — Listado de vencimientos de la flota
## Contexto y objetivo
Hoy las fechas de caducidad del seguro, de la tarjeta Solred y de la próxima ITV de cada vehículo solo se ven repartidas en las tarjetas individuales de la página "Gestión de Coches" o en la ficha de cada vehículo. Para revisar qué vence y cuándo hay que recorrer los vehículos uno a uno. Esta funcionalidad añade un acceso "Listados" en la cabecera de la página de coches que abre una ventana modal con una tabla consolidada de esos vencimientos por vehículo. La tabla se puede filtrar por tipo de vehículo (alquiler / no alquiler / todos), buscar por texto y ordenar por columnas, y resalta las fechas vencidas o próximas a vencer, para localizar con rapidez las renovaciones pendientes.

## Usuarios / actores
- Administrador (empleado con rol `administrador`): único usuario que puede ver y usar el listado.
- Usuario autenticado sin rol de administrador: sigue usando la página de coches como hoy, pero no ve el acceso al listado.
- Empleado asignado al vehículo, que solo aparece como dato mostrado.

## Historias de usuario
- H1: Como administrador quiero ver en una sola tabla las fechas de caducidad del seguro, de la tarjeta Solred y de la próxima ITV de cada vehículo para anticipar renovaciones sin abrir cada ficha.
- H2: Como administrador quiero filtrar esa tabla por vehículos de alquiler, no de alquiler o todos para revisar cada grupo por separado.
- H3: Como administrador quiero buscar por texto y ordenar por cualquier columna para encontrar un vehículo o persona concretos, o ver primero lo que vence antes.
- H4: Como administrador quiero que las fechas vencidas o a punto de vencer se distingan a simple vista para priorizar las renovaciones.

## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: MIENTRAS un administrador está en la página de coches, EL SISTEMA muestra un botón "Listados" en la cabecera, situado entre el título de la página y el botón "+ Nuevo Coche", tanto en la vista principal "Gestión de Coches" como con cualquier filtro rápido activo.
- RF-2: SI el usuario autenticado no tiene rol de administrador, ENTONCES EL SISTEMA no muestra el botón "Listados" ni le entrega los datos del listado, y la página de coches se comporta para él como hasta ahora.
- RF-3: CUANDO el administrador pulsa "Listados", EL SISTEMA abre una ventana modal sobre la página actual, sin navegar a otra página ni perder los filtros o la búsqueda de la página de coches.
- RF-4: CUANDO se abre el modal, EL SISTEMA muestra una tabla con una fila por vehículo y las columnas: matrícula, modelo (marca y modelo juntos, por ejemplo "Seat León"), persona asignada, fecha de caducidad del seguro, fecha de caducidad de la tarjeta Solred y fecha de la próxima revisión ITV.
- RF-5: EL SISTEMA obtiene la fecha de caducidad del seguro a partir de la póliza activa del vehículo; la de la tarjeta Solred, de la tarjeta Solred con asignación activa al vehículo; y la de la próxima ITV, del mismo registro ITV que la página de coches usa hoy como próxima revisión.
- RF-6: SI un vehículo no tiene seguro activo, tarjeta Solred asignada, registro ITV o persona asignada, ENTONCES EL SISTEMA muestra la celda correspondiente con un texto que indique la ausencia del dato ("Sin seguro", "Sin tarjeta", "Sin datos", "Sin asignar") y la fila sigue apareciendo.
- RF-7: EL SISTEMA muestra la persona asignada con el mismo criterio de resolución de nombre que usa la página de coches.
- RF-8: EL SISTEMA incluye en el listado los vehículos de la flota activa (no dados de baja), excluye los vehículos donantes y aplica la misma regla de ocultación de vehículos de prueba que el catálogo de coches. El contenido del listado no depende del filtro rápido ni de la búsqueda activos en la página de coches.
- RF-9: EL SISTEMA muestra encima de la tabla un selector de filtro con las opciones "Todos", "Alquiler" y "No alquiler", con "Todos" seleccionado al abrir el modal.
- RF-10: CUANDO el administrador selecciona "Alquiler", EL SISTEMA muestra solo los vehículos marcados como de alquiler; CUANDO selecciona "No alquiler", solo los no marcados como de alquiler; CUANDO selecciona "Todos", todos los vehículos incluidos en el listado.
- RF-11: EL SISTEMA muestra encima de la tabla un cuadro de texto de búsqueda.
- RF-12: CUANDO el administrador escribe en el cuadro de búsqueda, EL SISTEMA filtra las filas cuyo contenido coincida con el texto sin distinguir mayúsculas y minúsculas, en al menos los campos matrícula, marca, modelo y persona asignada, y aplica la búsqueda junto con el filtro de alquiler seleccionado.
- RF-13: SI ninguna fila cumple el filtro y la búsqueda, ENTONCES EL SISTEMA muestra un mensaje indicando que no hay vehículos que coincidan, sin cerrar el modal.
- RF-14: CUANDO se abre el modal, EL SISTEMA ordena las filas por matrícula ascendente.
- RF-15: CUANDO el administrador pulsa la cabecera de cualquier columna, EL SISTEMA ordena las filas por esa columna en sentido ascendente; CUANDO vuelve a pulsar la misma cabecera, EL SISTEMA invierte el sentido. EL SISTEMA indica visualmente la columna y el sentido de orden activos.
- RF-16: MIENTRAS la tabla está ordenada por una columna de fecha, EL SISTEMA ordena cronológicamente y coloca al final las filas sin fecha en esa columna, en ambos sentidos. MIENTRAS está ordenada por una columna de texto, EL SISTEMA ordena alfabéticamente sin distinguir mayúsculas ni acentos y coloca al final las filas sin dato.
- RF-17: EL SISTEMA conserva el orden elegido al cambiar el filtro de alquiler o el texto de búsqueda mientras el modal sigue abierto.
- RF-18: EL SISTEMA muestra en rojo las fechas de seguro, tarjeta Solred e ITV ya vencidas (anteriores al día actual) y en ámbar las que vencen entre hoy y los próximos 30 días, ambos incluidos; el resto se muestra sin resaltar.
- RF-19: EL SISTEMA muestra las fechas en formato español dd/mm/aaaa.
- RF-20: CUANDO el administrador cierra el modal (botón de cierre, tecla Escape o clic fuera), EL SISTEMA vuelve a la página de coches en el mismo estado en que estaba.
- RF-21: EL SISTEMA no muestra en el listado el PIN de las tarjetas Solred ni otros datos sensibles no requeridos por esta spec.

## Requisitos no funcionales
- Interfaz y mensajes en español, coherentes con el estilo visual de la página de coches.
- El modal debe ser usable en móvil (la aplicación es PWA): la tabla debe poder desplazarse horizontalmente sin desbordar la página.
- La restricción a administradores se comprueba en servidor; ocultar el botón en la interfaz no basta. No se expone ninguna credencial al navegador.
- El resaltado por color debe acompañarse de un indicador no cromático (por ejemplo, un icono o texto alternativo) para que sea comprensible sin distinguir colores.
- Solo lectura: el listado no modifica ningún dato.

## Casos límite
- Flota sin vehículos que cumplan los criterios del listado: el modal muestra el mensaje de "no hay vehículos".
- Vehículo con más de un seguro activo o más de una tarjeta Solred activa (posible según las dudas abiertas de las specs 007 y 010): se muestra un único valor siguiendo el mismo criterio que la página de coches.
- Vehículo con varios registros ITV: se usa el registro que la página de coches considera próxima revisión.
- Fecha que vence hoy: se considera dentro del plazo de 30 días (ámbar), no vencida.
- Fecha que vence exactamente dentro de 30 días: ámbar; a 31 días: sin resaltar.
- Vehículo marcado a la vez como donante y de alquiler: queda excluido por ser donante.
- Empates al ordenar: se mantiene la matrícula ascendente como criterio secundario.
- Persona asignada guardada como texto libre o como id inexistente: se muestra tal como lo resuelve hoy la página de coches.
- Texto de búsqueda con espacios al principio o al final: se ignoran.
- Sesión de un usuario cuyo rol cambia de administrador a usuario: deja de ver el listado según el rol que el servidor resuelva en ese momento.
- Fallo al obtener alguno de los datos asociados: el listado no debe romper la página de coches.

## Fuera de alcance
- Tarjetas ViaT, mantenimientos y alquileres (contratos) como columnas del listado.
- Vehículos donantes y vehículos dados de baja.
- Edición de cualquier dato desde el modal.
- Exportación a Excel/CSV/PDF o impresión específica.
- Envío de alertas o notificaciones por vencimiento (ya cubierto por la spec 012).
- Cambios en las tarjetas de vehículo, filtros rápidos, búsqueda o permisos existentes de la página de coches.
- Cambios de esquema de base de datos.

## Criterios de finalización
- Todos los RF verificados con pruebas automatizadas donde sea viable (acceso solo administrador, exclusión de donantes, filtro de alquiler, búsqueda, ordenación, resaltado por plazos, celdas sin dato, formato de fecha) y en verde.
- Demostración manual del flujo principal en escritorio y móvil con un administrador: abrir "Listados", filtrar por cada opción, buscar, ordenar por varias columnas, cerrar y comprobar que la página de coches conserva su estado; y comprobación de que un usuario no administrador no ve el botón.
- `npm run lint` y `npx tsc --noEmit` sin errores nuevos.

## Dudas abiertas
Ninguna. Las seis dudas de la primera versión quedaron resueltas por el responsable el 2026-11-16:
- Donantes: se excluyen (RF-8).
- Botón visible con cualquier filtro rápido activo (RF-1).
- Columna modelo: marca y modelo juntos (RF-4).
- Orden por defecto por matrícula y ordenable por cualquier columna (RF-14 a RF-17).
- Resaltado: rojo si vencida, ámbar si vence en 30 días o menos (RF-18).
- Acceso: solo administradores (RF-1, RF-2).
