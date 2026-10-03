import { test, expect } from "@playwright/test";
import { adminClient, createFixture, destroyFixture, PIN, type Fixture } from "./helpers/stage0";

// P26: the live staff PIN login uses ONE atomic, capped failure counter. Everything runs on a DISPOSABLE
// fixture venue (removed afterwards); no real account can be locked by this spec.
test.describe.configure({ timeout: 300_000, mode: "serial" });

let fx: Fixture;
test.beforeAll(async () => {
  fx = await createFixture("pl");
  expect(fx.slug.startsWith("pl-")).toBe(true);
});
test.afterAll(async () => {
  await destroyFixture(fx);
});

const WRONG = "0000";
const state = async (id: string) => {
  const { data } = await adminClient().from("app_users").select("pin_failed_attempts, pin_locked_until").eq("id", id).single();
  return { attempts: data?.pin_failed_attempts ?? 0, lockedUntil: data?.pin_locked_until ? new Date(data.pin_locked_until).getTime() : null };
};
const login = (request: import("@playwright/test").APIRequestContext, staffId: string, pin: string) =>
  request.post("/api/auth/staff/login-pin", { data: { venueSlug: fx.slug, staffUserId: staffId, pin } });

test("20 parallel wrong PINs count exactly 5 and lock once for about 15 minutes", async ({ request }) => {
  const id = fx.staff.kitchenHand.id;
  const results = await Promise.all(Array.from({ length: 20 }, () => login(request, id, WRONG)));
  const statuses = results.map((r) => r.status());
  // an attempt is reserved BEFORE the compare: exactly 5 guesses are compared (401), the rest are refused as locked (423)
  expect(statuses.filter((x) => x === 401)).toHaveLength(5);
  expect(statuses.filter((x) => x === 423)).toHaveLength(15);
  const s = await state(id);
  expect(s.attempts).toBe(5);
  expect(s.lockedUntil).not.toBeNull();
  const minutes = (s.lockedUntil! - Date.now()) / 60_000;
  expect(minutes).toBeGreaterThan(13.5);
  expect(minutes).toBeLessThan(15.5);
});

test("a correct PIN is refused while locked (423), and the counter does not move", async ({ request }) => {
  const id = fx.staff.kitchenHand.id;
  const before = await state(id);
  const res = await login(request, id, PIN);
  expect(res.status()).toBe(423);
  expect((await state(id)).attempts).toBe(before.attempts);
});

test("once the lock has expired a correct PIN works and resets the counter", async ({ request }) => {
  const id = fx.staff.kitchenHand.id;
  await adminClient().from("app_users").update({ pin_locked_until: new Date(Date.now() - 60_000).toISOString() }).eq("id", id);
  const res = await login(request, id, PIN);
  expect(res.status()).toBe(200);
  const s = await state(id);
  expect(s.attempts).toBe(0);
  expect(s.lockedUntil).toBeNull();
});

test("three wrong PINs then a correct one resets the counter (not locked)", async ({ request }) => {
  const id = fx.staff.waiter.id;
  for (let i = 0; i < 3; i++) expect((await login(request, id, WRONG)).status()).toBe(401);
  expect((await state(id)).attempts).toBe(3);
  expect((await login(request, id, PIN)).status()).toBe(200);
  expect(await state(id)).toEqual({ attempts: 0, lockedUntil: null });
});

test("a wrong PIN right after a lock expires locks again straight away (unchanged behaviour)", async ({ request }) => {
  const id = fx.staff.bartender.id;
  await adminClient().from("app_users").update({ pin_failed_attempts: 5, pin_locked_until: new Date(Date.now() - 60_000).toISOString() }).eq("id", id);
  expect((await login(request, id, WRONG)).status()).toBe(401);
  const s = await state(id);
  expect(s.attempts).toBe(6);
  expect(s.lockedUntil).not.toBeNull();
  expect(s.lockedUntil!).toBeGreaterThan(Date.now());
});

test("the database function itself: 12 parallel calls count exactly 5 attempts", async () => {
  const id = fx.staff.dutyManager.id;
  const admin = adminClient();
  const results = await Promise.all(Array.from({ length: 12 }, () => admin.rpc("record_staff_pin_failure", { p_staff_id: id })));
  expect(results.every((r) => !r.error)).toBe(true);
  const counted = results.filter((r) => (r.data as { counted: boolean }).counted).length;
  expect(counted).toBe(5);
  expect((await state(id)).attempts).toBe(5);
});

test("the function is not callable by a signed out or signed in client", async ({ request }) => {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/record_staff_pin_failure`;
  const anon = await request.post(url, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, "Content-Type": "application/json" },
    data: { p_staff_id: fx.staff.headChef.id },
  });
  expect([401, 403, 404]).toContain(anon.status());
  expect((await state(fx.staff.headChef.id)).attempts).toBe(0);
});
