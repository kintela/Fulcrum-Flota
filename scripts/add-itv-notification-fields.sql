-- Agregar columnas para alertas de ITV
-- Ejecutar este script en Supabase SQL Editor

ALTER TABLE itvs
ADD COLUMN IF NOT EXISTS notificacion_itv_vencida_enviada BOOLEAN DEFAULT FALSE;

ALTER TABLE itvs
ADD COLUMN IF NOT EXISTS fecha_notificacion_itv_vencida TIMESTAMPTZ;

ALTER TABLE itvs
ADD COLUMN IF NOT EXISTS notificacion_itv_proxima_enviada BOOLEAN DEFAULT FALSE;

ALTER TABLE itvs
ADD COLUMN IF NOT EXISTS fecha_notificacion_itv_proxima TIMESTAMPTZ;

-- Índices opcionales para consultas de alertas
CREATE INDEX IF NOT EXISTS idx_itvs_alerta_vencida
ON itvs (fechaproximarevision, notificacion_itv_vencida_enviada);

CREATE INDEX IF NOT EXISTS idx_itvs_alerta_proxima
ON itvs (fechaproximarevision, notificacion_itv_proxima_enviada);

COMMENT ON COLUMN itvs.notificacion_itv_vencida_enviada IS 'Indica si se envió aviso de ITV vencida';
COMMENT ON COLUMN itvs.fecha_notificacion_itv_vencida IS 'Fecha de aviso de ITV vencida';
COMMENT ON COLUMN itvs.notificacion_itv_proxima_enviada IS 'Indica si se envió aviso de ITV próxima';
COMMENT ON COLUMN itvs.fecha_notificacion_itv_proxima IS 'Fecha de aviso de ITV próxima';
