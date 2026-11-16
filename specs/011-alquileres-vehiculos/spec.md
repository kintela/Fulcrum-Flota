# Spec 011 — Alquileres de vehículos
## Contexto y objetivo
Esta especificación retrospectiva registra los contratos de alquiler asociados a vehículos y la consulta de sus periodos y estados según las operaciones observadas en la aplicación. Actualizada el 2026-11-16 para reflejar la spec 017 (protección por rol de páginas y operaciones de administración).
## Usuarios / actores
- Administrador: crea, actualiza y elimina contratos de alquiler (017).
- Usuario no administrador: consulta en solo lectura los alquileres de los coches con los que está relacionado (017).
- Vehículo asociado al contrato.
## Historias de usuario
- H1: Como usuario quiero consultar los alquileres de un vehículo para conocer sus periodos y condiciones registradas.
- H2: Como operador quiero crear, actualizar y eliminar contratos para mantener la información del alquiler.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO se consultan alquileres por matrícula, EL SISTEMA devuelve los registros asociados con los campos y ordenamiento implementados.
- RF-2: CUANDO se crea un alquiler con los datos requeridos por la acción, EL SISTEMA intenta insertar el contrato asociado al vehículo.
- RF-3: CUANDO se actualiza o elimina un alquiler identificado, EL SISTEMA intenta guardar los cambios o borrar el registro correspondiente.
- RF-4: SI faltan los datos que la acción considera obligatorios o falla la operación de datos, ENTONCES EL SISTEMA devuelve un resultado de error.
- RF-5: CUANDO la ficha del vehículo consulta alquileres, EL SISTEMA muestra los datos que el componente actual consume.
- RF-6: SI quien crea, actualiza o elimina un alquiler no es administrador, o quien consulta los de un coche no es administrador ni está relacionado con él, ENTONCES EL SISTEMA rechaza la operación (017).
## Requisitos no funcionales
- La interfaz observada está en español. No se encontraron objetivos cuantitativos ni garantía de disponibilidad de la integración.
## Casos límite
- Matrícula o id inválido/inexistente.
- Datos opcionales vacíos o fechas incompletas.
- No se ha verificado el comportamiento del esquema desplegado ante periodos solapados.
## Fuera de alcance
- Gestión general de vehículos (003).
- Reservas temporales de vehículos (005).
- Cálculo de costes o integración con proveedores de alquiler, no evidenciados.
## Criterios de finalización
- Verificar consulta, creación, edición y eliminación contra el comportamiento vigente de UI y acciones.
- Confirmar los campos requeridos, orden y estados con el esquema desplegado antes de fijarlos como contrato.
## Dudas abiertas
- [NECESITA ACLARACIÓN] ¿Qué campos y validaciones son obligatorios en el flujo normal? Hay diferencias posibles entre UI, acciones y datos históricos.
- [NECESITA ACLARACIÓN] ¿Qué significan los estados y cómo se determina un alquiler vigente?
- [NECESITA ACLARACIÓN] ¿Se permiten contratos solapados para el mismo vehículo?
