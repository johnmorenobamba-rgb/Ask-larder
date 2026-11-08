import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../../src/lib/supabase/types";

// Dashboard speed check (performance plan, Phase 0). Measures time to visible content on the staff home and modules
// pages and the owner dashboard and compliance pages of the demo venue, plus three header nav clicks per role.
//
// Run against a deployment, never the dev server (dev compiles on demand, so its numbers mean nothing):
//   PLAYWRIGHT_BASE_URL=https://asklarder.com.au npx playwright test tests/e2e/perf.spec.ts
// Optional: PERF_LABEL=baseline names the saved results file (perf-results/perf-<label>.json, kept out of test-results
// because Playwright empties that folder on every run), PERF_RUNS=5 changes the
// sample count, PERF_ENFORCE=1 fails the run when any median is over budget (report only by default).
//
// Accounts: a throwaway Kitchen Hand (back of house frontline, so the home page loads its heaviest tile set) and a
// throwaway manager, both created in the demo venue for this run and deleted afterwards. Sessions are minted the same
// way the PIN login does it (server side magic link exchange), so no credential is ever typed and login time is not
// part of any number. The global teardown's count check fails the run if either account is left behind.

const VENUE_SLUG = "coachmans-arms-wizard";
const BUDGET_MS = 750;
const RUNS = Number(process.env.PERF_RUNS ?? 3);
const ENFORCE = process.env.PERF_ENFORCE === "1";
const LABEL = process.env.PERF_LABEL ?? "run";
const PREFIX = "perf-check-";

const KITCHEN_HAND_ROLE = "Kitchen Hand";

function admin() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type Row = { role: string; kind: "load" | "nav"; name: string; coldMs: number | null; medianMs: number; samples: number[]; ttfbMs: number | null };
const rows: Row[] = [];

const suffix = randomUUID().slice(0, 8);
const created: { appUserIds: string[]; authIds: string[] } = { appUserIds: [], authIds: [] };

/** Removes perf accounts from this run and any left behind by a killed earlier run. */
async function sweep(venueId: string) {
  const a = admin();
  const { data: users } = await a.from("app_users").select("id, auth_id").eq("venue_id", venueId).like("email", `${PREFIX}%`);
  const appIds = new Set([...(users ?? []).map((u) => u.id), ...created.appUserIds]);
  const authIds = new Set([...(users ?? []).map((u) => u.auth_id).filter((x): x is string => !!x), ...created.authIds]);
  if (appIds.size) {
    const { error } = await a.from("app_users").delete().in("id", [...appIds]);
    if (error) throw new Error(`perf cleanup: could not delete app_users: ${error.message}`);
  }
  for (const id of authIds) {
    const { error } = await a.auth.admin.deleteUser(id);
    if (error && !/not.?found/i.test(error.message)) throw new Error(`perf cleanup: could not delete login: ${error.message}`);
  }
}

async function makeAccount(venueId: string, kind: "staff" | "manager", staffRoleId: string | null) {
  const a = admin();
  const email = `${PREFIX}${kind}-${suffix}@venue.internal`;
  const { data: authData, error: authError } = await a.auth.admin.createUser({ email, email_confirm: true });
  if (authError || !authData.user) throw authError ?? new Error("perf: no auth user");
  created.authIds.push(authData.user.id);
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
  if (error || !row) throw error ?? new Error("perf: no app_users row");
  created.appUserIds.push(row.id);
  return email;
}

/** Mints a real session for `email` and returns it as the @supabase/ssr cookies the app reads. */
async function sessionCookies(email: string, baseURL: string) {
  const { data: link, error: linkError } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  if (linkError || !link) throw linkError ?? new Error("perf: no magic link");
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
  if (jar.size === 0) throw new Error("perf: session produced no cookies");
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

async function contextFor(browser: Browser, email: string, baseURL: string): Promise<BrowserContext> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addCookies(await sessionCookies(email, baseURL));
  return context;
}

function median(xs: number[]) {
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

async function waitForHeading(page: Page, heading: RegExp) {
  await page.locator("h1").filter({ hasText: heading }).first().waitFor({ state: "visible", timeout: 30_000 });
}

/** A full page load: request sent until the page's own heading is visible. */
async function timeLoad(page: Page, url: string, heading: RegExp) {
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "commit" });
  await waitForHeading(page, heading);
  const ms = Date.now() - t0;
  const ttfb = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav ? Math.round(nav.responseStart - nav.requestStart) : null;
  });
  return { ms, ttfb };
}

/** A header nav click: menu open, link tapped, until the destination's heading is visible. Timer starts at the tap. */
async function timeNav(page: Page, linkName: string | RegExp, heading: RegExp) {
  await page.getByRole("button", { name: "Open menu" }).click();
  const link = page.getByRole("link", typeof linkName === "string" ? { name: linkName, exact: true } : { name: linkName }).filter({ visible: true }).first();
  await link.waitFor({ state: "visible" });
  const t0 = Date.now();
  await link.click();
  await waitForHeading(page, heading);
  return Date.now() - t0;
}

