-- Private bucket for progress photos. Object paths are "<client_id>/<file>".
-- Only the client who owns the folder can upload or delete; the client and
-- their coach can read (the app serves photos through short-lived signed URLs).

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do update set public = false;

create policy "progress photos: owner or coach can read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'progress-photos'
    and public.can_access_client(((storage.foldername(name))[1])::uuid)
  );

create policy "progress photos: owner can upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'progress-photos'
    and public.is_client_self(((storage.foldername(name))[1])::uuid)
  );

create policy "progress photos: owner can delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'progress-photos'
    and public.is_client_self(((storage.foldername(name))[1])::uuid)
  );
