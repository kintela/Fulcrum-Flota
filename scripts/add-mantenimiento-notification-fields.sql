ALTER TABLE public.mantenimientos
  ADD COLUMN IF NOT EXISTS notificacion_mantenimiento_vencido_enviada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_notificacion_mantenimiento_vencido timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS notificacion_mantenimiento_proximo_enviada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_notificacion_mantenimiento_proximo timestamp with time zone NULL;
