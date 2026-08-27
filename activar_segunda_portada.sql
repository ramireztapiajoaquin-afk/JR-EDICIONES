-- JR EDICIONES · activar segunda portada / contraportada
-- Ejecutar una sola vez en Supabase SQL Editor.

alter table public.books
add column if not exists cover_2_url text;

-- Permitir también imágenes en el bucket que ya usamos para las portadas en movimiento.
update storage.buckets
set public = true,
    file_size_limit = 26214400,
    allowed_mime_types = array['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','image/webp']
where id = 'book-media';
