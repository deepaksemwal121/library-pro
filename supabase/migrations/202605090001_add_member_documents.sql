alter table public.library_members
  add column if not exists id_document_path text,
  add column if not exists passport_photo_path text;

insert into storage.buckets (id, name, public)
values ('member-documents', 'member-documents', false)
on conflict (id) do nothing;

create policy "Authenticated users can read member documents"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'member-documents');

create policy "Authenticated users can upload member documents"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'member-documents' and auth.uid() is not null);

create policy "Authenticated users can update member documents"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'member-documents')
  with check (bucket_id = 'member-documents' and auth.uid() is not null);
