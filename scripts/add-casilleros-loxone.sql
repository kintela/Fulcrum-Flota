-- Modelo base para integrar casilleros Loxone en el flujo de reservas
-- Ejecutar manualmente en Supabase SQL Editor
--
-- Objetivos:
-- 1. Asociar un casillero fisico a un coche reservable.
-- 2. Guardar en cada reserva el casillero usado en ese momento.
-- 3. Registrar los codigos emitidos para cada reserva.
-- 4. Auditar aperturas y acciones de Loxone/app sobre los casilleros.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reusar la funcion generica de updated_at ya utilizada por reservas.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1) Casilleros fisicos y su asociacion con coches.
CREATE TABLE IF NOT EXISTS casilleros (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    matricula VARCHAR(20) UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    loxone_control_uuid TEXT NOT NULL,
    loxone_output_number INTEGER NOT NULL CHECK (loxone_output_number > 0),
    loxone_output_key VARCHAR(10) NOT NULL,
    notas TEXT,
    ultima_sincronizacion_loxone TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_casilleros_matricula
        FOREIGN KEY (matricula)
        REFERENCES coches(matricula)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT uq_casillero_loxone_output
        UNIQUE (loxone_control_uuid, loxone_output_number)
);

CREATE INDEX IF NOT EXISTS idx_casilleros_activo ON casilleros(activo);
CREATE INDEX IF NOT EXISTS idx_casilleros_matricula ON casilleros(matricula);

DROP TRIGGER IF EXISTS update_casilleros_updated_at ON casilleros;
CREATE TRIGGER update_casilleros_updated_at
    BEFORE UPDATE ON casilleros
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE casilleros IS 'Casilleros fisicos de Loxone asociados a coches reservables';
COMMENT ON COLUMN casilleros.codigo IS 'Clave estable interna, por ejemplo CASILLERO_1';
COMMENT ON COLUMN casilleros.nombre IS 'Nombre visible del casillero';
COMMENT ON COLUMN casilleros.matricula IS 'Coche actualmente asociado al casillero';
COMMENT ON COLUMN casilleros.loxone_control_uuid IS 'UUID del bloque NFC Code Touch en Loxone';
COMMENT ON COLUMN casilleros.loxone_output_number IS 'Salida fisica del bloque Loxone';
COMMENT ON COLUMN casilleros.loxone_output_key IS 'Clave visual del output, por ejemplo q1';

