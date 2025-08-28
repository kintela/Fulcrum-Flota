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
    user: process.env.EMAIL_USER || '', // Por ejemplo: notifications@fulcrum.es
    pass: process.env.EMAIL_PASSWORD || '', // Contraseña de la aplicación
  },
};

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
            <p><strong>Fulcrum Fleet Management</strong></p>
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
Gestor de Flota Fulcrum
Este es un mensaje automático. Por favor, no responda a este email.
Para consultas, contacte con Roberto Quintela.
    `;

    const mailOptions = {
      from: {
        name: 'Fulcrum Fleet Management',
        address: emailConfig.auth.user
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
        name: 'Fulcrum Fleet Management',
        address: emailConfig.auth.user
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
Fulcrum Fleet Management
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
        <p>Fulcrum Fleet Management</p>
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
        <p>Fulcrum Fleet Management - Sistema de Notificaciones Automáticas</p>
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
