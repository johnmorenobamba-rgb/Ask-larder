import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Server client — anon/publishable key, cookie-bound to the current
 * request's session. Use in server components / route handlers acting
 * AS the signed-in user (RLS applies normally).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component, which can't write
            // cookies. No middleware refreshes the session proactively
            // (a @supabase/ssr createServerClient in middleware.ts hits a
            // live Turbopack edge-bundling bug — ReferenceError: __dirname
            // is not defined — as of Next 16.3.3; --webpack doesn't build
            // middleware.ts at all in this version either). Harmless to
            // ignore: getCurrentStaff() re-validates via auth.getUser() on
            // every request regardless, so auth still works correctly —
            // this only means a refreshed token can't be cached back into
            // cookies from here, so it may re-validate slightly more often
            // than strictly necessary. Revisit once Turbopack's edge
            // bundling of @supabase/ssr's dependency chain is fixed upstream.
          }
        },
      },
    },
  );
}
