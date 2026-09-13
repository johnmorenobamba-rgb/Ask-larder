-- Block V2 -- adds the access_control question type (used only by
-- restricted_content_safe_and_alarm_access) to sop_intake_answers'
-- question_type check constraint. Postgres has no "alter check constraint"
-- -- drop and recreate with the same name.
alter table sop_intake_answers drop constraint sop_intake_answers_question_type_check;
alter table sop_intake_answers add constraint sop_intake_answers_question_type_check
  check (question_type in ('universal', 'behavioral_read', 'safety_honesty', 'troubleshoot_escalate', 'access_control'));
