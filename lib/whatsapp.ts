import twilio from 'twilio';

// Inicializar cliente de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM || '+14155238886';

if (!accountSid || !authToken) {
  console.error('Faltan credenciales de Twilio en variables de entorno');
}

const client = twilio(accountSid, authToken);

interface WhatsAppMessage {
  to: string; // Número en formato internacional +34XXXXXXXXX
  message: string;
  mediaUrl?: string; // URL opcional de imagen/archivo
}

// Env var para activar sondeo de estado tras enviar ("true"/"1")
const trackStatus = (process.env.TWILIO_WHATSAPP_TRACK_STATUS || '').toLowerCase() === 'true' || process.env.TWILIO_WHATSAPP_TRACK_STATUS === '1'

export async function sendWhatsAppMessage({ to, message, mediaUrl }: WhatsAppMessage) {
  try {
    // Validar formato del número (debe incluir código de país)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to)) {
      throw new Error(`Formato de número inválido: ${to}. Debe incluir código de país (+34XXXXXXXXX)`);
    }

    console.log(`📱 Enviando WhatsApp a ${to}:`, message);

    const messageData: any = {
      from: `whatsapp:${fromWhatsApp}`,
      to: `whatsapp:${to}`,
      body: message,
    };

    // Agregar media si se proporciona
    if (mediaUrl) {
      messageData.mediaUrl = [mediaUrl];
    }

    const twilioMessage = await client.messages.create(messageData);

    console.log(`✅ WhatsApp enviado exitosamente. SID: ${twilioMessage.sid} status inicial: ${twilioMessage.status}`);

    let finalStatus = twilioMessage.status;
    let errorCode: string | number | undefined = (twilioMessage as any).errorCode;
    let errorMessage: string | undefined = (twilioMessage as any).errorMessage;

    if (trackStatus) {
      // Sondear hasta 6 veces (unos ~9s) para intentar obtener delivered / failed
      for (let intento = 0; intento < 6; intento++) {
        if ([ 'delivered', 'failed', 'undelivered', 'read', 'canceled' ].includes(finalStatus)) break;
        await new Promise(r => setTimeout(r, 1500));
        try {
          const fetched = await client.messages(twilioMessage.sid).fetch();
            finalStatus = fetched.status as typeof finalStatus;
            errorCode = (fetched as any).errorCode;
            errorMessage = (fetched as any).errorMessage;
            console.log(`[WhatsApp Tracking] intento ${intento+1} status=${finalStatus} errorCode=${errorCode ?? ''}`);
        } catch (e) {
          console.warn('[WhatsApp Tracking] error al sondear estado', e);
          break;
        }
      }
    }

    return {
      success: true,
      messageSid: twilioMessage.sid,
      status: finalStatus,
      errorCode,
      errorMessage,
      tracked: trackStatus
    };

  } catch (error) {
    console.error('❌ Error enviando WhatsApp:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// Helper para depurar un SID concreto (se podría exponer por una ruta admin si hiciera falta)
export async function debugWhatsAppMessage(sid: string) {
  try {
    const msg = await client.messages(sid).fetch();
    console.log('[WhatsApp Debug]', {
      sid: msg.sid,
      status: msg.status,
      to: msg.to,
      from: msg.from,
      errorCode: (msg as any).errorCode,
      errorMessage: (msg as any).errorMessage,
      dateSent: msg.dateSent,
      dateCreated: msg.dateCreated,
      dateUpdated: msg.dateUpdated
    });
    return {
      success: true,
      status: msg.status,
      errorCode: (msg as any).errorCode,
      errorMessage: (msg as any).errorMessage
    }
  } catch (e:any) {
    console.error('[WhatsApp Debug] fallo', e);
    return { success:false, error: e.message }
  }
}

export async function sendWhatsAppNotification(
  phoneNumber: string, 
  empleadoNombre: string, 
  vehiculoMatricula: string, 
  fechaInicio: Date,
  fechaFin: Date,
  tiempoVencido: string
) {
  // Formatear fechas en hora española
  const fechaInicioEspañol = fechaInicio.toLocaleString('es-ES', { 
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const fechaFinEspañol = fechaFin.toLocaleString('es-ES', { 
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const message = `🚗 *NOTIFICACIÓN FULCRUM FLOTA*

Hola ${empleadoNombre},

El vehículo con matrícula *${vehiculoMatricula}* que tienes asignado lleva *${tiempoVencido}* de retraso en su devolución.

📅 *Detalles de la reserva:*
• Inicio: ${fechaInicioEspañol}
• Fin: ${fechaFinEspañol}
• Tiempo vencido: ${tiempoVencido}

Por favor, devuelve el vehículo lo antes posible.

_Mensaje automático del sistema de gestión de flota._`;

  return await sendWhatsAppMessage({
    to: phoneNumber,
    message: message
  });
}

// Función para formatear número de teléfono español
export function formatSpanishPhone(phone: string): string {
  // Remover espacios, guiones y otros caracteres
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Si ya tiene código de país, devolverlo tal como está
  if (cleanPhone.startsWith('+34')) {
    return cleanPhone;
  }
  
  // Si empieza con 34, agregar +
  if (cleanPhone.startsWith('34')) {
    return `+${cleanPhone}`;
  }
  
  // Si es número nacional (9 dígitos), agregar +34
  if (cleanPhone.length === 9) {
    return `+34${cleanPhone}`;
  }
  
  // Devolver tal como está si no coincide con ningún patrón
  return cleanPhone;
}
