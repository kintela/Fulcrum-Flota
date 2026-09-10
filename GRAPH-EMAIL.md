# Correo de Flota mediante Microsoft Graph

## Aplicación de Entra ID

Crear un registro de aplicación específico para Flota. No es necesario configurar URI de redirección porque el servidor utiliza el flujo `client_credentials` y no inicia sesión un usuario.

Para aplicar el acceso mínimo recomendado, no se debe conceder `Mail.Send` globalmente en **API permissions**. La autorización se asigna después desde Exchange Online RBAC y queda limitada al buzón de Flota.

En **Certificates & secrets**, crear un secreto y copiar inmediatamente su **Value**. El identificador del secreto no sirve como credencial.

## Variables de Vercel

Configurar para el entorno Production y volver a desplegar:

```text
GRAPH_TENANT_ID=<Directory (tenant) ID>
GRAPH_CLIENT_ID=<Application (client) ID>
GRAPH_CLIENT_SECRET=<valor del secreto>
GRAPH_FROM_EMAIL=flota@fulcrum.es
EMAIL_TEST_RECIPIENT=rquintela@fulcrum.es
```

`EMAIL_TEST_RECIPIENT` es opcional. `EMAIL_USER` y `EMAIL_PASSWORD` dejan de utilizarse y se pueden eliminar de Vercel después de comprobar el envío con Graph.

## Seguridad recomendada

Con una sesión de Exchange Online abierta como administrador, sustituir los dos identificadores y ejecutar:

```powershell
New-ServicePrincipal `
  -AppId "<Application (client) ID>" `
  -ObjectId "<Object ID de Enterprise applications>" `
  -DisplayName "Fulcrum Flota Graph Mail"

New-ManagementScope `
  -Name "Fulcrum Flota Mailbox" `
  -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'flota@fulcrum.es'"

New-ManagementRoleAssignment `
  -Name "Fulcrum Flota Mail.Send" `
  -Role "Application Mail.Send" `
  -App "<Application (client) ID>" `
  -CustomResourceScope "Fulcrum Flota Mailbox"

Test-ServicePrincipalAuthorization `
  -Identity "<Application (client) ID>" `
  -Resource "flota@fulcrum.es" | Format-Table
```

El `ObjectId` es el de la instancia situada en **Enterprise applications**, no el Object ID mostrado en **App registrations**. La prueba debe mostrar `Application Mail.Send` e `InScope=True`. La propagación efectiva puede tardar entre 30 minutos y 2 horas.

Alternativamente, conceder `Mail.Send` como permiso de aplicación de Microsoft Graph en Entra y dar consentimiento de administrador permite empezar más rápidamente, pero sin una Application Access Policy ese permiso abarca todos los buzones. Los permisos globales de Entra y los de RBAC son acumulativos: añadir el RBAC limitado no restringe un permiso global ya concedido.

## Prueba

1. Desplegar después de configurar las variables.
2. Abrir el panel de administración de Flota.
3. Ejecutar **Probar configuración** y después **Enviar email de prueba**.
4. Confirmar la recepción y comprobar **Enviados** del buzón compartido `flota@fulcrum.es`.

Microsoft Graph responde `202 Accepted`: confirma que aceptó el trabajo, aunque el procesamiento y la entrega continúan de forma asíncrona.
