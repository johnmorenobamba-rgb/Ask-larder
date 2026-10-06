-- Certificate folder writes (hardening-3, B2). Before: certs_venue_isolation_insert let ANY member of a venue write a file into
-- ANY folder under the venue (including a colleague's folder, where the colleague cannot see it but it still pollutes it).
-- After: a member may only write into their OWN folder. Path convention (src/components/staff/CertUploadForm.tsx):
--   <venue id>/<own app_users.id>/<certificate type id>/<timestamp>-<file name>
-- so the first folder must be the caller's venue and the second the caller's own app_users.id (private.auth_app_user_id()).
-- No object is deleted, moved or renamed, and no existing object is changed: INSERT policies only affect new uploads.
-- Read policy (certs_scoped_select, 20261005030000) is untouched. No client UPDATE or DELETE policy exists or is added.
--
-- ROLLBACK:
--   drop policy if exists certs_scoped_insert on storage.objects;
--   create policy certs_venue_isolation_insert on storage.objects for insert to authenticated
--     with check (bucket_id = 'certs' and (storage.foldername(name))[1] = private.auth_venue_id()::text);

drop policy if exists certs_venue_isolation_insert on storage.objects;

create policy certs_scoped_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'certs'
    and (storage.foldername(name))[1] = private.auth_venue_id()::text
    and (storage.foldername(name))[2] = private.auth_app_user_id()::text
  );
