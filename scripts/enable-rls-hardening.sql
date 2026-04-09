-- Activa RLS en tablas de negocio y revoca acceso directo a anon/authenticated.
-- Pensado para apps con autenticación externa (NextAuth/Azure AD) que acceden a BD
-- desde backend con SUPABASE_SERVICE_ROLE_KEY.

BEGIN;

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'alquileres',
    'casilleros',
    'casilleros_eventos',
    'coches',
    'empleados',
    'itvs',
    'mantenimientos',
    'reservas',
    'reservas_codigos_acceso',
    'seguros',
    'solred_coches',
    'tarjetassolred',
    'viat_empleados',
    'viats'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

COMMIT;

-- Verificación rápida
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'alquileres',
    'casilleros',
    'casilleros_eventos',
    'coches',
    'empleados',
    'itvs',
    'mantenimientos',
    'reservas',
    'reservas_codigos_acceso',
    'seguros',
    'solred_coches',
    'tarjetassolred',
    'viat_empleados',
    'viats'
  )
ORDER BY tablename;