async function measureLoad(page: Page, role: string, name: string, url: string, heading: RegExp) {
  const cold = await timeLoad(page, url, heading);
  const samples: number[] = [];
  const ttfbs: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const r = await timeLoad(page, url, heading);
    samples.push(r.ms);
    if (r.ttfb !== null) ttfbs.push(r.ttfb);
  }
  rows.push({ role, kind: "load", name, coldMs: cold.ms, medianMs: median(samples), samples, ttfbMs: ttfbs.length ? median(ttfbs) : null });
}

async function measureNavs(page: Page, role: string, startUrl: string, startHeading: RegExp, hops: { link: string | RegExp; heading: RegExp; name: string }[]) {
  const samples: number[][] = hops.map(() => []);
  for (let i = 0; i < RUNS + 1; i++) {
    await page.goto(startUrl, { waitUntil: "commit" });
    await waitForHeading(page, startHeading);
    for (let h = 0; h < hops.length; h++) samples[h].push(await timeNav(page, hops[h].link, hops[h].heading));
  }
  hops.forEach((hop, h) => {
    const [cold, ...warm] = samples[h];
    rows.push({ role, kind: "nav", name: hop.name, coldMs: cold, medianMs: median(warm), samples: warm, ttfbMs: null });
  });
}

test.describe.serial("dashboard speed", () => {
  test.setTimeout(480_000);
  let venueId: string;
  let staffEmail: string;
  let managerEmail: string;

  test.beforeAll(async () => {
    const a = admin();
    const { data: venue, error } = await a.from("venues").select("id").eq("slug", VENUE_SLUG).single();
    if (error || !venue) throw error ?? new Error(`perf: venue ${VENUE_SLUG} not found`);
    venueId = venue.id;
    await sweep(venueId);
    const { data: role } = await a.from("staff_roles").select("id").eq("venue_id", venueId).eq("name", KITCHEN_HAND_ROLE).single();
    if (!role) throw new Error(`perf: ${KITCHEN_HAND_ROLE} role not found`);
    staffEmail = await makeAccount(venueId, "staff", role.id);
    managerEmail = await makeAccount(venueId, "manager", null);
  });

  test.afterAll(async () => {
    if (venueId) await sweep(venueId);
    if (!rows.length) return;
    const table = rows.map((r) => ({
      role: r.role,
      what: r.kind === "load" ? `load ${r.name}` : `nav → ${r.name}`,
      "cold ms": r.coldMs,
      "median ms": r.medianMs,
      "ttfb ms": r.ttfbMs ?? "",
      samples: r.samples.join(" "),
      budget: r.medianMs <= BUDGET_MS ? "ok" : "OVER",
    }));
    console.log(`\nDashboard speed (${LABEL}), ${RUNS} warm runs each, budget ${BUDGET_MS} ms on the median`);
    console.table(table);
    fs.mkdirSync("perf-results", { recursive: true });
    fs.writeFileSync(path.join("perf-results", `perf-${LABEL}.json`), JSON.stringify({ at: new Date().toISOString(), runs: RUNS, rows }, null, 2));
  });

  test("staff pages", async ({ browser, baseURL }) => {
    const context = await contextFor(browser, staffEmail, baseURL!);
    const page = await context.newPage();
    const greeting = /^(Morning|Afternoon|Evening), /;
    await measureLoad(page, "staff", "home", `/${VENUE_SLUG}/home`, greeting);
    await measureLoad(page, "staff", "modules", `/${VENUE_SLUG}/modules`, /^Your modules$/);
    await measureNavs(page, "staff", `/${VENUE_SLUG}/home`, greeting, [
      { link: "Modules", heading: /^Your modules$/, name: "modules" },
      { link: "Certificates", heading: /^Your certificates$/, name: "certificates" },
      { link: /^Larder Home$/, heading: greeting, name: "home" },
    ]);
    await context.close();
  });

  test("owner pages", async ({ browser, baseURL }) => {
    const context = await contextFor(browser, managerEmail, baseURL!);
    const page = await context.newPage();
    await measureLoad(page, "owner", "dashboard", `/${VENUE_SLUG}/owner/dashboard`, /^Dashboard$/);
    await measureLoad(page, "owner", "compliance", `/${VENUE_SLUG}/owner/compliance`, /^Compliance overview$/);
    await measureNavs(page, "owner", `/${VENUE_SLUG}/owner/dashboard`, /^Dashboard$/, [
      { link: "Staff", heading: /^Staff$/, name: "staff" },
      { link: "Certificates", heading: /^Certificates$/, name: "certificates" },
      { link: "Compliance", heading: /^Compliance overview$/, name: "compliance" },
    ]);
    await context.close();
  });

  test("budget", () => {
    const over = rows.filter((r) => r.medianMs > BUDGET_MS);
    if (ENFORCE && over.length) throw new Error(`Over ${BUDGET_MS} ms: ${over.map((r) => `${r.role} ${r.kind} ${r.name} ${r.medianMs} ms`).join(", ")}`);
  });
});
