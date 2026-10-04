import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomPassword } from "./helpers/secrets";
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
const OWNER_A_EMAIL = `delivered+isoa${suffix}@resend.dev`;
const OWNER_B_EMAIL = `delivered+isob${suffix}@resend.dev`;
const PASSWORD = randomPassword();
// The real onboarding specialist PIN gate is exercised, so its PIN comes from the environment, never from the repo.
const SPECIALIST_PIN = process.env.E2E_SPECIALIST_PIN ?? "";

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
let stationAId: string;
let stationBId: string;
let moduleVersionAId: string;
let moduleVersionBId: string;
let certNudgeLogAId: string;
let certNudgeLogBId: string;
let certTypeAId: string;
let certTypeBId: string;
let menuItemAId: string;
let menuItemBId: string;
let modifierGroupAId: string;
let modifierGroupBId: string;
let modifierAId: string;
let modifierBId: string;
let wizardSessionAId: string;
let wizardSessionBId: string;
let keyRoleAId: string;
let keyRoleBId: string;
let contentCheckAId: string;
let contentCheckBId: string;
let promotionAId: string;
let promotionBId: string;
let venueContactAId: string;
let venueContactBId: string;
let clientA: SupabaseClient<Database>;
let clientB: SupabaseClient<Database>;

beforeAll(async () => {
  if (!SPECIALIST_PIN) throw new Error("Set E2E_SPECIALIST_PIN (the onboarding specialist PIN) to run this suite.");
  const resultA = await bootstrapOwner({
    venueName: "Isolation Test Venue A",
    venueSlug: SLUG_A,
    ownerName: "Owner A",
    ownerEmail: OWNER_A_EMAIL,
    ownerPassword: PASSWORD,
    // "John" / 0623, seeded via scripts/one-off/seed-onboarding-specialist.mjs
    // -- this test calls the real bootstrapOwner(), so it goes through the
    // same PIN gate as the actual /onboarding/start route (Part 2, 15 Sep).
    specialistPin: SPECIALIST_PIN,
    requestIp: "127.0.0.1",
  });
  const resultB = await bootstrapOwner({
    venueName: "Isolation Test Venue B",
    venueSlug: SLUG_B,
    ownerName: "Owner B",
    ownerEmail: OWNER_B_EMAIL,
    ownerPassword: PASSWORD,
    specialistPin: SPECIALIST_PIN,
    requestIp: "127.0.0.1",
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

  // Seed Phase 4a's new tables too (C8/C9/C10), so their RLS policies get
  // exercised by this suite, not just assumed correct because they follow
  // the same pattern as tables already covered above.
  const { data: stationA } = await admin
    .from("stations")
    .insert({ venue_id: venueAId, name: "A Station", qr_code_slug: `a-${suffix}`, primary_module_id: moduleAId })
    .select("id")
    .single();
  const { data: stationB } = await admin
    .from("stations")
    .insert({ venue_id: venueBId, name: "B Station", qr_code_slug: `b-${suffix}`, primary_module_id: moduleBId })
    .select("id")
    .single();
  stationAId = stationA!.id;
  stationBId = stationB!.id;

  const { data: mvA } = await admin
    .from("module_versions")
    .insert({ module_id: moduleAId, version: 2, changelog: "A change" })
    .select("id")
    .single();
  const { data: mvB } = await admin
    .from("module_versions")
    .insert({ module_id: moduleBId, version: 2, changelog: "B change" })
    .select("id")
    .single();
  moduleVersionAId = mvA!.id;
  moduleVersionBId = mvB!.id;

  await admin.from("near_miss_reports").insert({ venue_id: venueAId, description: "A hazard" });
  await admin.from("near_miss_reports").insert({ venue_id: venueBId, description: "B hazard" });

  await admin.from("staff_module_acknowledgements").insert({ user_id: resultA.ownerId, module_version_id: moduleVersionAId });
  await admin.from("staff_module_acknowledgements").insert({ user_id: resultB.ownerId, module_version_id: moduleVersionBId });

  // Reconciled/Block-E-foundation tables: certificate_type_roles (FK-subquery
  // via certificate_types) and cert_nudge_log (FK-subquery two hops, via
  // staff_certificates -> app_users) -- both newly policied, neither
  // previously exercised by this suite.
  const { data: certTypeA } = await admin
    .from("certificate_types")
    .insert({ venue_id: venueAId, name: "A Cert" })
    .select("id")
    .single();
  const { data: certTypeB } = await admin
    .from("certificate_types")
    .insert({ venue_id: venueBId, name: "B Cert" })
    .select("id")
    .single();
  const { data: roleA } = await admin
    .from("staff_roles")
    .insert({ venue_id: venueAId, name: "A Role" })
    .select("id")
    .single();
  const { data: roleB } = await admin
    .from("staff_roles")
    .insert({ venue_id: venueBId, name: "B Role" })
    .select("id")
    .single();
  certTypeAId = certTypeA!.id;
  certTypeBId = certTypeB!.id;
  await admin.from("certificate_type_roles").insert({ certificate_type_id: certTypeA!.id, role_id: roleA!.id });
  await admin
    .from("certificate_type_roles")
    .insert({ certificate_type_id: certTypeB!.id, role_id: roleB!.id });

  const { data: certA } = await admin
    .from("staff_certificates")
    .insert({ user_id: resultA.ownerId, certificate_type_id: certTypeA!.id, expiry_date: "2027-01-01" })
    .select("id")
    .single();
  const { data: certB } = await admin
    .from("staff_certificates")
    .insert({ user_id: resultB.ownerId, certificate_type_id: certTypeB!.id, expiry_date: "2027-01-01" })
    .select("id")
    .single();
  const { data: nudgeA } = await admin
    .from("cert_nudge_log")
    .insert({ staff_certificate_id: certA!.id, cadence_days: 30 })
    .select("id")
    .single();
  const { data: nudgeB } = await admin
    .from("cert_nudge_log")
    .insert({ staff_certificate_id: certB!.id, cadence_days: 30 })
    .select("id")
    .single();
  certNudgeLogAId = nudgeA!.id;
  certNudgeLogBId = nudgeB!.id;

  // Block Q additions: venue_licence_profile/venue_contacts (direct venue_id
  // policy, added in the bar-pass migration but never previously exercised
  // by this suite), menu_items (direct) + menu_item_modifier_groups/
  // menu_item_modifiers (one- and two-hop FK-subquery policies), and the
  // four Block Q2 tables -- wizard_sessions, venue_key_roles,
  // onboarding_content_checks, venue_promotions (all direct venue_id
  // policy) -- gated before Q6 per Build Manual Part C check 4.
  await admin.from("venue_licence_profile").insert({ venue_id: venueAId, state: "VIC", licence_status: "full" });
  await admin.from("venue_licence_profile").insert({ venue_id: venueBId, state: "VIC", licence_status: "full" });

  const { data: contactA } = await admin
    .from("venue_contacts")
    .insert({ venue_id: venueAId, contact_type: "electrician", name: "A Sparky" })
    .select("id")
    .single();
  const { data: contactB } = await admin
    .from("venue_contacts")
    .insert({ venue_id: venueBId, contact_type: "electrician", name: "B Sparky" })
    .select("id")
    .single();
  venueContactAId = contactA!.id;
  venueContactBId = contactB!.id;

  const { data: menuItemA } = await admin
    .from("menu_items")
    .insert({ venue_id: venueAId, name: "A Dish", category: "food" })
    .select("id")
    .single();
  const { data: menuItemB } = await admin
    .from("menu_items")
    .insert({ venue_id: venueBId, name: "B Dish", category: "food" })
    .select("id")
    .single();
  menuItemAId = menuItemA!.id;
  menuItemBId = menuItemB!.id;

  const { data: modGroupA } = await admin
    .from("menu_item_modifier_groups")
    .insert({ menu_item_id: menuItemAId, name: "A Swap" })
    .select("id")
    .single();
  const { data: modGroupB } = await admin
    .from("menu_item_modifier_groups")
    .insert({ menu_item_id: menuItemBId, name: "B Swap" })
    .select("id")
    .single();
  modifierGroupAId = modGroupA!.id;
  modifierGroupBId = modGroupB!.id;

  const { data: modifierRowA } = await admin
    .from("menu_item_modifiers")
    .insert({ modifier_group_id: modifierGroupAId, name: "A Option" })
    .select("id")
    .single();
  const { data: modifierRowB } = await admin
    .from("menu_item_modifiers")
    .insert({ modifier_group_id: modifierGroupBId, name: "B Option" })
    .select("id")
    .single();
  modifierAId = modifierRowA!.id;
  modifierBId = modifierRowB!.id;

  const { data: wsA } = await admin
    .from("wizard_sessions")
    .insert({ venue_id: venueAId, current_step: "venue_basics" })
    .select("id")
    .single();
  const { data: wsB } = await admin
    .from("wizard_sessions")
    .insert({ venue_id: venueBId, current_step: "venue_basics" })
    .select("id")
    .single();
  wizardSessionAId = wsA!.id;
  wizardSessionBId = wsB!.id;

  const { data: krA } = await admin
    .from("venue_key_roles")
    .insert({ venue_id: venueAId, role_type: "rsa_marshal", name: "A Marshal" })
    .select("id")
    .single();
  const { data: krB } = await admin
    .from("venue_key_roles")
    .insert({ venue_id: venueBId, role_type: "rsa_marshal", name: "B Marshal" })
    .select("id")
    .single();
  keyRoleAId = krA!.id;
  keyRoleBId = krB!.id;

  const { data: ccA } = await admin
    .from("onboarding_content_checks")
    .insert({ venue_id: venueAId, module_id: moduleAId, topic_key: "welcome", test_question: "A question", could_answer: true })
    .select("id")
    .single();
  const { data: ccB } = await admin
    .from("onboarding_content_checks")
    .insert({ venue_id: venueBId, module_id: moduleBId, topic_key: "welcome", test_question: "B question", could_answer: true })
    .select("id")
    .single();
  contentCheckAId = ccA!.id;
  contentCheckBId = ccB!.id;

  const { data: promoA } = await admin
    .from("venue_promotions")
    .insert({ venue_id: venueAId, day_of_week: "friday", start_time: "17:00", end_time: "19:00" })
    .select("id")
    .single();
  const { data: promoB } = await admin
    .from("venue_promotions")
    .insert({ venue_id: venueBId, day_of_week: "friday", start_time: "17:00", end_time: "19:00" })
    .select("id")
    .single();
  promotionAId = promoA!.id;
  promotionBId = promoB!.id;

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

  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
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

  // --- Phase 4a additions: stations, near_miss_reports (direct venue_id
  // policy), module_versions, staff_module_acknowledgements (FK-subquery
  // policy) ---

  it("venue A CAN read its own stations (direct venue_id policy, sanity check)", async () => {
    const { data, error } = await clientA.from("stations").select("id").eq("id", stationAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("venue A cannot read venue B's stations (direct venue_id policy)", async () => {
    const { data, error } = await clientA.from("stations").select("id").eq("id", stationBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue A CAN read its own near_miss_reports (direct venue_id policy, sanity check)", async () => {
    const { data, error } = await clientA.from("near_miss_reports").select("id").eq("venue_id", venueAId);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("venue A cannot read venue B's near_miss_reports (direct venue_id policy)", async () => {
    const { data, error } = await clientA.from("near_miss_reports").select("id").eq("venue_id", venueBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue A CAN read its own module_versions (FK-subquery policy, sanity check)", async () => {
    const { data, error } = await clientA.from("module_versions").select("id").eq("id", moduleVersionAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("venue A cannot read venue B's module_versions (FK-subquery policy)", async () => {
    const { data, error } = await clientA.from("module_versions").select("id").eq("id", moduleVersionBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue A CAN read its own staff_module_acknowledgements (FK-subquery policy, sanity check)", async () => {
    const { data, error } = await clientA
      .from("staff_module_acknowledgements")
      .select("id")
      .eq("module_version_id", moduleVersionAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("venue A cannot read venue B's staff_module_acknowledgements (FK-subquery policy)", async () => {
    const { data, error } = await clientA
      .from("staff_module_acknowledgements")
      .select("id")
      .eq("module_version_id", moduleVersionBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // --- Reconciliation + Block E foundation additions: certificate_type_roles
  // (FK-subquery via certificate_types), cert_nudge_log (FK-subquery two
  // hops, via staff_certificates -> app_users) ---

  it("venue A CAN read its own certificate_type_roles (FK-subquery policy, sanity check)", async () => {
    const { data, error } = await clientA
      .from("certificate_type_roles")
      .select("certificate_type_id")
      .eq("certificate_type_id", certTypeAId);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("venue A cannot read venue B's certificate_type_roles (FK-subquery policy)", async () => {
    const { data, error } = await clientA
      .from("certificate_type_roles")
      .select("certificate_type_id")
      .eq("certificate_type_id", certTypeBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue A CAN read its own cert_nudge_log (FK-subquery policy, sanity check)", async () => {
    const { data, error } = await clientA.from("cert_nudge_log").select("id").eq("id", certNudgeLogAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("venue A cannot read venue B's cert_nudge_log (FK-subquery policy)", async () => {
    const { data, error } = await clientA.from("cert_nudge_log").select("id").eq("id", certNudgeLogBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // --- Block Q additions: venue_licence_profile, venue_contacts (direct
  // venue_id policy, bar-pass migration, never previously exercised),
  // menu_items (direct) + menu_item_modifier_groups/menu_item_modifiers
  // (one- and two-hop FK-subquery), wizard_sessions, venue_key_roles,
  // onboarding_content_checks, venue_promotions (Block Q2, direct
  // venue_id policy) ---

  it("venue A CAN read its own venue_licence_profile (direct venue_id policy, sanity check)", async () => {
    const { data, error } = await clientA.from("venue_licence_profile").select("venue_id").eq("venue_id", venueAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("venue A cannot read venue B's venue_licence_profile (direct venue_id policy)", async () => {
    const { data, error } = await clientA.from("venue_licence_profile").select("venue_id").eq("venue_id", venueBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue A cannot write to venue B's venue_licence_profile", async () => {
    await clientA.from("venue_licence_profile").update({ licence_status: "none" }).eq("venue_id", venueBId);
    const admin = createAdminClient();
    const { data: check } = await admin
      .from("venue_licence_profile")
      .select("licence_status")
      .eq("venue_id", venueBId)
      .single();
    expect(check!.licence_status).toBe("full");
  });

  it("venue A CAN read its own venue_contacts (direct venue_id policy, sanity check)", async () => {
    const { data, error } = await clientA.from("venue_contacts").select("id").eq("id", venueContactAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("venue A cannot read venue B's venue_contacts (direct venue_id policy)", async () => {
    const { data, error } = await clientA.from("venue_contacts").select("id").eq("id", venueContactBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue A CAN read its own menu_items (direct venue_id policy, sanity check)", async () => {
    const { data, error } = await clientA.from("menu_items").select("id").eq("id", menuItemAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("venue A cannot read venue B's menu_items (direct venue_id policy)", async () => {
    const { data, error } = await clientA.from("menu_items").select("id").eq("id", menuItemBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue A CAN read its own menu_item_modifier_groups (FK-subquery policy, sanity check)", async () => {
    const { data, error } = await clientA.from("menu_item_modifier_groups").select("id").eq("id", modifierGroupAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("venue A cannot read venue B's menu_item_modifier_groups (FK-subquery policy)", async () => {
    const { data, error } = await clientA.from("menu_item_modifier_groups").select("id").eq("id", modifierGroupBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue A CAN read its own menu_item_modifiers (two-hop FK-subquery policy, sanity check)", async () => {
    const { data, error } = await clientA.from("menu_item_modifiers").select("id").eq("id", modifierAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("venue A cannot read venue B's menu_item_modifiers (two-hop FK-subquery policy)", async () => {
    const { data, error } = await clientA.from("menu_item_modifiers").select("id").eq("id", modifierBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue A CAN read its own wizard_sessions (direct venue_id policy, sanity check)", async () => {
    const { data, error } = await clientA.from("wizard_sessions").select("id").eq("id", wizardSessionAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("venue A cannot read venue B's wizard_sessions (direct venue_id policy)", async () => {
    const { data, error } = await clientA.from("wizard_sessions").select("id").eq("id", wizardSessionBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue A cannot write to venue B's wizard_sessions", async () => {
    await clientA.from("wizard_sessions").update({ current_step: "hacked" }).eq("id", wizardSessionBId);
    const admin = createAdminClient();
    const { data: check } = await admin
      .from("wizard_sessions")
      .select("current_step")
      .eq("id", wizardSessionBId)
      .single();
    expect(check!.current_step).toBe("venue_basics");
  });

  it("venue A CAN read its own venue_key_roles (direct venue_id policy, sanity check)", async () => {
    const { data, error } = await clientA.from("venue_key_roles").select("id").eq("id", keyRoleAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("venue A cannot read venue B's venue_key_roles (direct venue_id policy)", async () => {
    const { data, error } = await clientA.from("venue_key_roles").select("id").eq("id", keyRoleBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue A CAN read its own onboarding_content_checks (direct venue_id policy, sanity check)", async () => {
    const { data, error } = await clientA.from("onboarding_content_checks").select("id").eq("id", contentCheckAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("venue A cannot read venue B's onboarding_content_checks (direct venue_id policy)", async () => {
    const { data, error } = await clientA.from("onboarding_content_checks").select("id").eq("id", contentCheckBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("venue A CAN read its own venue_promotions (direct venue_id policy, sanity check)", async () => {
    const { data, error } = await clientA.from("venue_promotions").select("id").eq("id", promotionAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("venue A cannot read venue B's venue_promotions (direct venue_id policy)", async () => {
    const { data, error } = await clientA.from("venue_promotions").select("id").eq("id", promotionBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

// Compliance tables, the new role tables and the views: the same two venue proof for the tables added after the older suite.
describe("multi-tenant isolation: compliance, roles and views", () => {
  let roleA = "";
  let roleB = "";
  let ownerAId = "";
  let ownerBId = "";
  let unitA = "";
  let unitB = "";
  let recA = "";
  let recB = "";
  // table names in a loop are not one typed union, so use an untyped handle for the loops only
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyA = () => clientA as unknown as { from: (t: string) => any };

  beforeAll(async () => {
    const admin = createAdminClient();
    const mk = async (venueId: string, name: string) => {
      const { data: role } = await admin.from("staff_roles").insert({ venue_id: venueId, name: "Cook " + name, department: "BOH", fallback_tier: "frontline" }).select("id").single();
      const { data: owner } = await admin.from("app_users").select("id").eq("venue_id", venueId).eq("role", "owner").single();
      await admin.from("venue_compliance_forms").insert({ venue_id: venueId, form_id: "B13", enabled: true });
      await admin.from("venue_compliance_settings").upsert({ venue_id: venueId, trade_waste_agreement: "yes", offers_accommodation: false, high_risk_activities: [] }, { onConflict: "venue_id" });
      const { data: unit } = await admin.from("venue_refrigeration_units").insert({ venue_id: venueId, name: "Fridge " + name, unit_type: "cold", max_temp_c: 5 }).select("id").single();
      const rules = { version: "1", fields: [{ key: "note", type: "text", required: true }], fail: [] };
      const { data: rec, error } = await admin.rpc("submit_compliance_record", {
        p_venue_id: venueId,
        p_staff_id: owner!.id,
        p_form_id: "B13",
        p_gate_roles: ["BOH"],
        p_visible_roles: ["BOH"],
        p_rules: rules,
        p_entry: { client_request_id: randomUUID(), values: { note: "isolation " + name } },
        p_device_stamp: "isolation test",
      });
      if (error) throw error;
      // an out of range B2 reading makes an alert row in this venue too
      const { error: e2 } = await admin.rpc("submit_compliance_form", {
        p_venue_id: venueId,
        p_staff_id: owner!.id,
        p_form_id: "B2",
        p_visible_to_roles: ["BOH"],
        p_entries: [{ client_request_id: randomUUID(), unit_id: unit!.id, reading_c: 9, corrective_action: "isolation test" }],
        p_device_stamp: "isolation test",
      });
      if (e2) throw e2;
      return { roleId: role!.id, ownerId: owner!.id, unitId: unit!.id, recId: (rec as { id: string }).id };
    };
    const a = await mk(venueAId, "A");
    const b = await mk(venueBId, "B");
    roleA = a.roleId;
    ownerAId = a.ownerId;
    unitA = a.unitId;
    recA = a.recId;
    roleB = b.roleId;
    ownerBId = b.ownerId;
    unitB = b.unitId;
    recB = b.recId;
  });

  const tables = [
    "staff_roles",
    "app_users",
    "compliance_form_submissions",
    "compliance_alert_log",
    "venue_compliance_forms",
    "venue_compliance_settings",
    "venue_refrigeration_units",
    "compliance_latest_by_subject",
    "compliance_b2_latest_readings",
  ] as const;

  it("venue A sees only its own rows in every compliance and role table and view (sanity check)", async () => {
    for (const t of tables) {
      const { data, error } = await anyA().from(t).select("venue_id");
      expect(error, t).toBeNull();
      expect((data ?? []).length, t + " has rows for A").toBeGreaterThan(0);
      expect((data ?? []).every((r: { venue_id: string }) => r.venue_id === venueAId), t + " only venue A").toBe(true);
    }
  });

  it("venue A reads none of venue B's rows in any of them, by scan and by venue id", async () => {
    for (const t of tables) {
      const { data, error } = await anyA().from(t).select("venue_id").eq("venue_id", venueBId);
      expect(error, t).toBeNull();
      expect(data, t).toHaveLength(0);
    }
  });

  it("venue A cannot read venue B's specific rows by known id", async () => {
    expect((await clientA.from("compliance_form_submissions").select("id").eq("id", recB)).data).toHaveLength(0);
    expect((await clientA.from("staff_roles").select("id").eq("id", roleB)).data).toHaveLength(0);
    expect((await clientA.from("venue_refrigeration_units").select("id").eq("id", unitB)).data).toHaveLength(0);
    expect((await clientA.from("app_users").select("id").eq("id", ownerBId)).data).toHaveLength(0);
  });

  it("venue A cannot update or delete venue B's rows (nothing changes)", async () => {
    await clientA.from("staff_roles").update({ department: "FOH" }).eq("id", roleB);
    await clientA.from("staff_roles").delete().eq("id", roleB);
    await clientA.from("app_users").update({ name: "Hijacked" }).eq("id", ownerBId);
    await clientA.from("app_users").delete().eq("id", ownerBId);
    await clientA.from("venue_compliance_forms").update({ enabled: false }).eq("venue_id", venueBId);
    await clientA.from("venue_compliance_settings").update({ offers_accommodation: true }).eq("venue_id", venueBId);
    await clientA.from("venue_refrigeration_units").update({ max_temp_c: 99 }).eq("id", unitB);
    await clientA.from("compliance_form_submissions").update({ payload: {} }).eq("id", recB);
    await clientA.from("compliance_form_submissions").delete().eq("id", recB);
    const admin = createAdminClient();
    const [r, u, f, s, un, rec] = await Promise.all([
      admin.from("staff_roles").select("department").eq("id", roleB).single(),
      admin.from("app_users").select("name").eq("id", ownerBId).single(),
      admin.from("venue_compliance_forms").select("enabled").eq("venue_id", venueBId).single(),
      admin.from("venue_compliance_settings").select("offers_accommodation").eq("venue_id", venueBId).single(),
      admin.from("venue_refrigeration_units").select("max_temp_c").eq("id", unitB).single(),
      admin.from("compliance_form_submissions").select("id, payload").eq("id", recB).single(),
    ]);
    expect(r.data?.department).toBe("BOH");
    expect(u.data?.name).not.toBe("Hijacked");
    expect(f.data?.enabled).toBe(true);
    expect(s.data?.offers_accommodation).toBe(false);
    expect(Number(un.data?.max_temp_c)).toBe(5);
    expect(rec.data?.id).toBe(recB);
    expect(JSON.stringify(rec.data?.payload)).toContain("isolation B");
  });

  it("venue A cannot insert rows scoped to venue B", async () => {
    const a = await clientA.from("staff_roles").insert({ venue_id: venueBId, name: "Foreign", department: "BOH", fallback_tier: "frontline" });
    const b = await clientA.from("venue_compliance_forms").insert({ venue_id: venueBId, form_id: "B12", enabled: true });
    const c = await clientA.from("venue_refrigeration_units").insert({ venue_id: venueBId, name: "Foreign unit", unit_type: "cold", max_temp_c: 5 });
    const d = await clientA.from("compliance_form_submissions").insert({ venue_id: venueBId, form_id: "B13", submitted_by: ownerAId, submitted_by_name: "x", payload: {} });
    const e = await clientA.from("app_users").insert({ venue_id: venueBId, role: "staff", name: "Foreign staff" });
    for (const r of [a, b, c, d, e]) expect(r.error).not.toBeNull();
    const admin = createAdminClient();
    expect((await admin.from("staff_roles").select("id").eq("venue_id", venueBId).eq("name", "Foreign")).data).toHaveLength(0);
    expect((await admin.from("app_users").select("id").eq("venue_id", venueBId).eq("name", "Foreign staff")).data).toHaveLength(0);
  });

  it("venue A cannot give itself venue B's role, nor move itself into venue B", async () => {
    const x = await clientA.from("app_users").update({ staff_role_id: roleB }).eq("id", ownerAId);
    const y = await clientA.from("app_users").update({ venue_id: venueBId }).eq("id", ownerAId);
    expect(x.error ?? y.error).not.toBeNull();
    const admin = createAdminClient();
    const { data } = await admin.from("app_users").select("venue_id, staff_role_id").eq("id", ownerAId).single();
    expect(data?.venue_id).toBe(venueAId);
    expect(data?.staff_role_id).not.toBe(roleB);
  });

  it("venue A's own rows still work (sanity: own record visible, own role update)", async () => {
    const { data: rec } = await clientA.from("compliance_form_submissions").select("id").eq("id", recA);
    expect(rec).toHaveLength(1);
    const { error } = await clientA.from("staff_roles").update({ department: "FOH" }).eq("id", roleA);
    expect(error).toBeNull();
    const admin = createAdminClient();
    expect((await admin.from("staff_roles").select("department").eq("id", roleA).single()).data?.department).toBe("FOH");
    expect(unitA).not.toBe(unitB);
  });
});
