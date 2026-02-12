ALTER TABLE public.empleados
  ADD COLUMN IF NOT EXISTS baneado boolean NOT NULL DEFAULT false;

UPDATE public.empleados
SET baneado = false
WHERE baneado IS NULL;
