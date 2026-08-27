-- JR EDICIONES · DOS PORTADAS EN MOVIMIENTO
-- Puedes ejecutar este archivo aunque ya hayas activado la primera portada en movimiento.

alter table public.books
add column if not exists cover_video_url text;

alter table public.books
add column if not exists cover_2_url text;

alter table public.books
add column if not exists cover_2_video_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-media',
  'book-media',
  true,
  26214400,
  array['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "book media public read" on storage.objects;
create policy "book media public read"
on storage.objects for select
using (bucket_id = 'book-media');

drop policy if exists "book media owner insert" on storage.objects;
create policy "book media owner insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'book-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "book media owner update" on storage.objects;
create policy "book media owner update"
on storage.objects for update to authenticated
using (
  bucket_id = 'book-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'book-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "book media owner delete" on storage.objects;
create policy "book media owner delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'book-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
