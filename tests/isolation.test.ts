import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { bootstrapOwner } from "../src/lib/auth/bootstrapOwner";
import { createAdminClient } from "../src/lib/supabase/admin";
import type { Database } from "../src/lib/supabase/types";

/**
 * Standing regression test for Build Manual Part C, check 4: two real
 * venues, two real Supabase Auth sessions signed in through the normal
 * anon (RLS-bound) client — not the service-role client — proving RLS
 * actually blocks cross-tenant reads and writes rather than assuming the
 * policies work because they were written correctly. Per the Build
 * Manual, this must be re-run before venue #2 ever shares an environment
 * with venue #1, so it lives here as a real test, not a one-off script.
 */

const suffix = randomUUID().slice(0, 8);
const SLUG_A = `isolation-test-a-${suffix}`;
const SLUG_B = `isolation-test-b-${suffix}`;
const OWNER_A_EMAIL = `isolation-owner-a-${suffix}@example.com`;
const OWNER_B_EMAIL = `isolation-owner-b-${suffix}@example.com`;
const PASSWORD = "IsolationTest123!";

function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

let venueAId: string;
let venueBId: string;
let moduleAId: string;
let moduleBId: string;
let clientA: SupabaseClient<Database>;
let clientB: SupabaseClient<Database>;

beforeAll(async () => {
  const resultA = await bootstrapOwner({
    venueName: "Isolation Test Venue A",
    venueSlug: SLUG_A,
    ownerName: "Owner A",
    ownerEmail: OWNER_A_EMAIL,
    ownerPassword: PASSWORD,
  });
  const resultB = await bootstrapOwner({
    venueName: "Isolation Test Venue B",
    venueSlug: SLUG_B,
    ownerName: "Owner B",
    ownerEmail: OWNER_B_EMAIL,
    ownerPassword: PASSWORD,
  });
  venueAId = resultA.venueId;
  venueBId = resultB.venueId;

  // Seed a module + child rows in each venue so the FK-subquery-based
  // policies (module_sections, check_questions) get exercised too, not
  // just the direct venue_id-column policies.
  const admin = createAdminClient();
  const { data: modA } = await admin
    .from("modules")
    .insert({ venue_id: venueAId, title: "A Module" })
    .select("id")
    .single();
  const { data: modB } = await admin
    .from("modules")
    .insert({ venue_id: venueBId, title: "B Module" })
    .select("id")
    .single();
  moduleAId = modA!.id;
  moduleBId = modB!.id;

  await admin.from("module_sections").insert({ module_id: moduleAId, section_order: 1, content: "A section" });
  await admin.from("module_sections").insert({ module_id: moduleBId, section_order: 1, content: "B section" });
  await admin.from("check_questions").insert({ module_id: moduleAId, question: "A question" });
  await admin.from("check_questions").insert({ module_id: moduleBId, question: "B question" });

  clientA = anonClient();
  clientB = anonClient();
  const { error: signInAErr } = await clientA.auth.signInWithPassword({ email: OWNER_A_EMAIL, password: PASSWORD });
  if (signInAErr) throw signInAErr;
  const { error: signInBErr } = await clientB.auth.signInWithPassword({ email: OWNER_B_EMAIL, password: PASSWORD });
  if (signInBErr) throw signInBErr;
});

afterAll(async () => {
  const admin = createAdminClient();
  // Cascades to app_users/modules/module_sections/check_questions via FK.
  await admin.from("venues").delete().eq("slug", SLUG_A);
  await admin.from("venues").delete().eq("slug", SLUG_B);

  const { data: authList } = await admin.auth.admin.listUsers();
  const toDelete = authList.users.filter((u) => u.email === OWNER_A_EMAIL || u.email === OWNER_B_EMAIL);
  for (const u of toDelete) {
    await admin.auth.admin.deleteUser(u.id);
  }
});

describe("multi-tenant isolation", () => {
  it("same-venue access still works (sanity check)", async () => {
    const { data, error } = await clientA.from("venues").select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(venueAId);
  });

  it("venue A cannot see venue B in a direct table scan", async () => {
    const { data, error } = await clientA.from("venues").select("id");
    expect(error).toBeNull();
    expect(data!.map((v) => v.id)).not.toContain(venueBId);
  });

  it("venue A cannot read venue B by known id (silently filtered, not an error)", async () => {
    const { data, error } = await clientA.from("venues").select("id").eq("id", venueBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue A cannot write to venue B", async () => {
    await clientA.from("venues").update({ name: "hacked" }).eq("id", venueBId);
    const admin = createAdminClient();
    const { data: check } = await admin.from("venues").select("name").eq("id", venueBId).single();
    expect(check!.name).toBe("Isolation Test Venue B");
  });

  it("venue A cannot insert an app_users row scoped to venue B", async () => {
    await clientA.from("app_users").insert({ venue_id: venueBId, role: "staff", name: "intruder" });
    const admin = createAdminClient();
    const { data: leaked } = await admin
      .from("app_users")
      .select("id")
      .eq("venue_id", venueBId)
      .eq("name", "intruder");
    expect(leaked).toHaveLength(0);
  });

  it("venue A CAN read its own module_sections (FK-subquery policy, sanity check)", async () => {
    const { data, error } = await clientA.from("module_sections").select("id").eq("module_id", moduleAId);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("venue A cannot read venue B's module_sections (FK-subquery policy)", async () => {
    const { data, error } = await clientA.from("module_sections").select("id").eq("module_id", moduleBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue A cannot read venue B's check_questions (FK-subquery policy)", async () => {
    const { data, error } = await clientA.from("check_questions").select("id").eq("module_id", moduleBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue B is equally isolated from venue A (symmetry check)", async () => {
    const { data, error } = await clientB.from("venues").select("id").eq("id", venueAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
