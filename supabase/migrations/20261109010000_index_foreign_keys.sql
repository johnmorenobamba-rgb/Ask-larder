-- Dashboard speed plan, Phase 4: a covering index on every foreign key the
-- Supabase performance advisor listed as unindexed (lint 0001, 59 keys on
-- 9 Nov 2026), including every venue_id column and the hot ones the
-- dashboards filter or join on (staff_module_progress.module_id,
-- module_sections.module_id, check_questions.module_id,
-- staff_certificates.user_id, chat_messages.user_id, module_roles.role_id,
-- app_users.staff_role_id).
--
-- Additive only: no policy, column or data changes. The list was generated
-- from pg_constraint (foreign keys in public whose columns are not the
-- leading columns of any index). Tables are small, so plain CREATE INDEX
-- (inside the migration transaction) holds its lock only briefly.

create index if not exists app_users_staff_role_id_idx on public.app_users (staff_role_id);
create index if not exists app_users_venue_id_idx on public.app_users (venue_id);
create index if not exists certificate_type_roles_role_id_idx on public.certificate_type_roles (role_id);
create index if not exists certificate_types_venue_id_idx on public.certificate_types (venue_id);
create index if not exists chat_messages_station_id_idx on public.chat_messages (station_id);
create index if not exists chat_messages_user_id_idx on public.chat_messages (user_id);
create index if not exists chat_messages_venue_id_idx on public.chat_messages (venue_id);
create index if not exists check_questions_module_id_idx on public.check_questions (module_id);
create index if not exists compliance_form_submissions_submitted_by_idx on public.compliance_form_submissions (submitted_by);
create index if not exists content_suggestions_resolved_by_idx on public.content_suggestions (resolved_by);
create index if not exists content_suggestions_target_module_id_idx on public.content_suggestions (target_module_id);
create index if not exists esignatures_module_id_idx on public.esignatures (module_id);
create index if not exists esignatures_user_id_idx on public.esignatures (user_id);
create index if not exists knowledge_chunks_venue_id_idx on public.knowledge_chunks (venue_id);
create index if not exists menu_item_modifier_groups_menu_item_id_idx on public.menu_item_modifier_groups (menu_item_id);
create index if not exists menu_item_modifiers_modifier_group_id_idx on public.menu_item_modifiers (modifier_group_id);
create index if not exists menu_items_venue_id_idx on public.menu_items (venue_id);
create index if not exists module_roles_role_id_idx on public.module_roles (role_id);
create index if not exists module_sections_module_id_idx on public.module_sections (module_id);
create index if not exists modules_approved_by_idx on public.modules (approved_by);
create index if not exists modules_venue_id_idx on public.modules (venue_id);
create index if not exists near_miss_reports_reported_by_idx on public.near_miss_reports (reported_by);
create index if not exists near_miss_reports_station_id_idx on public.near_miss_reports (station_id);
create index if not exists near_miss_reports_venue_id_idx on public.near_miss_reports (venue_id);
create index if not exists onboarding_content_checks_module_id_idx on public.onboarding_content_checks (module_id);
create index if not exists onboarding_content_checks_venue_id_idx on public.onboarding_content_checks (venue_id);
create index if not exists photo_library_module_id_idx on public.photo_library (module_id);
create index if not exists photo_library_station_id_idx on public.photo_library (station_id);
create index if not exists photo_library_uploaded_by_idx on public.photo_library (uploaded_by);
create index if not exists photo_library_venue_id_idx on public.photo_library (venue_id);
create index if not exists sop_edit_requests_module_id_idx on public.sop_edit_requests (module_id);
create index if not exists sop_edit_requests_requester_idx on public.sop_edit_requests (requester);
create index if not exists sop_edit_requests_venue_id_idx on public.sop_edit_requests (venue_id);
create index if not exists sop_source_documents_venue_id_idx on public.sop_source_documents (venue_id);
create index if not exists sop_topic_decisions_confirmed_by_idx on public.sop_topic_decisions (confirmed_by);
create index if not exists staff_certificates_certificate_type_id_idx on public.staff_certificates (certificate_type_id);
create index if not exists staff_certificates_user_id_idx on public.staff_certificates (user_id);
create index if not exists staff_module_acknowledgements_module_version_id_idx on public.staff_module_acknowledgements (module_version_id);
create index if not exists staff_module_acknowledgements_user_id_idx on public.staff_module_acknowledgements (user_id);
create index if not exists staff_module_progress_esignature_id_idx on public.staff_module_progress (esignature_id);
create index if not exists staff_module_progress_module_id_idx on public.staff_module_progress (module_id);
create index if not exists staff_roles_venue_id_idx on public.staff_roles (venue_id);
create index if not exists station_faqs_station_id_idx on public.station_faqs (station_id);
create index if not exists station_troubleshooting_issues_station_id_idx on public.station_troubleshooting_issues (station_id);
create index if not exists stations_nameplate_photo_id_idx on public.stations (nameplate_photo_id);
create index if not exists stations_primary_module_id_idx on public.stations (primary_module_id);
create index if not exists stations_venue_id_idx on public.stations (venue_id);
create index if not exists topic_gap_reports_module_id_idx on public.topic_gap_reports (module_id);
create index if not exists topic_gap_reports_venue_id_idx on public.topic_gap_reports (venue_id);
create index if not exists venue_compliance_forms_updated_by_idx on public.venue_compliance_forms (updated_by);
create index if not exists venue_contacts_venue_id_idx on public.venue_contacts (venue_id);
create index if not exists venue_devices_app_user_id_idx on public.venue_devices (app_user_id);
create index if not exists venue_devices_paired_by_idx on public.venue_devices (paired_by);
create index if not exists venue_key_roles_app_user_id_idx on public.venue_key_roles (app_user_id);
create index if not exists venue_key_roles_venue_id_idx on public.venue_key_roles (venue_id);
create index if not exists venue_promotions_venue_id_idx on public.venue_promotions (venue_id);
create index if not exists venue_refrigeration_units_station_id_idx on public.venue_refrigeration_units (station_id);
create index if not exists venues_created_by_specialist_id_idx on public.venues (created_by_specialist_id);
create index if not exists wizard_sessions_started_by_idx on public.wizard_sessions (started_by);
