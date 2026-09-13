-- Bug fix, caught by actually exercising the real NameplateCapture flow
-- end-to-end (not just its vision-OCR step in isolation): the app-level
-- VALID_TAGS whitelist in src/app/api/owner/photo-library/route.ts was
-- updated to accept 'nameplate' when NameplateCapture was built, but this
-- table-level check constraint was never updated to match, so every real
-- nameplate photo insert 500'd with a generic "Unexpected error." -- the
-- request never even reached application error handling that could explain
-- why.
alter table public.photo_library drop constraint photo_library_tag_check;
alter table public.photo_library
  add constraint photo_library_tag_check
  check (tag = any (array['station', 'nameplate', 'module', 'general', 'hero']));
