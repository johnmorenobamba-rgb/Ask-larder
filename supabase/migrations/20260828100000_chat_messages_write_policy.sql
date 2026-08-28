-- E5's escalation-resolve action is about to become the first write path
-- to chat_messages.escalation_status. The current venue_isolation_chat_messages
-- policy is "for all" -- unlike modules/module_sections/check_questions,
-- staff genuinely need INSERT here (the ask-larder route writes both turns
-- via the request-scoped client), so this can't just become owner/manager-only
-- like those did. Split instead: SELECT/INSERT stay venue-wide (unchanged
-- behavior -- ask-larder still works, and this doesn't newly restrict
-- reading, which wasn't asked for and might already be relied on
-- elsewhere); UPDATE/DELETE (resolving an escalation) become owner/manager
-- only, since that's a supervisor action.

drop policy if exists venue_isolation_chat_messages on chat_messages;

drop policy if exists chat_messages_select_own_venue on chat_messages;
create policy chat_messages_select_own_venue on chat_messages
  for select using (venue_id = private.auth_venue_id());

drop policy if exists chat_messages_insert_own_venue on chat_messages;
create policy chat_messages_insert_own_venue on chat_messages
  for insert with check (venue_id = private.auth_venue_id());

drop policy if exists chat_messages_update_owner_manager on chat_messages;
create policy chat_messages_update_owner_manager on chat_messages
  for update using (
    venue_id = private.auth_venue_id() and private.auth_role() in ('owner','manager')
  );

drop policy if exists chat_messages_delete_owner_manager on chat_messages;
create policy chat_messages_delete_owner_manager on chat_messages
  for delete using (
    venue_id = private.auth_venue_id() and private.auth_role() in ('owner','manager')
  );