-- 2) Snapshot del casillero usado por una reserva.
ALTER TABLE reservas
ADD COLUMN IF NOT EXISTS casillero_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'reservas'
          AND constraint_name = 'fk_reservas_casillero'
    ) THEN
        ALTER TABLE reservas
        ADD CONSTRAINT fk_reservas_casillero
            FOREIGN KEY (casillero_id)
            REFERENCES casilleros(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservas_casillero_id ON reservas(casillero_id);

COMMENT ON COLUMN reservas.casillero_id IS 'Casillero asignado a la reserva en el momento de su creacion';

-- 3) Codigos de acceso emitidos por reserva.
-- Nota: para la fase 1 se guarda el codigo en claro para poder reenviarlo por email.
-- Recomendacion futura: cifrar en la app y dejar aqui solo version cifrada + mascara.
CREATE TABLE IF NOT EXISTS reservas_codigos_acceso (
    id BIGSERIAL PRIMARY KEY,
    reserva_id INTEGER NOT NULL,
    casillero_id BIGINT NOT NULL,
    codigo_acceso TEXT NOT NULL,
    codigo_hint VARCHAR(16),
    nombre_loxone VARCHAR(150),
    loxone_control_uuid TEXT NOT NULL,
    loxone_output_number INTEGER NOT NULL CHECK (loxone_output_number > 0),
    loxone_code_uuid TEXT,
    fecha_desde TIMESTAMPTZ NOT NULL,
    fecha_hasta TIMESTAMPTZ NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente_creacion',
    motivo_fin VARCHAR(30),
    email_enviado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_email_enviado TIMESTAMPTZ,
    revocado_en TIMESTAMPTZ,
    ultimo_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_reservas_codigos_acceso_reserva
        FOREIGN KEY (reserva_id)
        REFERENCES reservas(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_reservas_codigos_acceso_casillero
        FOREIGN KEY (casillero_id)
        REFERENCES casilleros(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_reservas_codigos_acceso_fechas
        CHECK (fecha_hasta > fecha_desde),

    CONSTRAINT chk_reservas_codigos_acceso_estado
        CHECK (
            estado IN (
                'pendiente_creacion',
                'activo',
                'revocado',
                'expirado',
                'error_creacion',
                'error_revocacion'
            )
        ),

    CONSTRAINT chk_reservas_codigos_acceso_motivo_fin
        CHECK (
            motivo_fin IS NULL OR motivo_fin IN (
                'completada',
                'cancelada',
                'manual',
                'reemplazado',
                'expirada',
                'error'
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_reservas_codigos_acceso_reserva_id
    ON reservas_codigos_acceso(reserva_id);

CREATE INDEX IF NOT EXISTS idx_reservas_codigos_acceso_casillero_id
    ON reservas_codigos_acceso(casillero_id);

CREATE INDEX IF NOT EXISTS idx_reservas_codigos_acceso_estado
    ON reservas_codigos_acceso(estado);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reservas_codigos_acceso_loxone_code_uuid
    ON reservas_codigos_acceso(loxone_code_uuid)
    WHERE loxone_code_uuid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reservas_codigos_acceso_reserva_abierta
    ON reservas_codigos_acceso(reserva_id)
    WHERE estado IN ('pendiente_creacion', 'activo');

DROP TRIGGER IF EXISTS update_reservas_codigos_acceso_updated_at ON reservas_codigos_acceso;
CREATE TRIGGER update_reservas_codigos_acceso_updated_at
    BEFORE UPDATE ON reservas_codigos_acceso
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE reservas_codigos_acceso IS 'Codigos emitidos para abrir un casillero durante la vida de una reserva';
COMMENT ON COLUMN reservas_codigos_acceso.codigo_acceso IS 'Codigo que recibira el usuario para abrir el casillero';
COMMENT ON COLUMN reservas_codigos_acceso.codigo_hint IS 'Version reducida del codigo para mostrar en listados, por ejemplo ultimos 2-4 digitos';
COMMENT ON COLUMN reservas_codigos_acceso.loxone_code_uuid IS 'UUID del codigo devuelto por Loxone, necesario para revocarlo';
COMMENT ON COLUMN reservas_codigos_acceso.estado IS 'Estado de sincronizacion y vigencia del codigo respecto a Loxone';

-- 4) Auditoria de acciones y accesos de casilleros.
CREATE TABLE IF NOT EXISTS casilleros_eventos (
    id BIGSERIAL PRIMARY KEY,
    casillero_id BIGINT NOT NULL,
    reserva_id INTEGER,
    reserva_codigo_acceso_id BIGINT,
    origen VARCHAR(20) NOT NULL DEFAULT 'loxone',
    tipo_evento VARCHAR(40) NOT NULL,
    fecha_evento TIMESTAMPTZ NOT NULL,
    loxone_event_type INTEGER,
    loxone_output_number INTEGER,
    loxone_user TEXT,
    detalles JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_casilleros_eventos_casillero
        FOREIGN KEY (casillero_id)
        REFERENCES casilleros(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_casilleros_eventos_reserva
        FOREIGN KEY (reserva_id)
        REFERENCES reservas(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_casilleros_eventos_reserva_codigo
        FOREIGN KEY (reserva_codigo_acceso_id)
        REFERENCES reservas_codigos_acceso(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT chk_casilleros_eventos_origen
        CHECK (origen IN ('loxone', 'app', 'system', 'manual')),

    CONSTRAINT chk_casilleros_eventos_tipo
        CHECK (
            tipo_evento IN (
                'codigo_creado',
                'codigo_revocado',
                'apertura_permitida',
                'codigo_denegado',
                'salida_disparada',
                'historial_sync',
                'otro'
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_casilleros_eventos_casillero_fecha
    ON casilleros_eventos(casillero_id, fecha_evento DESC);

CREATE INDEX IF NOT EXISTS idx_casilleros_eventos_reserva_fecha
    ON casilleros_eventos(reserva_id, fecha_evento DESC);

COMMENT ON TABLE casilleros_eventos IS 'Auditoria de aperturas, denegaciones y acciones de la app sobre casilleros';
COMMENT ON COLUMN casilleros_eventos.detalles IS 'Payload libre para guardar datos crudos de Loxone o trazas de app';

-- 5) Hardening RLS
-- Estas tablas contienen datos sensibles:
-- - relacion coche <-> casillero
-- - codigos de acceso de reserva
-- - auditoria de accesos y denegaciones
-- El patron del proyecto es acceder desde backend con SUPABASE_SERVICE_ROLE_KEY,
-- dejando acceso directo bloqueado para anon/authenticated.
ALTER TABLE IF EXISTS casilleros ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservas_codigos_acceso ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS casilleros_eventos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE casilleros FROM anon, authenticated;
REVOKE ALL ON TABLE reservas_codigos_acceso FROM anon, authenticated;
REVOKE ALL ON TABLE casilleros_eventos FROM anon, authenticated;

-- Ejemplo de uso operativo esperado:
-- 1. El coche reservable tiene un casillero asociado en casilleros.
-- 2. Al crear una reserva:
--    - se fija reservas.casillero_id
--    - se inserta una fila en reservas_codigos_acceso
--    - se crea el codigo en Loxone y se guarda loxone_code_uuid
--    - se envia email al usuario con los datos de la reserva y el PIN
-- 3. Al cancelar o completar la reserva:
--    - se revoca el codigo en Loxone
--    - se marca el registro de reservas_codigos_acceso como revocado
--    - se inserta evento en casilleros_eventos
-- 4. Al sincronizar el historial de Loxone:
--    - se insertan filas en casilleros_eventos para aperturas permitidas/denegadas.
