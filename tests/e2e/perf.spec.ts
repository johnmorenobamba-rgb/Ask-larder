import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { test, type Page } from "@playwright/test";
import { DEMO_VENUE_SLUG as VENUE_SLUG, demoRoleId, demoVenueId, makeDemoAccount, signedInContext, sweepDemoAccounts } from "./helpers/demoSession";

// Dashboard speed check (performance plan). Measures time to visible content on the staff home and modules pages and
// the owner dashboard and compliance pages of the demo venue, plus three header nav clicks per role.
//
// Run against a deployment, never the dev server (dev compiles on demand, so its numbers mean nothing):
//   PLAYWRIGHT_BASE_URL=https://asklarder.com.au npx playwright test tests/e2e/perf.spec.ts
// Optional: PERF_LABEL=baseline names the saved results file (perf-results/perf-<label>.json, kept out of test-results
// because Playwright empties that folder on every run), PERF_RUNS=5 changes the sample count. The run FAILS when any
// median is over the 750 ms budget (since Phase 5, 9 Nov 2026); PERF_REPORT_ONLY=1 prints the table without failing.
// Region rule and when to run it: docs/venue-build-manual.md section 7.
//
// Accounts: a throwaway Kitchen Hand (back of house frontline, so the home page loads its heaviest tile set) and a
// throwaway manager, both created in the demo venue for this run and deleted afterwards (helpers/demoSession.ts).

const BUDGET_MS = 750;
const RUNS = Number(process.env.PERF_RUNS ?? 3);
const ENFORCE = process.env.PERF_REPORT_ONLY !== "1";
const LABEL = process.env.PERF_LABEL ?? "run";

type Row = { role: string; kind: "load" | "nav"; name: string; coldMs: number | null; medianMs: number; samples: number[]; ttfbMs: number | null };
const rows: Row[] = [];

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
  // The drawer slides in over 240ms. A trial click waits until the link has stopped moving (Playwright actionability)
  // without clicking, so the timer starts where a person would tap, not partway through the slide. Before 9 Nov 2026
  // the slide was inside every nav number (about 200ms of each one in the baseline and Phases 1 and 2).
  await link.click({ trial: true });
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
    venueId = await demoVenueId();
    await sweepDemoAccounts(venueId);
    staffEmail = await makeDemoAccount(venueId, "staff", await demoRoleId(venueId, "Kitchen Hand"));
    managerEmail = await makeDemoAccount(venueId, "manager", null);
  });

  test.afterAll(async () => {
    if (venueId) await sweepDemoAccounts(venueId);
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
    const context = await signedInContext(browser, staffEmail, baseURL!);
    const page = await context.newPage();
    const greeting = /^(Morning|Afternoon|Evening), /;
    await measureLoad(page, "staff", "home", `/${VENUE_SLUG}/home`, greeting);
    await measureLoad(page, "staff", "modules", `/${VENUE_SLUG}/modules`, /^Your modules$/);
    await measureNavs(page, "staff", `/${VENUE_SLUG}/home`, greeting, [
      { link: "Modules", heading: /^Your modules$/, name: "modules" },
      { link: "Certificates", heading: /^Your certificates$/, name: "certificates" },
      // The drawer's Home link carries the logo, so its accessible name is "Larder Home".
      { link: /^Larder Home$/, heading: greeting, name: "home" },
    ]);
    await context.close();
  });

  test("owner pages", async ({ browser, baseURL }) => {
    const context = await signedInContext(browser, managerEmail, baseURL!);
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
