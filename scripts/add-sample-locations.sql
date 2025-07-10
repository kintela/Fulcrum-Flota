-- Script para agregar ubicaciones de ejemplo a algunos coches
-- Ubicaciones en España para testing

UPDATE coches 
SET 
  latitud = 40.4168,
  longitud = -3.7038,
  ultima_ubicacion = NOW(),
  direccion_actual = 'Madrid, España'
WHERE matricula IN (
  SELECT matricula FROM coches 
  WHERE donante = false 
  LIMIT 3
);

UPDATE coches 
SET 
  latitud = 41.3851,
  longitud = 2.1734,
  ultima_ubicacion = NOW(),
  direccion_actual = 'Barcelona, España'
WHERE matricula IN (
  SELECT matricula FROM coches 
  WHERE donante = false 
  AND latitud IS NULL
  LIMIT 2
);

UPDATE coches 
SET 
  latitud = 37.3891,
  longitud = -5.9845,
  ultima_ubicacion = NOW(),
  direccion_actual = 'Sevilla, España'
WHERE matricula IN (
  SELECT matricula FROM coches 
  WHERE donante = false 
  AND latitud IS NULL
  LIMIT 2
);

UPDATE coches 
SET 
  latitud = 39.4699,
  longitud = -0.3763,
  ultima_ubicacion = NOW(),
  direccion_actual = 'Valencia, España'
WHERE matricula IN (
  SELECT matricula FROM coches 
  WHERE donante = false 
  AND latitud IS NULL
  LIMIT 1
);
