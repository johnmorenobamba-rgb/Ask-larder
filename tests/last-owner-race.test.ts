import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "../src/lib/supabase/admin";

// Two owners racing on the last owner rule (hardening-3 B6). Two signed in owners of one DISPOSABLE venue each try to deactivate
// the other at the same moment, many times over. The database must always leave one active owner (the check is serialised with a
// per venue advisory lock, 20261005110000). The venue and both logins are removed afterwards (service role).
const admin = createAdminClient();
const suffix = randomUUID().slice(0, 8);
const slug = `lo-${suffix}`;
const password = randomUUID() + "Aa1!";
let venueId = "";
const ids: { auth: string; app: string; email: string }[] = [];
const ROUNDS = 25;

function signedIn(email: string) {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return c.auth.signInWithPassword({ email, password }).then(({ error }) => {
    if (error) throw error;
    return c;
  });
}

beforeAll(async () => {
  const { data: v, error } = await admin.from("venues").insert({ name: "Last owner race (test data)", slug }).select("id").single();
  if (error) throw error;
  venueId = v!.id;
  for (const tag of ["a", "b"]) {
    const email = `delivered+lo${tag}${suffix}@resend.dev`;
    const { data: au, error: ae } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (ae || !au.user) throw ae ?? new Error("no login");
    const { data: row, error: re } = await admin.from("app_users").insert({ venue_id: venueId, role: "owner", name: `Owner ${tag.toUpperCase()}`, auth_id: au.user.id, onboarding_completed_at: new Date().toISOString() }).select("id").single();
    if (re) throw re;
    ids.push({ auth: au.user.id, app: row!.id, email });
  }
});
afterAll(async () => {
  if (venueId) await admin.from("venues").delete().eq("id", venueId);
  for (const i of ids) await admin.auth.admin.deleteUser(i.auth);
});

describe("last owner rule under concurrency", () => {
  it(`never leaves a venue with no active owner, over ${ROUNDS} simultaneous attempts`, async () => {
    const [a, b] = await Promise.all([signedIn(ids[0].email), signedIn(ids[1].email)]);
    let bothSucceeded = 0;
    for (let round = 0; round < ROUNDS; round++) {
      const now = new Date().toISOString();
      const [ra, rb] = await Promise.all([
        a.from("app_users").update({ deactivated_at: now }).eq("id", ids[1].app).select("id"),
        b.from("app_users").update({ deactivated_at: now }).eq("id", ids[0].app).select("id"),
      ]);
      const okA = !ra.error && (ra.data?.length ?? 0) === 1;
      const okB = !rb.error && (rb.data?.length ?? 0) === 1;
      if (okA && okB) bothSucceeded++;
      const { data: active } = await admin.from("app_users").select("id").eq("venue_id", venueId).eq("role", "owner").is("deactivated_at", null);
      expect(active?.length ?? 0, `round ${round}: active owners`).toBeGreaterThanOrEqual(1);
      await admin.from("app_users").update({ deactivated_at: null }).eq("venue_id", venueId);
    }
    expect(bothSucceeded).toBe(0);
  }, 180_000);

  it("the same race with deletes (each owner tries to delete the other) leaves one owner", async () => {
    const [a, b] = await Promise.all([signedIn(ids[0].email), signedIn(ids[1].email)]);
    const [ra, rb] = await Promise.all([a.from("app_users").delete().eq("id", ids[1].app).select("id"), b.from("app_users").delete().eq("id", ids[0].app).select("id")]);
    const okA = !ra.error && (ra.data?.length ?? 0) === 1;
    const okB = !rb.error && (rb.data?.length ?? 0) === 1;
    expect(okA && okB).toBe(false);
    const { data: left } = await admin.from("app_users").select("id").eq("venue_id", venueId).eq("role", "owner");
    expect(left?.length ?? 0).toBeGreaterThanOrEqual(1);
  }, 60_000);
});
