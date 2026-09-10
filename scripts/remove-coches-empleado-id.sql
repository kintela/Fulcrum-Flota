-- Unifica la asignacion permanente de coches en public.coches.asignadoa.
-- La aplicacion ya usa asignadoa como fuente de verdad. Los valores antiguos de
-- empleado_id no se copian deliberadamente, porque pueden estar obsoletos o
-- contradecir la asignacion que se muestra y edita actualmente.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coches'
      AND column_name = 'asignadoa'
  ) THEN
    RAISE EXCEPTION 'No existe public.coches.asignadoa';
  END IF;
END
$$;

ALTER TABLE public.coches
  DROP COLUMN IF EXISTS empleado_id;

COMMENT ON COLUMN public.coches.asignadoa IS
  'Empleado al que esta asignado permanentemente el vehiculo (FK a empleados.id)';

COMMIT;
