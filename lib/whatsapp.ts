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

    console.log(`✅ WhatsApp enviado exitosamente. SID: ${twilioMessage.sid}`);
    
    return {
      success: true,
      messageSid: twilioMessage.sid,
      status: twilioMessage.status
    };

  } catch (error) {
    console.error('❌ Error enviando WhatsApp:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
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
