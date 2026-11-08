import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "../src/lib/supabase/admin";
import type { Database } from "../src/lib/supabase/types";

// public.outstanding_acknowledgements (migration 20261109000000) through a real signed in session, so RLS is in play:
// a staff member sees their own outstanding module version, and asking about a person in another venue returns
// nothing (security invoker, the caller's own RLS). Two disposable venues, removed afterwards.

const admin = createAdminClient();
const suffix = randomUUID().slice(0, 8);
const made = { venues: [] as string[], logins: [] as string[] };

async function venueWithStaff(label: string) {
  const { data: venue } = await admin.from("venues").insert({ name: `Acks ${label} ${suffix}`, slug: `acks-${label}-${suffix}` }).select("id").single().throwOnError();
  made.venues.push(venue!.id);
  const email = `acks-${label}-${suffix}@venue.internal`;
  const { data: auth } = await admin.auth.admin.createUser({ email, email_confirm: true });
  made.logins.push(auth.user!.id);
  const { data: user } = await admin.from("app_users").insert({ venue_id: venue!.id, role: "staff", name: `Acks ${label}`, email, auth_id: auth.user!.id }).select("id").single().throwOnError();
  const { data: mod } = await admin.from("modules").insert({ venue_id: venue!.id, title: `Module ${label}`, status: "live" }).select("id").single().throwOnError();
  await admin.from("staff_module_progress").insert({ user_id: user!.id, module_id: mod!.id, status: "completed", completed_at: new Date(Date.now() - 10 * 86400_000).toISOString() }).throwOnError();
  await admin.from("module_versions").insert({ module_id: mod!.id, version: 1, published_at: new Date(Date.now() - 20 * 86400_000).toISOString(), changelog: "first" }).throwOnError();
  const { data: v2 } = await admin.from("module_versions").insert({ module_id: mod!.id, version: 2, published_at: new Date(Date.now() - 86400_000).toISOString(), changelog: "second" }).select("id").single().throwOnError();
  return { userId: user!.id, email, newestVersionId: v2!.id };
}

async function signedIn(email: string): Promise<SupabaseClient<Database>> {
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const client = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { error } = await client.auth.verifyOtp({ type: "magiclink", token_hash: link.properties!.hashed_token });
  if (error) throw error;
  return client;
}

let a: Awaited<ReturnType<typeof venueWithStaff>>;
let b: Awaited<ReturnType<typeof venueWithStaff>>;

beforeAll(async () => {
  a = await venueWithStaff("a");
  b = await venueWithStaff("b");
});

afterAll(async () => {
  for (const id of made.venues) await admin.from("venues").delete().eq("id", id);
  for (const id of made.logins) await admin.auth.admin.deleteUser(id);
});

describe("outstanding_acknowledgements", () => {
  it("returns the caller's own newer, unacknowledged version", async () => {
    const client = await signedIn(a.email);
    const { data, error } = await client.rpc("outstanding_acknowledgements", { p_user_id: a.userId });
    expect(error).toBeNull();
    expect(data?.map((r) => [r.module_version_id, r.changelog, r.module_title])).toEqual([[a.newestVersionId, "second", "Module a"]]);
  });

  it("drops a version once it is acknowledged", async () => {
    const client = await signedIn(b.email);
    await admin.from("staff_module_acknowledgements").insert({ user_id: b.userId, module_version_id: b.newestVersionId }).throwOnError();
    const { data } = await client.rpc("outstanding_acknowledgements", { p_user_id: b.userId });
    expect(data).toEqual([]);
    await admin.from("staff_module_acknowledgements").delete().eq("user_id", b.userId);
  });

  it("shows nothing about a person in another venue", async () => {
    const client = await signedIn(a.email);
    const { data, error } = await client.rpc("outstanding_acknowledgements", { p_user_id: b.userId });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("is not callable without a session", async () => {
    const anon = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { error } = await anon.rpc("outstanding_acknowledgements", { p_user_id: a.userId });
    expect(error).not.toBeNull();
  });
});
