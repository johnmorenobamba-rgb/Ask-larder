import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Silent-failure hardening, 14 Sep 2026 build session: the codebase's
 * dominant Server Component query style destructured only `data` from a
 * Supabase call, discarding `error` entirely -- a real query failure
 * (a bad join, an RLS misconfiguration, a transient network blip) then
 * rendered identically to "no rows," the exact failure class that once
 * hid the real photo_library PGRST201 bug behind a calm "No photos yet."
 * empty state. This doesn't change what the page renders on failure
 * (still the same page.tsx-level empty state in most call sites, by
 * design -- a full page-level error boundary is a bigger, separate
 * decision) -- it makes sure the failure is never silent anymore, by
 * logging it the same way this codebase's API routes already do
 * (`console.error`, picked up by Vercel/hosting logs).
 */
export function logQueryError(context: string, error: PostgrestError | null): void {
  if (error) {
    console.error(`[query failed] ${context}:`, error.message, error.details || "");
  }
}
