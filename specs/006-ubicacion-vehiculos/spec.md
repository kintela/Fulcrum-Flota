# Spec 006 — Ubicación de vehículos
## Contexto y objetivo
Esta especificación retrospectiva describe cómo se consulta y actualiza la ubicación de los vehículos, incluida la captura desde el dispositivo y la geocodificación de direcciones.
## Usuarios / actores
- Usuario autenticado que consulta o actualiza ubicaciones.
- Servicio de Google Maps/Geocoding que resuelve direcciones.
## Historias de usuario
- H1: Como usuario quiero ver la ubicación conocida de los vehículos para localizarlos.
- H2: Como usuario quiero guardar la ubicación actual del vehículo para que la aplicación muestre su posición y dirección.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO la aplicación dispone de coordenadas de un vehículo, EL SISTEMA las presenta en mapas o en la información relacionada que las consume.
- RF-2: CUANDO un usuario autenticado captura la geolocalización del dispositivo y la envía, EL SISTEMA intenta actualizar latitud, longitud y marca temporal de última ubicación.
- RF-3: CUANDO está configurado Google Geocoding y la resolución tiene éxito, EL SISTEMA guarda la dirección formateada junto con las coordenadas.
- RF-4: SI la geocodificación falla en la acción que permite continuar sin dirección, ENTONCES EL SISTEMA conserva la operación de actualización de coordenadas sin sustituir la dirección por una nueva.
- RF-5: CUANDO el usuario ejecuta la acción de ubicar en sede, EL SISTEMA intenta geocodificar la dirección configurada de sede y actualizar el vehículo.
## Requisitos no funcionales
- Los errores de permiso, posición no disponible y timeout de geolocalización se presentan con mensajes en español en la utilidad cliente.
- No hay requisitos de precisión o rendimiento definidos.
## Casos límite
- El navegador no soporta geolocalización o el usuario la deniega.
- La API de geocoding no está configurada o no obtiene resultado.
- Existe una ruta de actualización distinta que acepta coordenadas sin comprobación visible de sesión propia.
## Fuera de alcance
- Catálogo y ciclo de vida del vehículo (003).
- Reservas temporales (005), aunque consumen ubicación.
- Detalles de proveedor, claves o configuración de Google Maps.
## Criterios de finalización
- Verificar captura/errores de geolocalización, persistencia de coordenadas y resolución de dirección en los flujos actuales.
- Confirmar qué endpoint es consumido por la UI antes de describir autorización o errores como contrato.
## Dudas abiertas
- [NECESITA ACLARACIÓN] Hay más de una ruta/acción de actualización con controles distintos; ¿cuál es el flujo vigente y quién puede usarlo?
- [NECESITA ACLARACIÓN] Al fallar geocoding, ¿debe mantenerse la dirección previa, borrarse o mostrarse una indicación de desactualización?
- [NECESITA ACLARACIÓN] ¿La ubicación asignada en sede es una capacidad accesible en el flujo normal o administrativa?
