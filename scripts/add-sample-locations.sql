-- Script para agregar ubicaciones de ejemplo a los coches existentes
-- Actualiza algunos coches con coordenadas de ciudades españolas

UPDATE coches 
SET 
  latitud = 40.4168,
  longitud = -3.7038,
  ultima_ubicacion = NOW(),
  direccion_actual = 'Madrid, España'
WHERE matricula IN (
  SELECT matricula FROM coches 
  WHERE donante = false 
  LIMIT 1
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
  AND matricula NOT IN (
    SELECT matricula FROM coches WHERE latitud IS NOT NULL
  )
  LIMIT 1
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
  AND matricula NOT IN (
    SELECT matricula FROM coches WHERE latitud IS NOT NULL
  )
  LIMIT 1
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
  AND matricula NOT IN (
    SELECT matricula FROM coches WHERE latitud IS NOT NULL
  )
  LIMIT 1
);

UPDATE coches 
SET 
  latitud = 43.2627,
  longitud = -2.9253,
  ultima_ubicacion = NOW(),
  direccion_actual = 'Bilbao, España'
WHERE matricula IN (
  SELECT matricula FROM coches 
  WHERE donante = false 
  AND matricula NOT IN (
    SELECT matricula FROM coches WHERE latitud IS NOT NULL
  )
  LIMIT 1
);

-- Mostrar resultados
SELECT 
  matricula, 
  marca, 
  modelo, 
  latitud, 
  longitud, 
  direccion_actual,
  donante
FROM coches 
WHERE latitud IS NOT NULL 
ORDER BY ultima_ubicacion DESC;
