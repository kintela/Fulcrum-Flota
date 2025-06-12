-- Crear el bucket para las fotos de coches
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coches-fotos',
  'coches-fotos', 
  true,
  20971520, -- 20MB en bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir lectura pública de las fotos
CREATE POLICY "Permitir lectura pública de fotos de coches" ON storage.objects
FOR SELECT USING (bucket_id = 'coches-fotos');

-- Política para permitir subida de fotos (autenticados)
CREATE POLICY "Permitir subida de fotos de coches" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'coches-fotos');

-- Política para permitir actualización de fotos (autenticados)
CREATE POLICY "Permitir actualización de fotos de coches" ON storage.objects
FOR UPDATE USING (bucket_id = 'coches-fotos');

-- Política para permitir eliminación de fotos (autenticados)
CREATE POLICY "Permitir eliminación de fotos de coches" ON storage.objects
FOR DELETE USING (bucket_id = 'coches-fotos');

-- Verificar que el bucket se creó correctamente
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'coches-fotos';
