-- Habilitar extensiones necesarias para Supabase
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla de reservas temporales de coches
CREATE TABLE reservas (
    id SERIAL PRIMARY KEY,
    matricula VARCHAR(20) NOT NULL,
    empleado_id INTEGER NOT NULL,
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'completada', 'cancelada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Restricciones de clave foránea
    CONSTRAINT fk_reservas_matricula 
        FOREIGN KEY (matricula) 
        REFERENCES coches(matricula) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_reservas_empleado 
        FOREIGN KEY (empleado_id) 
        REFERENCES empleados(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- Restricción para asegurar que fecha_fin sea posterior a fecha_inicio
    CONSTRAINT chk_fechas_validas 
        CHECK (fecha_fin > fecha_inicio)
        
    -- NOTA: La restricción de solapamiento temporal se implementará con un índice único compuesto
    -- en lugar de EXCLUDE constraint para mayor compatibilidad con Supabase
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_reservas_matricula ON reservas(matricula);
CREATE INDEX idx_reservas_empleado_id ON reservas(empleado_id);
CREATE INDEX idx_reservas_fechas ON reservas(fecha_inicio, fecha_fin);
CREATE INDEX idx_reservas_estado ON reservas(estado);
CREATE INDEX idx_reservas_created_at ON reservas(created_at);

-- Índice compuesto para detectar solapamientos temporales de forma eficiente
-- Este índice ayudará en las consultas para verificar conflictos de reservas
CREATE INDEX idx_reservas_overlap_check ON reservas(matricula, fecha_inicio, fecha_fin) 
WHERE estado = 'activa';

-- Función para verificar solapamientos de reservas antes de insertar/actualizar
CREATE OR REPLACE FUNCTION check_reserva_overlap()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si existe alguna reserva activa que se solape con la nueva
    IF EXISTS (
        SELECT 1 FROM reservas 
        WHERE matricula = NEW.matricula 
        AND estado = 'activa'
        AND id != COALESCE(NEW.id, 0) -- Excluir el registro actual en caso de UPDATE
        AND (
            (NEW.fecha_inicio >= fecha_inicio AND NEW.fecha_inicio < fecha_fin) OR
            (NEW.fecha_fin > fecha_inicio AND NEW.fecha_fin <= fecha_fin) OR
            (NEW.fecha_inicio <= fecha_inicio AND NEW.fecha_fin >= fecha_fin)
        )
    ) THEN
        RAISE EXCEPTION 'Ya existe una reserva activa para el vehículo % en el período solicitado', NEW.matricula;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para verificar solapamientos antes de insertar/actualizar
CREATE TRIGGER check_reserva_overlap_trigger
    BEFORE INSERT OR UPDATE ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION check_reserva_overlap();

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_reservas_updated_at 
    BEFORE UPDATE ON reservas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentar la tabla
COMMENT ON TABLE reservas IS 'Tabla para gestionar reservas temporales de vehículos';
COMMENT ON COLUMN reservas.id IS 'Identificador único de la reserva';
COMMENT ON COLUMN reservas.matricula IS 'Matrícula del vehículo reservado (FK a coches.matricula)';
COMMENT ON COLUMN reservas.empleado_id IS 'ID del empleado que realiza la reserva (FK a empleados.id)';
COMMENT ON COLUMN reservas.fecha_inicio IS 'Fecha y hora de inicio de la reserva';
COMMENT ON COLUMN reservas.fecha_fin IS 'Fecha y hora de fin de la reserva';
COMMENT ON COLUMN reservas.observaciones IS 'Observaciones adicionales sobre la reserva';
COMMENT ON COLUMN reservas.estado IS 'Estado de la reserva: activa, completada, cancelada';
COMMENT ON COLUMN reservas.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN reservas.updated_at IS 'Fecha de última actualización del registro';
