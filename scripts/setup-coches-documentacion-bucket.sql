-- Bucket privado para la documentación asociada a los vehículos.
-- Las rutas de las revisiones se crean como: ITVs/{matricula}/{id_itv}/{archivo}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coches-documentacion',
  'coches-documentacion',
  false,
  20971520,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- No se crean políticas públicas sobre storage.objects. El listado, los enlaces
-- temporales y el borrado se realizan en el servidor. Para subir, el servidor
-- genera un token firmado de un solo uso y el navegador envía el fichero
-- directamente a Storage, evitando exponer la clave de servicio.
