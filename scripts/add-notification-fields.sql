-- Agregar columnas para el sistema de notificaciones de reservas
-- Ejecutar este script en Supabase SQL Editor

-- Notificación de inicio de reserva
ALTER TABLE reservas 
ADD COLUMN IF NOT EXISTS notificacion_inicio_reserva_enviada BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN reservas.notificacion_inicio_reserva_enviada IS 'Indica si se ha enviado notificación de inicio de reserva';

ALTER TABLE reservas 
ADD COLUMN IF NOT EXISTS fecha_notificacion_inicio_reserva TIMESTAMPTZ;

COMMENT ON COLUMN reservas.fecha_notificacion_inicio_reserva IS 'Fecha y hora en que se envió la notificación de inicio de reserva';

-- Notificación de reserva vencida
ALTER TABLE reservas 
ADD COLUMN IF NOT EXISTS notificacion_reserva_vencida_enviada BOOLEAN DEFAULT FALSE;

-- Agregar columna para registrar cuándo se envió la notificación
ALTER TABLE reservas 
ADD COLUMN IF NOT EXISTS fecha_notificacion_reserva_vencida TIMESTAMPTZ;

-- Crear índice para optimizar consultas de reservas vencidas
CREATE INDEX IF NOT EXISTS idx_reservas_vencidas 
ON reservas (estado, fecha_fin, notificacion_reserva_vencida_enviada) 
WHERE estado = 'activa';

-- Agregar comentarios para documentar las columnas
COMMENT ON COLUMN reservas.notificacion_reserva_vencida_enviada IS 'Indica si se ha enviado notificación de reserva vencida';
COMMENT ON COLUMN reservas.fecha_notificacion_reserva_vencida IS 'Fecha y hora en que se envió la notificación de reserva vencida';

-- IMPORTANTE: El sistema de notificaciones automáticamente:
-- 1. Envía email de inicio al activar una reserva pendiente (notificacion_inicio_reserva_enviada = true)
-- 2. Envía email cuando una reserva vence (notificacion_reserva_vencida_enviada = true)
-- 3. Guarda la fecha de notificación de vencida (fecha_notificacion_reserva_vencida)

-- Mostrar estructura actualizada de la tabla
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'reservas' 
ORDER BY ordinal_position;
