-- Wizard-adjacency fix (CLAUDE.md standing principle): the manufacturer-
-- sourced content pipeline (station QR / troubleshooting work) needs real
-- equipment identification per station, and nothing captured it -- the
-- equipment onboarding page's copy asked owners to photograph "the serial
-- number or model sticker" but reused the same generic tag='station' photo
-- slot as any ambience shot, so no structured data existed and an existing
-- "photo captured" flag couldn't be trusted to mean a nameplate was ever
-- photographed. A dedicated nameplate_photo_id (distinct from the general
-- station photo) plus the three OCR-suggested, owner-confirmed fields close
-- that gap for real.
alter table public.stations
  add column equipment_manufacturer text,
  add column equipment_model text,
  add column equipment_serial text,
  add column nameplate_photo_id uuid references public.photo_library(id) on delete set null;

comment on column public.stations.nameplate_photo_id is
  'The dedicated nameplate/model-sticker photo (photo_library.tag = ''nameplate''), distinct from the general ambience photo (tag = ''station''). Null does not imply no photo exists -- it means no nameplate has been captured and confirmed.';
comment on column public.stations.equipment_manufacturer is
  'Owner-confirmed after vision OCR suggested it from the nameplate photo. Never auto-saved from the OCR pass alone.';
comment on column public.stations.equipment_model is
  'Owner-confirmed after vision OCR suggested it from the nameplate photo. Never auto-saved from the OCR pass alone.';
comment on column public.stations.equipment_serial is
  'Owner-confirmed after vision OCR suggested it from the nameplate photo. Never auto-saved from the OCR pass alone.';
