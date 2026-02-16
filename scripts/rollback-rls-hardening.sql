-- Rollback de emergencia para volver al estado sin RLS efectivo.

BEGIN;

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'alquileres',
    'coches',
    'empleados',
    'itvs',
    'mantenimientos',
    'reservas',
    'seguros',
    'solred_coches',
    'tarjetassolred',
    'viat_empleados',
    'viats'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I DISABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated', t);
  END LOOP;
END $$;

COMMIT;
