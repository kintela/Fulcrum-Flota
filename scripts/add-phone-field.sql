-- Agregar campo teléfono a la tabla empleados
ALTER TABLE empleados 
ADD COLUMN telefono VARCHAR(20) DEFAULT NULL;

-- Agregar comentario para documentar el formato esperado
COMMENT ON COLUMN empleados.telefono IS 'Número de teléfono en formato internacional (+34XXXXXXXXX) para WhatsApp';

-- Opcional: Agregar algunos números de ejemplo (cambiar por los reales)
UPDATE empleados SET telefono = '+34600123456' WHERE id = 1;
UPDATE empleados SET telefono = '+34600123457' WHERE id = 2;
UPDATE empleados SET telefono = '+34600123458' WHERE id = 3;
