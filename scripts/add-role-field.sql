-- Script para añadir el campo role a la tabla empleados

-- Añadir la columna role con valor por defecto 'usuario'
ALTER TABLE empleados 
ADD COLUMN role VARCHAR(20) DEFAULT 'usuario' CHECK (role IN ('administrador', 'usuario'));

-- Opcional: Actualizar algunos empleados existentes como administradores
-- (Debes cambiar estos emails por los emails reales de los administradores)
-- UPDATE empleados 
-- SET role = 'administrador' 
-- WHERE email IN ('admin@fulcrum.es', 'director@fulcrum.es');

-- Verificar la estructura actualizada
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'empleados' 
-- ORDER BY ordinal_position;
