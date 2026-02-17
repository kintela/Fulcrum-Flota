-- Migración para restringir seguros.tipo a una enumeración fija.
-- Valores permitidos:
-- - Terceros
-- - Terceros Ampliado
-- - Todo Riesgo
-- - Todo Riesgo con Franquicia

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'seguro_tipo_enum'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.seguro_tipo_enum AS ENUM (
      'Terceros',
      'Terceros Ampliado',
      'Todo Riesgo',
      'Todo Riesgo con Franquicia'
    );
  END IF;
END
$$;

ALTER TYPE public.seguro_tipo_enum ADD VALUE IF NOT EXISTS 'Terceros';
ALTER TYPE public.seguro_tipo_enum ADD VALUE IF NOT EXISTS 'Terceros Ampliado';
ALTER TYPE public.seguro_tipo_enum ADD VALUE IF NOT EXISTS 'Todo Riesgo';
ALTER TYPE public.seguro_tipo_enum ADD VALUE IF NOT EXISTS 'Todo Riesgo con Franquicia';

-- Normaliza posibles variaciones previas para evitar errores en el ALTER TYPE.
UPDATE public.seguros
SET tipo = CASE
  WHEN trim(lower(tipo)) = 'terceros' THEN 'Terceros'
  WHEN trim(lower(tipo)) IN ('terceros ampliado', 'terceros ampliados') THEN 'Terceros Ampliado'
  WHEN trim(lower(tipo)) IN ('todo riesgo', 'todo-riesgo') THEN 'Todo Riesgo'
  WHEN trim(lower(tipo)) IN ('todo riesgo con franquicia', 'todo-riesgo con franquicia') THEN 'Todo Riesgo con Franquicia'
  ELSE tipo
END
WHERE tipo IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.seguros
    WHERE tipo NOT IN ('Terceros', 'Terceros Ampliado', 'Todo Riesgo', 'Todo Riesgo con Franquicia')
  ) THEN
    RAISE EXCEPTION 'Hay valores no válidos en public.seguros.tipo. Corrígelos antes de convertir a ENUM.';
  END IF;
END
$$;

ALTER TABLE public.seguros
  ALTER COLUMN tipo TYPE public.seguro_tipo_enum
  USING tipo::public.seguro_tipo_enum;
