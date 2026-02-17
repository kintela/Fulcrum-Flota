import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Configuración para Office 365
const emailConfig: EmailConfig = {
  host: 'smtp.office365.com',
  port: 587,
  secure: false, // true para 465, false para otros puertos
  auth: {
    // Autenticamos con la cuenta que tiene la contraseña de aplicación (delegada)
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || '',
  },
};

// Remitente visible: puede ser distinto al usuario de autenticación (Send As en O365)
const fromEmail = process.env.FROM_EMAIL || process.env.EMAIL_USER || ''
const fromName = process.env.FROM_NAME || 'Fulcrum Flota'
const avisoFooterUrl = "https://flota.fulcrum.es"
const avisoFooterLabel = "Fulcrum Flota"
const avisoFooterHtml = `<a href="${avisoFooterUrl}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;">${avisoFooterLabel}</a> · Aviso automático`
const avisoFooterText = `${avisoFooterLabel} · Aviso automático\n${avisoFooterUrl}`

// Crear el transportador de email
export const createEmailTransporter = () => {
  return nodemailer.createTransport(emailConfig);
};

// Función para enviar email de reserva vencida
export async function enviarEmailReservaVencida(
  emailDestino: string,
  nombreEmpleado: string,
  vehiculo: {
    matricula: string;
    marca: string;
    modelo: string;
  },
  fechaInicio: Date,
  fechaFinalizacion: Date,
  tiempoVencido: string
) {
  try {
    const transporter = createEmailTransporter();

    // Formatear fechas en hora española
    const fechaInicioFormateada = fechaInicio.toLocaleDateString('es-ES', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const fechaFinFormateada = fechaFinalizacion.toLocaleDateString('es-ES', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const asunto = `⚠️ Reserva de vehículo vencida - ${vehiculo.matricula}`;
    
    const contenidoHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reserva Vencida</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #ff6b6b;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .alert-icon {
            font-size: 48px;
            color: #ff6b6b;
            margin-bottom: 10px;
          }
          .title {
            color: #ff6b6b;
            font-size: 24px;
            font-weight: bold;
            margin: 0;
          }
          .vehicle-info {
            background: #f8f9fa;
            border-left: 4px solid #ff6b6b;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: bold;
            color: #555;
          }
          .value {
            color: #333;
          }
          .warning-text {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
          }
          .button {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 0;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="alert-icon">⚠️</div>
            <h1 class="title">Reserva de Vehículo Vencida</h1>
          </div>
          
          <p>Estimado/a <strong>${nombreEmpleado}</strong>,</p>
          
          <p>Le informamos que su reserva del siguiente vehículo ha vencido:</p>
          
          <div class="vehicle-info">
            <div class="info-row">
              <span class="label">Matrícula:</span>
              <span class="value">${vehiculo.matricula}</span>
            </div>
            <div class="info-row">
              <span class="label">Vehículo:</span>
              <span class="value">${vehiculo.marca} ${vehiculo.modelo}</span>
            </div>
            <div class="info-row">
              <span class="label">Fecha de inicio:</span>
              <span class="value">${fechaInicioFormateada}</span>
            </div>
            <div class="info-row">
              <span class="label">Fecha de finalización:</span>
              <span class="value">${fechaFinFormateada}</span>
            </div>
            <div class="info-row">
              <span class="label">Tiempo vencido:</span>
              <span class="value">${tiempoVencido}</span>
            </div>
          </div>
          
          <div class="warning-text">
            <strong>Acción requerida:</strong> Por favor, proceda a devolver el vehículo lo antes posible. 
            Si ya lo ha devuelto, puede ignorar este mensaje.
          </div>

          <div class="warning-text" style="background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460;">
            <strong>Información:</strong> La reserva sigue figurando como <strong>ACTIVA</strong> hasta que
            la completes tú mismo en el sistema al devolver el vehículo.
          </div>
          
          
          <div class="footer">
            <p>${avisoFooterHtml}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const contenidoTexto = `
RESERVA DE VEHÍCULO VENCIDA

Estimado/a ${nombreEmpleado},

Le informamos que su reserva del siguiente vehículo ha vencido:

Matrícula: ${vehiculo.matricula}
Vehículo: ${vehiculo.marca} ${vehiculo.modelo}
Fecha de inicio: ${fechaInicioFormateada}
Fecha de finalización: ${fechaFinFormateada}
Tiempo vencido: ${tiempoVencido}

ACCIÓN REQUERIDA: Por favor, proceda a devolver el vehículo lo antes posible. 
Si ya lo ha devuelto, puede ignorar este mensaje.

INFORMACIÓN: La reserva permanece ACTIVA hasta que la marques como completada al devolver
el vehículo. Si necesitas extenderla, solicita una ampliación antes de finalizar.

Si tiene alguna consulta o necesita extender la reserva, por favor contacte con Roberto Quintela.

---
${avisoFooterText}
    `;

    const mailOptions = {
      from: {
        name: fromName,
        address: fromEmail
      },
      to: emailDestino,
      subject: asunto,
      text: contenidoTexto,
      html: contenidoHTML,
    };

    const resultado = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado exitosamente:', resultado.messageId);
    
    return {
      success: true,
      messageId: resultado.messageId
    };

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// Función para probar la configuración de email
export async function probarConfiguracionEmail() {
  try {
    const transporter = createEmailTransporter();
    await transporter.verify();
    console.log('✅ Configuración de email válida');
    return true;
  } catch (error) {
    console.error('❌ Error en configuración de email:', error);
    return false;
  }
}

// Función para enviar email de prueba
export async function enviarEmailPrueba() {
  try {
    const transporter = createEmailTransporter();

    const mailOptions = {
      from: {
        name: fromName,
        address: fromEmail
      },
      to: emailConfig.auth.user, // Enviar a nosotros mismos
      subject: '🧪 Prueba del Sistema de Notificaciones - Fulcrum Flota',
      text: `
Prueba del Sistema de Notificaciones
====================================

Este es un email de prueba del sistema de notificaciones automáticas de Fulcrum Flota.

Si recibe este mensaje, significa que:
✅ La configuración de Office 365 SMTP está correcta
✅ El sistema de email está funcionando correctamente
✅ Los cron jobs podrán enviar notificaciones automáticas

Detalles técnicos:
- Servidor SMTP: ${emailConfig.host}:${emailConfig.port}
- Usuario: ${emailConfig.auth.user}
- Fecha de prueba: ${new Date().toLocaleString('es-ES')}

---
Fulcrum Flota
Sistema de Notificaciones Automáticas
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Prueba del Sistema</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Prueba del Sistema de Notificaciones</h1>
        <p>Fulcrum Flota</p>
    </div>
    
    <div class="content">
        <div class="success">
            <strong>¡Prueba Exitosa!</strong><br>
            Si recibe este mensaje, el sistema de notificaciones está funcionando correctamente.
        </div>
        
        <p>Este es un email de prueba del sistema de notificaciones automáticas de Fulcrum Flota.</p>
        
        <h3>✅ Verificaciones Completadas:</h3>
        <ul>
            <li>Configuración de Office 365 SMTP correcta</li>
            <li>Sistema de email funcionando</li>
            <li>Cron jobs listos para notificaciones automáticas</li>
        </ul>
        
        <div class="details">
            <h3>Detalles Técnicos:</h3>
            <ul>
                <li><strong>Servidor SMTP:</strong> ${emailConfig.host}:${emailConfig.port}</li>
                <li><strong>Usuario:</strong> ${emailConfig.auth.user}</li>
                <li><strong>Fecha de prueba:</strong> ${new Date().toLocaleString('es-ES')}</li>
            </ul>
        </div>
        
        <p>El sistema ahora puede enviar notificaciones automáticas cuando los vehículos excedan el tiempo de reserva.</p>
    </div>
    
    <div class="footer">
        <p>Fulcrum Flota - Sistema de Notificaciones Automáticas</p>
        <p>Este es un mensaje de prueba generado automáticamente.</p>
    </div>
</body>
</html>
      `,
    };

    const resultado = await transporter.sendMail(mailOptions);
    console.log('✅ Email de prueba enviado exitosamente:', resultado.messageId);
    
    return {
      success: true,
      messageId: resultado.messageId,
      destinatario: emailConfig.auth.user
    };

  } catch (error) {
    console.error('❌ Error enviando email de prueba:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// Email al inicio (activación) de una reserva pendiente
export async function enviarEmailInicioReserva(
  emailDestino: string,
  nombreEmpleado: string,
  vehiculo: { matricula: string; marca: string; modelo: string },
  fechaInicio: Date,
  fechaFin: Date
) {
  try {
    const transporter = createEmailTransporter()

    const inicioFmt = fechaInicio.toLocaleDateString('es-ES', {
      timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
    const finFmt = fechaFin.toLocaleDateString('es-ES', {
      timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })

    const asunto = `✅ Comienza tu reserva - ${vehiculo.matricula}`
    const texto = `
INICIO DE RESERVA

Hola ${nombreEmpleado},

Tu reserva del vehículo ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.matricula}) ha comenzado.

Inicio: ${inicioFmt}
Fin previsto: ${finFmt}

Recuerda marcarla como completada cuando devuelvas el vehículo

---
${avisoFooterText}
    `

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Inicio de Reserva</title><style>body{font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#333;max-width:620px;margin:0 auto;padding:24px;background:#f5f7fa} .card{background:#fff;border-radius:10px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.06)} h1{margin:0 0 12px;font-size:22px;color:#16a34a} .veh{background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:8px;margin:16px 0} .footer{margin-top:32px;font-size:12px;color:#666;text-align:center} .pill{display:inline-block;background:#16a34a;color:#fff;padding:4px 10px;border-radius:999px;font-size:12px;margin-bottom:8px}</style></head><body><div class="card"><span class="pill">Reserva activada</span><h1>Comienza tu reserva</h1><p>Hola <strong>${nombreEmpleado}</strong>,</p><p>Tu reserva ha pasado automáticamente de <strong>pendiente</strong> a <strong>activa</strong>.</p><div class="veh"><strong>Vehículo:</strong> ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.matricula})<br/><strong>Inicio:</strong> ${inicioFmt}<br/><strong>Fin previsto:</strong> ${finFmt}</div><p>Recuerda marcarla como <em>completada</em> cuando devuelvas el vehículo.</p><div class="footer">${avisoFooterHtml}</div></div></body></html>`

    const mailOptions = {
      from: { name: fromName, address: fromEmail },
      to: emailDestino,
      subject: asunto,
      text: texto,
      html
    }

    const r = await transporter.sendMail(mailOptions)
    console.log('📧 Email inicio reserva enviado:', r.messageId)
    return { success: true, messageId: r.messageId }
  } catch (error) {
    console.error('❌ Error enviando email inicio reserva:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' }
  }
}

// Email de alertas ITV (vencidas y próximas)
export async function enviarEmailAlertasITV(
  emailDestino: string | string[],
  payload: {
    vencidas: Array<{
      matricula: string
      marca: string
      modelo: string
      fechaproximarevision: string
      dias?: number
    }>
    proximas: Array<{
      matricula: string
      marca: string
      modelo: string
      fechaproximarevision: string
      dias?: number
    }>
    fechaLimite: Date
  }
) {
  try {
    const transporter = createEmailTransporter()

    const formatDate = (fecha: string) =>
      new Date(fecha).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })

    const renderLista = (
      items: Array<{ matricula: string; marca: string; modelo: string; fechaproximarevision: string; dias?: number }>,
      tipo: "vencida" | "proxima"
    ) => {
      if (items.length === 0) return ""
      const titulo = tipo === "vencida" ? "ITVs Vencidas" : "ITVs Próximas (≤ 30 días)"
      const color = tipo === "vencida" ? "#ef4444" : "#f59e0b"
      const descripcion =
        tipo === "vencida"
          ? "Estas ITVs ya superaron la fecha de próxima revisión."
          : "Estas ITVs están dentro del plazo de 30 días para la próxima revisión."

      return `
        <div style="margin: 20px 0;">
          <h3 style="color: ${color}; margin-bottom: 6px;">${titulo} (${items.length})</h3>
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">${descripcion}</p>
          <table style="width:100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="text-align:left; background:#f3f4f6;">
                <th style="padding:8px;">Vehículo</th>
                <th style="padding:8px;">Próxima revisión</th>
                <th style="padding:8px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map((itv) => {
                  const dias = typeof itv.dias === "number" ? itv.dias : null
                  const estadoTexto =
                    tipo === "vencida"
                      ? `Vencida hace ${Math.abs(dias ?? 0)} días`
                      : `En ${dias ?? ""} días`
                  return `
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:8px;">${itv.matricula} · ${itv.marca} ${itv.modelo}</td>
                      <td style="padding:8px;">${formatDate(itv.fechaproximarevision)}</td>
                      <td style="padding:8px; color:${color}; font-weight:600;">${estadoTexto}</td>
                    </tr>
                  `
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `
    }

    const contenidoHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alertas ITV</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background:#f5f5f5; padding:20px;">
        <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; padding:24px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
          <h2 style="margin:0 0 8px 0; color:#111827;">🚗 Alertas ITV</h2>
          <p style="margin:0 0 16px 0; color:#6b7280;">
            Resumen de ITVs vencidas y próximas a vencer (hasta ${payload.fechaLimite.toLocaleDateString("es-ES")}).
          </p>
          ${renderLista(payload.vencidas, "vencida")}
          ${renderLista(payload.proximas, "proxima")}
          <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e5e7eb; color:#9ca3af; font-size:12px; text-align:center;">
            ${avisoFooterHtml}
          </div>
        </div>
      </body>
      </html>
    `

    const asunto = `📅 Alertas ITV · Vencidas: ${payload.vencidas.length} · Próximas: ${payload.proximas.length}`

    const destinatarios = Array.isArray(emailDestino) ? emailDestino : [emailDestino]
    const opcionesEnvio: any = {
      from: { name: fromName, address: fromEmail },
      subject: asunto,
      html: contenidoHTML,
    }

    opcionesEnvio.to = destinatarios.length > 1 ? destinatarios : destinatarios[0]

    const info = await transporter.sendMail(opcionesEnvio)

    console.log("📧 Email alertas ITV enviado:", info.messageId)

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("❌ Error enviando email alertas ITV:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error enviando email de alertas ITV",
    }
  }
}

// Email de alertas de mantenimiento
export async function enviarEmailAlertasMantenimiento(
  emailDestino: string,
  payload: {
    vencidas: Array<{
      matricula: string
      marca: string
      modelo: string
      fecha_proximo: string
      kms_proximo: number
      dias?: number
    }>
    proximas: Array<{
      matricula: string
      marca: string
      modelo: string
      fecha_proximo: string
      kms_proximo: number
      dias?: number
    }>
    fechaLimite: Date
  }
) {
  try {
    const transporter = createEmailTransporter()

    const formatDate = (fecha: string) =>
      new Date(fecha).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })

    const renderLista = (
      items: Array<{
        matricula: string
        marca: string
        modelo: string
        fecha_proximo: string
        kms_proximo: number
        dias?: number
      }>,
      tipo: "vencida" | "proxima"
    ) => {
      if (items.length === 0) return ""
      const titulo = tipo === "vencida" ? "Mantenimientos Vencidos" : "Mantenimientos Próximos (≤ 30 días)"
      const color = tipo === "vencida" ? "#ef4444" : "#f59e0b"
      const descripcion =
        tipo === "vencida"
          ? "Estos mantenimientos ya han superado la fecha recomendada."
          : "Estos mantenimientos están dentro del plazo de 30 días para realizarse."

      return `
        <div style="margin: 20px 0;">
          <h3 style="color: ${color}; margin-bottom: 6px;">${titulo} (${items.length})</h3>
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">${descripcion}</p>
          <table style="width:100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="text-align:left; background:#f3f4f6;">
                <th style="padding:8px;">Vehículo</th>
                <th style="padding:8px;">Próximo mantenimiento</th>
                <th style="padding:8px;">Kms recomendados</th>
                <th style="padding:8px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map((mantenimiento) => {
                  const dias = typeof mantenimiento.dias === "number" ? mantenimiento.dias : null
                  const estadoTexto =
                    tipo === "vencida"
                      ? `Vencido hace ${Math.abs(dias ?? 0)} días`
                      : `En ${dias ?? ""} días`
                  return `
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:8px;">${mantenimiento.matricula} · ${mantenimiento.marca} ${mantenimiento.modelo}</td>
                      <td style="padding:8px;">${formatDate(mantenimiento.fecha_proximo)}</td>
                      <td style="padding:8px;">${mantenimiento.kms_proximo.toLocaleString("es-ES")} km</td>
                      <td style="padding:8px; color:${color}; font-weight:600;">${estadoTexto}</td>
                    </tr>
                  `
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `
    }

    const contenidoHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alertas de Mantenimiento</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background:#f5f5f5; padding:20px;">
        <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; padding:24px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
          <h2 style="margin:0 0 8px 0; color:#111827;">🔧 Alertas de Mantenimiento</h2>
          <p style="margin:0 0 16px 0; color:#6b7280;">
            Resumen de mantenimientos vencidos y próximos (hasta ${payload.fechaLimite.toLocaleDateString("es-ES")}).
          </p>
          ${renderLista(payload.vencidas, "vencida")}
          ${renderLista(payload.proximas, "proxima")}
          <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e5e7eb; color:#9ca3af; font-size:12px; text-align:center;">
            ${avisoFooterHtml}
          </div>
        </div>
      </body>
      </html>
    `

    const asunto = `🔧 Alertas Mantenimiento · Vencidos: ${payload.vencidas.length} · Próximos: ${payload.proximas.length}`

    const info = await transporter.sendMail({
      from: { name: fromName, address: fromEmail },
      to: emailDestino,
      subject: asunto,
      html: contenidoHTML,
    })

    console.log("📧 Email alertas mantenimiento enviado:", info.messageId)

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("❌ Error enviando email alertas mantenimiento:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error enviando email de alertas mantenimiento",
    }
  }
}
