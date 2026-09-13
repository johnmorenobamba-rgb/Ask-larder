-- Provenance-aware approval UI needs a real citation to show alongside
-- ai_standard_fill/ai_manual_sourced badges on module content, same as
-- station_faqs/station_troubleshooting_issues already carry. module_sections
-- never got this column when provenance was added (Task 1's Gap-Recognition
-- Agent work), since nothing rendered provenance yet at that point.
alter table public.module_sections add column citation text;
comment on column public.module_sections.citation is
  'Real source citation (manual title + URL) when provenance is ai_manual_sourced, or a standard-practice note when ai_standard_fill/ai_recommended_*. Null for owner_sourced.';
