import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { BrowserContext, Browser } from "@playwright/test";
import type { Database } from "../../../src/lib/supabase/types";

// Throwaway accounts inside the demo venue (coachmans-arms-wizard), for checks that need the demo venue's real volume
// of content (the perf spec, the production smoke spec). Every row made here has "perf-check-" in its email and is
// removed by sweepDemoAccounts, which also catches anything a killed earlier run left behind. The global teardown's
// count check fails the run if a login or app_users row survives.
//
// Sessions are minted the way the PIN login does it (a server side magic link exchange), so no credential is typed into
// any page and login time never pollutes a measurement.

export const DEMO_VENUE_SLUG = "coachmans-arms-wizard";
export const DEMO_MARK = "perf-check-";

export function admin() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function demoVenueId(): Promise<string> {
  const { data, error } = await admin().from("venues").select("id").eq("slug", DEMO_VENUE_SLUG).single();
  if (error || !data) throw error ?? new Error(`demo venue ${DEMO_VENUE_SLUG} not found`);
  return data.id;
}

const created = { appUserIds: new Set<string>(), authIds: new Set<string>() };

/** Deletes every perf-check row in the venue (chat_messages and progress cascade with the user) and its logins. */
export async function sweepDemoAccounts(venueId: string) {
  const a = admin();
  const { data: users, error: listError } = await a.from("app_users").select("id, auth_id").eq("venue_id", venueId).ilike("email", `%${DEMO_MARK}%`);
  if (listError) throw new Error(`cleanup: could not list app_users: ${listError.message}`);
  for (const u of users ?? []) {
    created.appUserIds.add(u.id);
    if (u.auth_id) created.authIds.add(u.auth_id);
  }
  if (created.appUserIds.size) {
    const { error } = await a.from("app_users").delete().in("id", [...created.appUserIds]);
    if (error) throw new Error(`cleanup: could not delete app_users: ${error.message}`);
  }
  for (const id of created.authIds) {
    const { error } = await a.auth.admin.deleteUser(id);
    if (error && !/not.?found/i.test(error.message)) throw new Error(`cleanup: could not delete login: ${error.message}`);
  }
  created.appUserIds.clear();
  created.authIds.clear();
}

/** A staff or manager account with a login, ready for sessionCookies(). Returns its email. */
export async function makeDemoAccount(venueId: string, kind: "staff" | "manager", staffRoleId: string | null): Promise<string> {
  const a = admin();
  const email = `${DEMO_MARK}${kind}-${randomUUID().slice(0, 8)}@venue.internal`;
  const { data: authData, error: authError } = await a.auth.admin.createUser({ email, email_confirm: true });
  if (authError || !authData.user) throw authError ?? new Error("no auth user");
  created.authIds.add(authData.user.id);
  const { data: row, error } = await a
    .from("app_users")
    .insert({
      venue_id: venueId,
      role: kind,
      name: kind === "staff" ? "Perf Check Staff" : "Perf Check Manager",
      email,
      auth_id: authData.user.id,
      staff_role_id: staffRoleId,
    })
    .select("id")
    .single();
  if (error || !row) throw error ?? new Error("no app_users row");
  created.appUserIds.add(row.id);
  return email;
}

export async function demoRoleId(venueId: string, name: string): Promise<string> {
  const { data } = await admin().from("staff_roles").select("id").eq("venue_id", venueId).eq("name", name).single();
  if (!data) throw new Error(`role ${name} not found`);
  return data.id;
}

/** Mints a real session for `email` and returns it as the @supabase/ssr cookies the app reads. */
export async function sessionCookies(email: string, baseURL: string) {
  const { data: link, error: linkError } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  if (linkError || !link) throw linkError ?? new Error("no magic link");
  const jar = new Map<string, string>();
  const ssr = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error } = await ssr.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (error) throw error;
  await new Promise((r) => setTimeout(r, 50));
  if (jar.size === 0) throw new Error("session produced no cookies");
  const url = new URL(baseURL);
  return [...jar].map(([name, value]) => ({
    name,
    value,
    domain: url.hostname,
    path: "/",
    httpOnly: false,
    secure: url.protocol === "https:",
    sameSite: "Lax" as const,
  }));
}

export async function signedInContext(browser: Browser, email: string, baseURL: string): Promise<BrowserContext> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addCookies(await sessionCookies(email, baseURL));
  return context;
}
