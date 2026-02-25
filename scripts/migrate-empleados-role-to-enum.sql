-- Migra public.empleados.role (text) a enum public.rol_empleado
-- Valores permitidos: 'usuario', 'administrador'
-- También normaliza el valor legacy 'admin' -> 'administrador'

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'rol_empleado'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.rol_empleado AS ENUM ('usuario', 'administrador');
  END IF;
END
$$;

ALTER TABLE public.empleados
  ALTER COLUMN role DROP DEFAULT;

UPDATE public.empleados
SET role = CASE
  WHEN role IS NULL OR btrim(role) = '' THEN 'usuario'
  WHEN lower(btrim(role)) = 'admin' THEN 'administrador'
  WHEN lower(btrim(role)) = 'administrador' THEN 'administrador'
  WHEN lower(btrim(role)) = 'usuario' THEN 'usuario'
  ELSE 'usuario'
END;

ALTER TABLE public.empleados
  ALTER COLUMN role TYPE public.rol_empleado
  USING (role::public.rol_empleado);

ALTER TABLE public.empleados
  ALTER COLUMN role SET DEFAULT 'usuario'::public.rol_empleado;

-- Opcional (recomendado si siempre quieres rol informado):
-- ALTER TABLE public.empleados ALTER COLUMN role SET NOT NULL;

COMMIT;
