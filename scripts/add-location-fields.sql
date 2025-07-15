-- Agregar campos de ubicación a la tabla coches
ALTER TABLE coches 
ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitud DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS ultima_ubicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS direccion_actual TEXT;

-- Crear índice para consultas de ubicación más rápidas
CREATE INDEX IF NOT EXISTS idx_coches_ubicacion ON coches(latitud, longitud);

-- Agregar algunos datos de ejemplo (ubicaciones en Madrid y alrededores)
UPDATE coches SET 
  latitud = 40.4168 + (RANDOM() - 0.5) * 0.1,
  longitud = -3.7038 + (RANDOM() - 0.5) * 0.1,
  ultima_ubicacion = NOW() - INTERVAL '1 hour' * RANDOM() * 24
WHERE matricula IS NOT NULL
LIMIT 5;
