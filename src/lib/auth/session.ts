import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type CurrentStaff = Tables<"app_users">;

/**
 * The signed-in staff/owner/manager row for the current request, or null if
 * unauthenticated. RLS scopes the app_users lookup to the caller's own row,
 * so this can't leak another venue's data even if auth_id were guessed.
 */
export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: appUser } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth_id", user.id)
    .maybeSingle();

  return appUser;
}
