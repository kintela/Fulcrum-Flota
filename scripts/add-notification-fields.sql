-- Agregar columnas para el sistema de notificaciones de reservas vencidas
-- Ejecutar este script en Supabase SQL Editor

-- Agregar columna para marcar si se envió notificación
ALTER TABLE reservas 
ADD COLUMN IF NOT EXISTS notificacion_enviada BOOLEAN DEFAULT FALSE;

-- Agregar columna para registrar cuándo se envió la notificación
ALTER TABLE reservas 
ADD COLUMN IF NOT EXISTS fecha_notificacion TIMESTAMPTZ;

-- Crear índice para optimizar consultas de reservas vencidas
CREATE INDEX IF NOT EXISTS idx_reservas_vencidas 
ON reservas (estado, fecha_fin, notificacion_enviada) 
WHERE estado = 'activa';

-- Agregar comentarios para documentar las columnas
COMMENT ON COLUMN reservas.notificacion_enviada IS 'Indica si se ha enviado notificación de reserva vencida';
COMMENT ON COLUMN reservas.fecha_notificacion IS 'Fecha y hora en que se envió la notificación de reserva vencida';

-- IMPORTANTE: El sistema de notificaciones automáticamente:
-- 1. Envía email al usuario cuando una reserva vence (más de 1 hora tras fecha_fin)
-- 2. Marca la reserva como 'completada' automáticamente
-- 3. Registra la notificación enviada (notificacion_enviada = true)
-- 4. Guarda la fecha de notificación (fecha_notificacion)

-- Mostrar estructura actualizada de la tabla
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'reservas' 
ORDER BY ordinal_position;
