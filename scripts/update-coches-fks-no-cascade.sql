-- Mantener FKs hacia coches(matricula), pero SIN borrado en cascada.
-- Resultado esperado: DELETE en coches fallará si existen registros relacionados.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.alquileres') IS NOT NULL THEN
    ALTER TABLE public.alquileres DROP CONSTRAINT IF EXISTS fk_alquiler_coche;
    ALTER TABLE public.alquileres
      ADD CONSTRAINT fk_alquiler_coche
      FOREIGN KEY (matricula)
      REFERENCES public.coches (matricula)
      ON DELETE RESTRICT;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.itvs') IS NOT NULL THEN
    ALTER TABLE public.itvs DROP CONSTRAINT IF EXISTS fk_itv_coche;
    ALTER TABLE public.itvs
      ADD CONSTRAINT fk_itv_coche
      FOREIGN KEY (matricula)
      REFERENCES public.coches (matricula)
      ON DELETE RESTRICT;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.seguros') IS NOT NULL THEN
    ALTER TABLE public.seguros DROP CONSTRAINT IF EXISTS fk_seguro_coche;
    ALTER TABLE public.seguros
      ADD CONSTRAINT fk_seguro_coche
      FOREIGN KEY (matricula)
      REFERENCES public.coches (matricula)
      ON DELETE RESTRICT;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.solred_coches') IS NOT NULL THEN
    ALTER TABLE public.solred_coches DROP CONSTRAINT IF EXISTS fk_solred_coche;
    ALTER TABLE public.solred_coches
      ADD CONSTRAINT fk_solred_coche
      FOREIGN KEY (matricula)
      REFERENCES public.coches (matricula)
      ON DELETE RESTRICT;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.reservas') IS NOT NULL THEN
    ALTER TABLE public.reservas DROP CONSTRAINT IF EXISTS fk_reservas_matricula;
    ALTER TABLE public.reservas
      ADD CONSTRAINT fk_reservas_matricula
      FOREIGN KEY (matricula)
      REFERENCES public.coches (matricula)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.mantenimientos') IS NOT NULL THEN
    ALTER TABLE public.mantenimientos DROP CONSTRAINT IF EXISTS fk_mantenimientos_coche;
    ALTER TABLE public.mantenimientos
      ADD CONSTRAINT fk_mantenimientos_coche
      FOREIGN KEY (matricula)
      REFERENCES public.coches (matricula)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.viat_coches') IS NOT NULL THEN
    ALTER TABLE public.viat_coches DROP CONSTRAINT IF EXISTS viat_coches_matricula_fkey;
    ALTER TABLE public.viat_coches
      ADD CONSTRAINT viat_coches_matricula_fkey
      FOREIGN KEY (matricula)
      REFERENCES public.coches (matricula)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END
$$;

COMMIT;
