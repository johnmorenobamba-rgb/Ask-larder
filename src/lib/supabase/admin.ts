import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role client — bypasses RLS entirely.
 * Only for server-side code that legitimately has no caller session to
 * resolve RLS against yet (owner bootstrap, staff PIN auth before a
 * session exists). Never import this into a 'use client' file — the
 * `server-only` import above makes that a build-time error.
 */
export function createAdminClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
