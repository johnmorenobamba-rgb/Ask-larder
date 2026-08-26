import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Browser client — anon/publishable key, RLS-bound to whatever session
 * is stored in cookies. Safe to import into 'use client' components.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
