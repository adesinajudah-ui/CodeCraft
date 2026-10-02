begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quiz-pdfs', 'quiz-pdfs', true, 52428800, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads quiz PDFs" on storage.objects;
create policy "Public reads quiz PDFs"
on storage.objects for select to public
using (bucket_id = 'quiz-pdfs');

drop policy if exists "Admins manage quiz PDFs" on storage.objects;
create policy "Admins manage quiz PDFs"
on storage.objects for all to public
using (bucket_id = 'quiz-pdfs' and public.is_codecraft_admin())
with check (bucket_id = 'quiz-pdfs' and public.is_codecraft_admin());

commit;