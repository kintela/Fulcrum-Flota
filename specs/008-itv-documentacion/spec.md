# Spec 008 — Revisiones ITV y documentos
## Contexto y objetivo
Esta especificación retrospectiva registra la consulta y mantenimiento de revisiones ITV de vehículos y los documentos asociados a cada revisión.
## Usuarios / actores
- Usuario que consulta y mantiene registros ITV en la ficha de vehículo.
- Administradores que reciben alertas de revisión según el proceso existente.
## Historias de usuario
- H1: Como usuario quiero registrar revisiones realizadas o programadas para conocer la próxima fecha de inspección.
- H2: Como usuario quiero consultar y adjuntar documentos a una revisión para conservar su documentación asociada.
- H3: Como administrador quiero recibir alertas de ITVs vencidas o próximas según el proceso actual.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO se consulta ITV para una matrícula, EL SISTEMA devuelve sus registros ordenados por próxima revisión.
- RF-2: CUANDO se crea una ITV, EL SISTEMA guarda matrícula y próxima revisión, además de los campos opcionales enviados.
- RF-3: CUANDO se edita una revisión como realizada, EL SISTEMA guarda fecha realizada y resultado enviados; cuando se edita como programada, EL SISTEMA limpia esos dos campos.
- RF-4: CUANDO un usuario solicita documentos de una revisión, EL SISTEMA lista los archivos asociados y genera enlaces firmados de lectura.
- RF-5: CUANDO se solicita subir un documento, EL SISTEMA valida los parámetros/nombre, genera una URL firmada de carga y el cliente valida tipos admitidos y tamaño máximo observado de 20 MB.
- RF-6: CUANDO se elimina un documento, EL SISTEMA solo acepta la ruta que corresponde a la carpeta de esa revisión; existe además operación de eliminación de todos los documentos de la revisión.
- RF-7: CUANDO se procesan alertas ITV, EL SISTEMA evalúa el registro que considera más reciente por matrícula, omite coches donantes y envía email a empleados con rol administrador para alertas vencidas o dentro del plazo configurado de 30 días.
## Requisitos no funcionales
- Tipos admitidos en la UI de documentos: PDF, Word e imágenes JPEG/PNG/WebP; límite de archivo observado: 20 MB.
- No se encontraron objetivos de disponibilidad ni entrega garantizada del email.
## Casos límite
- Matrícula vacía, id ITV no entero/no positivo, ruta ajena a revisión o nombre de archivo no permitido por validación del endpoint.
- ITV sin datos relacionados de vehículo o con resultado/fecha diferentes de `Apto` participa de forma distinta en alertas según el código.
- Los errores de carga/listado se devuelven al consumidor; algunas alertas se marcan tras envío exitoso a al menos un destinatario.
## Fuera de alcance
- Mantenimientos mecánicos (009).
- Fotografías generales de vehículos (013).
- Gestión general de vehículos (003).
## Criterios de finalización
- Verificar consulta/alta/edición/borrado ITV y los casos realizado/programado.
- Verificar validación, carga/listado/enlaces/eliminación de documentos y reglas de ruta.
- Verificar criterios de selección de alerta y destinatarios solo contra configuración/esquema vigentes.
## Dudas abiertas
- [NECESITA ACLARACIÓN] ¿El endpoint `api/itv-documentos` está protegido por políticas externas? No contiene verificación de sesión visible y usa credenciales de servidor.
- [NECESITA ACLARACIÓN] ¿Qué criterio definitivo identifica la revisión vigente cuando fechas/ids/resultados están incompletos?
- [NECESITA ACLARACIÓN] ¿Qué comportamiento se espera ante distintas combinaciones de fecha próxima, fecha realizada y resultado?
- [NECESITA ACLARACIÓN] ¿Qué bucket y políticas de Storage están realmente desplegados?
