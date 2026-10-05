-- Certificate files: reads limited to the uploader, the owner and the manager tier (hardening-2 task 1).
-- Before: certs_venue_isolation_select let ANY member of the venue read ANY certificate file of that venue.
-- After:  a file can be read by the person who uploaded it (storage.objects.owner_id = their login), or by the
--         owner / manager tier of the same venue (private.auth_is_manager_tier()). The venue folder rule stays.
-- Additive in effect: no object is deleted, moved or renamed; INSERT policy unchanged; no table or column changes.
-- Existing data checked before applying (5 Oct 2026): 37 objects, every one has owner_id; all 7 objects that a
-- staff_certificates row points to were uploaded by the person the row belongs to, so nobody who legitimately
-- needs a file loses it. 30 objects are not referenced by any certificate row (older re-uploads and test files):
-- they stay readable by their uploader and the manager tier only.
-- "Manager tier" means private.auth_is_manager_tier(): the owner, app role manager, and staff whose role has
-- fallback_tier = authorized (for example a Head Chef or Duty Manager). That is the same tier that already
-- sees the owner dashboard and compliance records.
--
-- ROLLBACK (run as one statement block):
--   drop policy if exists certs_scoped_select on storage.objects;
--   create policy certs_venue_isolation_select on storage.objects for select to authenticated
--     using ((bucket_id = 'certs'::text) and ((storage.foldername(name))[1] = (private.auth_venue_id())::text));

drop policy if exists certs_venue_isolation_select on storage.objects;

create policy certs_scoped_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'certs'
    and (storage.foldername(name))[1] = (private.auth_venue_id())::text
    and (
      owner_id = (select auth.uid())::text
      or private.auth_is_manager_tier()
    )
  );
