-- Script para agregar ubicaciones de ejemplo a los coches existentes
-- Actualizar algunos coches con ubicaciones en España

UPDATE coches 
SET 
  latitud = 40.4168,
  longitud = -3.7038,
  direccion_actual = 'Madrid, España',
  ultima_ubicacion = NOW()
WHERE matricula IN (
  SELECT matricula 
  FROM coches 
  WHERE donante = false 
  LIMIT 3
);

UPDATE coches 
SET 
  latitud = 41.3851,
  longitud = 2.1734,
  direccion_actual = 'Barcelona, España',
  ultima_ubicacion = NOW()
WHERE matricula IN (
  SELECT matricula 
  FROM coches 
  WHERE donante = false 
  AND latitud IS NULL
  LIMIT 2
);

UPDATE coches 
SET 
  latitud = 37.3891,
  longitud = -5.9845,
  direccion_actual = 'Sevilla, España',
  ultima_ubicacion = NOW()
WHERE matricula IN (
  SELECT matricula 
  FROM coches 
  WHERE donante = false 
  AND latitud IS NULL
  LIMIT 2
);

UPDATE coches 
SET 
  latitud = 39.4699,
  longitud = -0.3763,
  direccion_actual = 'Valencia, España',
  ultima_ubicacion = NOW()
WHERE matricula IN (
  SELECT matricula 
  FROM coches 
  WHERE donante = false 
  AND latitud IS NULL
  LIMIT 1
);
