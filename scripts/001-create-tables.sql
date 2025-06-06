-- Crear tabla de coches
CREATE TABLE IF NOT EXISTS coches (
    id SERIAL PRIMARY KEY,
    matricula VARCHAR(10) UNIQUE NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    color VARCHAR(30) NOT NULL,
    kms INTEGER DEFAULT 0,
    combustible VARCHAR(20) NOT NULL,
    asignado_a VARCHAR(100),
    es_donante BOOLEAN DEFAULT FALSE,
    es_alquiler BOOLEAN DEFAULT FALSE,
    estado VARCHAR(20) DEFAULT 'Disponible',
    fecha_seguro DATE,
    fecha_itv DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de empleados
CREATE TABLE IF NOT EXISTS empleados (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    departamento VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de reservas
CREATE TABLE IF NOT EXISTS reservas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    empleado_id INTEGER REFERENCES empleados(id),
    coche_id INTEGER REFERENCES coches(id),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    proposito TEXT,
    estado VARCHAR(20) DEFAULT 'Pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar algunos empleados de ejemplo
INSERT INTO empleados (nombre, email, departamento) VALUES
('Carlos García', 'carlos.garcia@fulcrum.com', 'Ventas'),
('María López', 'maria.lopez@fulcrum.com', 'Marketing'),
('Juan Martínez', 'juan.martinez@fulcrum.com', 'IT'),
('Ana Rodríguez', 'ana.rodriguez@fulcrum.com', 'RRHH'),
('Pedro Sánchez', 'pedro.sanchez@fulcrum.com', 'Finanzas'),
('Laura Fernández', 'laura.fernandez@fulcrum.com', 'Operaciones'),
('Miguel Torres', 'miguel.torres@fulcrum.com', 'Ventas')
ON CONFLICT (email) DO NOTHING;
