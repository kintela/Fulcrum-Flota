-- Migración: asociar tarjetas ViaT directamente a coches (matrícula)
-- Tabla origen: public.viat_empleados
-- Tabla destino: public.viat_coches
--
-- Mapeo solicitado:
-- empleado_id = 9  -> 7234-DXK
-- empleado_id = 4  -> 1536-FBX
-- empleado_id = 10 -> 7652-DCX
-- empleado_id = 5  -> 3661-GLH

BEGIN;

-- 1) Renombrar tabla (si aún existe con el nombre antiguo)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'viat_empleados'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'viat_coches'
  ) THEN
    ALTER TABLE public.viat_empleados RENAME TO viat_coches;
  END IF;
END
$$;

-- 2) Añadir nueva columna de relación por matrícula
ALTER TABLE public.viat_coches
  ADD COLUMN IF NOT EXISTS matricula character varying(20);

-- 3) Backfill con el mapeo indicado
UPDATE public.viat_coches
SET matricula = CASE empleado_id
  WHEN 9 THEN '7234-DXK'
  WHEN 4 THEN '1536-FBX'
  WHEN 10 THEN '7652-DCX'
  WHEN 5 THEN '3661-GLH'
  ELSE matricula
END;

-- Corrección por si quedó algún typo histórico
UPDATE public.viat_coches
SET matricula = '1536-FBX'
WHERE matricula = '1356-FBX';

-- Normalizar formato
UPDATE public.viat_coches
SET matricula = UPPER(BTRIM(matricula))
WHERE matricula IS NOT NULL;

-- 4) Verificar que no queden filas sin mapear
DO $$
DECLARE
  v_sin_mapear integer;
  v_matriculas_invalidas text;
BEGIN
  SELECT COUNT(*) INTO v_sin_mapear
  FROM public.viat_coches
  WHERE matricula IS NULL OR BTRIM(matricula) = '';

  IF v_sin_mapear > 0 THEN
    RAISE EXCEPTION
      'Quedan % filas sin matrícula en public.viat_coches. Completa el mapeo antes de continuar.',
      v_sin_mapear;
  END IF;

  SELECT string_agg(v.matricula, ', ' ORDER BY v.matricula)
    INTO v_matriculas_invalidas
  FROM (
    SELECT DISTINCT vc.matricula
    FROM public.viat_coches vc
    LEFT JOIN public.coches c ON c.matricula = vc.matricula
    WHERE vc.matricula IS NOT NULL
      AND BTRIM(vc.matricula) <> ''
      AND c.matricula IS NULL
  ) v;

  IF v_matriculas_invalidas IS NOT NULL THEN
    RAISE EXCEPTION
      'Hay matrículas en viat_coches que no existen en coches: %',
      v_matriculas_invalidas;
  END IF;
END
$$;

-- 5) Eliminar FK antigua contra empleados (si existe)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'viat_coches'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) ILIKE '%empleado_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.viat_coches DROP CONSTRAINT %I', r.conname);
  END LOOP;
END
$$;

-- 6) Crear FK nueva contra coches(matricula)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'viat_coches'
      AND c.conname = 'viat_coches_matricula_fkey'
  ) THEN
    ALTER TABLE public.viat_coches
      ADD CONSTRAINT viat_coches_matricula_fkey
      FOREIGN KEY (matricula)
      REFERENCES public.coches (matricula)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END
$$;

-- 7) Ajustes de columnas e índices
ALTER TABLE public.viat_coches
  ALTER COLUMN matricula SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_viat_coches_matricula ON public.viat_coches (matricula);
CREATE INDEX IF NOT EXISTS idx_viat_coches_viat_id ON public.viat_coches (viat_id);

-- Un solo vínculo activo por matrícula y por viat_id
-- (asumiendo histórico por fecha_desasignacion)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'viat_coches'
      AND column_name = 'fecha_desasignacion'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_viat_coches_activa_por_matricula
      ON public.viat_coches (matricula)
      WHERE fecha_desasignacion IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_viat_coches_activa_por_viat_id
      ON public.viat_coches (viat_id)
      WHERE fecha_desasignacion IS NULL;
  END IF;
END
$$;

-- 8) Eliminar columna antigua
ALTER TABLE public.viat_coches
  DROP COLUMN IF EXISTS empleado_id;

COMMIT;
