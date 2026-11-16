# Spec 001 — Identidad corporativa y sesión
## Contexto y objetivo
Esta especificación retrospectiva registra el inicio de sesión corporativo y la asociación de la identidad autenticada con un empleado, tal como está implementado actualmente. No determina la política de cuentas que no sean corporativas, que no se encontró documentada.
## Usuarios / actores
- Usuario que inicia sesión mediante el proveedor corporativo.
- Empleado cuya cuenta se consulta o aprovisiona al establecer la sesión.
## Historias de usuario
- H1: Como usuario corporativo quiero iniciar sesión para acceder a la aplicación con mi identidad.
- H2: Como usuario autenticado quiero que mi sesión se asocie a mi empleado para que la aplicación disponga de mi rol e identificador.
## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO un usuario completa el flujo de autenticación configurado con Azure AD, EL SISTEMA crea una sesión JWT de NextAuth con los atributos de identidad disponibles.
- RF-2: CUANDO se resuelve una sesión con email, EL SISTEMA consulta el registro de empleado asociado a ese email y expone en sesión el rol e identificador si encuentra un empleado.
- RF-3: SI no existe empleado para el email de la sesión, ENTONCES EL SISTEMA intenta registrar un empleado con rol predeterminado de usuario y los datos de nombre disponibles.
- RF-4: SI no se resuelve un empleado, ENTONCES EL SISTEMA deja el rol de sesión sin asignar.
## Requisitos no funcionales
- La interfaz de inicio de sesión y error identificada está en español. No se encontraron objetivos cuantitativos de disponibilidad o rendimiento.
## Casos límite
- Email ausente en la sesión: no se resuelve empleado mediante email.
- Error al consultar/registrar empleado: el callback captura el error y deja rol nulo.
- El nombre puede derivarse de varios atributos y tiene fallback al segmento anterior a `@` del email.
## Fuera de alcance
- Alta/edición administrativa de empleados (002).
- Matriz de autorización de cada operación de negocio; requiere aclaración transversal.
- Cambio de proveedor de identidad o de estrategia de sesión.
## Criterios de finalización
- Verificar que el flujo de autenticación corporativa produce la sesión descrita.
- Verificar asociación por email, aprovisionamiento cuando no hay registro y rol nulo ante fallo/no resolución.
- Confirmar que no se atribuyen reglas de elegibilidad corporativa que no estén presentes en el código.
## Dudas abiertas
- [NECESITA ACLARACIÓN] ¿Qué cuentas o dominios corporativos pueden autenticarse?
- [NECESITA ACLARACIÓN] ¿Qué comportamiento observable se espera cuando falla el auto-registro o no hay email?
- [NECESITA ACLARACIÓN] ¿Cuál es el comportamiento vigente de cierre y expiración de sesión?
