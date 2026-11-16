# Spec 013 — Fotografías de vehículos
## Contexto y objetivo
Esta especificación retrospectiva describe la consulta, carga y eliminación de fotografías de vehículos guardadas en almacenamiento asociado a la aplicación.
## Usuarios / actores
- Usuario que consulta fotografías en la ficha del vehículo.
- Usuario que carga o elimina fotografías mediante las operaciones disponibles.
- Supabase Storage como servicio de almacenamiento.
## Historias de usuario
- H1: Como usuario quiero ver fotografías de un vehículo para reconocerlo y consultar su estado visual.
- H2: Como usuario autorizado quiero cargar o eliminar fotografías para mantener las imágenes asociadas al vehículo.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO se consulta la ficha de vehículo, EL SISTEMA muestra las fotografías que el cliente actual obtiene del almacenamiento asociado.
- RF-2: CUANDO se carga una fotografía mediante el flujo implementado, EL SISTEMA intenta almacenar el archivo y asociarlo al vehículo/ruta correspondiente.
- RF-3: CUANDO se elimina una fotografía desde el flujo actual, EL SISTEMA intenta quitar el objeto del almacenamiento y actualizar la referencia asociada cuando corresponda.
- RF-4: SI la operación de almacenamiento falla, ENTONCES EL SISTEMA devuelve o presenta el error según el consumidor actual.
## Requisitos no funcionales
- El formato, tamaño máximo, bucket, visibilidad y políticas efectivas dependen de la configuración/despliegue y no se fijan aquí sin evidencia suficiente.
- No se encontraron objetivos de disponibilidad o rendimiento.
## Casos límite
- Vehículo sin fotos, ruta inexistente o objeto no accesible.
- Diferencia entre URL pública, URL firmada o rutas de Storage según consumidor.
- Fallo parcial entre eliminar objeto y actualizar la referencia de base de datos.
## Fuera de alcance
- Documentos de ITV (008).
- Ubicación de vehículos (006).
- Políticas/buckets desplegados que no son verificables desde el repositorio.
## Criterios de finalización
- Verificar el flujo vigente de consulta, carga y eliminación en UI y acciones.
- Confirmar referencias persistidas, rutas y controles de acceso contra el esquema y políticas desplegadas.
- No asumir que un control de cliente protege el objeto frente a acceso directo.
## Dudas abiertas
- [NECESITA ACLARACIÓN] ¿Qué flujo de carga/eliminación está vigente y qué tipos/tamaños acepta?
- [NECESITA ACLARACIÓN] ¿Las fotografías se guardan como URLs, rutas de objetos o ambos?
- [NECESITA ACLARACIÓN] ¿Qué bucket, visibilidad y políticas RLS/Storage están desplegados?
- [NECESITA ACLARACIÓN] ¿Qué roles pueden consultar, cargar y eliminar imágenes?
