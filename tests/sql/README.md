# SQL test suites (Compliance Forms)

Paste a file into the Supabase SQL runner against larder-dev. Each runs inside ONE `DO` block and ends with a
forced exception, so nothing can persist; the "error" it returns IS the result (`N PASS, 0 FAIL`). Each builds its
own throwaway venues, staff and auth users inside the transaction and never touches a real or demo venue.
After running, confirm counts with a plain `SELECT` (submissions 0, alerts 0, no `t0a-`/`t0b-` venues).

- `compliance-0a-rls-suite.sql`: settings, units and ledger RLS and privileges (expected 126 PASS).
- `compliance-0b-stage1.sql`: the B2 write path, episodes, corrections, visibility, grants, cascade (expected 86 PASS).
- `compliance-0b-previous-day-flag.sql`: a flag from a previous day stays open until a later in range reading (expected 4 PASS).
- `p5-venues-write-policies.sql`: who can read, update, delete, insert and truncate `venues` and `venue_licence_profile` (owner, manager tier, frontline, another venue, anon, service role; expected 45 PASS).
