import { test, expect, type Page, type Locator, type CDPSession } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { adminClient, createFixture, destroyFixture, nativeClick, PIN, fixtureOwnerPassword, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";
import { pickerName } from "./helpers/pickerName";

// Loading feedback walkthrough (7 Nov 2026), on a DISPOSABLE fixture venue removed afterwards. Two parts:
//
// 1. Throttled walk (Chromium Slow 3G via CDP: 400ms RTT, 400 kbps down) at the iPad viewport, recorded to video. Every
//    tap is measured inside the page: ms from the click to the first feedback (the tapped link's pending marker, the
//    tapped button going busy or disabled, or the route loading overlay), and for buttons, whether the button ever
//    re-enabled while the old content was still on screen.
// 2. Pending state screenshots at mobile, iPad and desktop (CLAUDE.md rule 5), holding each pending state open with
//    artificial latency on the one request that resolves it.
//
// Run against a production build: PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test loading-feedback
// Set LOADING_BASE_URL_PROD to repeat the station and Ask Larder part against production (no fixture writes there).

const SHOTS = path.resolve(__dirname, "../../docs/screenshots/loading-states");
const REPORT = path.resolve(__dirname, "../../scratch/loading-feedback/report.json");
const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  ipad: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
} as const;

test.describe.configure({ mode: "serial", timeout: 900_000 });
test.use({ viewport: VIEWPORTS.ipad, hasTouch: true });

let fx: Fixture;
let hubPath = "";
let stationId = "";
const pendingModuleIds: string[] = [];
const pendingFaqIds: string[] = [];
type TapResult = { step: string; feedbackMs: number | null; earlyReenable: boolean; note?: string };
const results: TapResult[] = [];

test.beforeAll(async () => {
  fx = await createFixture("lf");
  const admin = adminClient();
  const { data: mod } = await admin.from("modules").insert({ venue_id: fx.venueId, title: "Fryer safety", status: "live", version: 1 }).select("id").single().throwOnError();
  await admin.from("module_sections").insert({ module_id: mod!.id, section_order: 1, content: "Turn the fryer off and let the oil cool before you drain it." }).throwOnError();
  await admin.from("check_questions").insert({ module_id: mod!.id, section_order: 1, question: "When do you drain the oil?", options: ["While it is hot", "Once it has cooled"], correct_option_index: 1, expected_answer_context: "Once it has cooled." }).throwOnError();
  const { data: st } = await admin.from("stations").select("id, qr_code_slug").eq("venue_id", fx.venueId).eq("name", "Fryer").single().throwOnError();
  stationId = st!.id;
  hubPath = `/${fx.slug}/station/${st!.qr_code_slug}`;
  await admin.from("stations").update({ primary_module_id: mod!.id }).eq("id", stationId).throwOnError();
  await admin.from("station_faqs").insert({ station_id: stationId, question: "Where is the fryer oil kept?", answer: "In the dry store, bottom shelf.", provenance: "owner_sourced", status: "approved" }).throwOnError();
  await admin.from("station_troubleshooting_issues").insert({ station_id: stationId, issue_title: "Oil is smoking", diagnosis_steps: "Check the thermostat dial.", resolution_text: "Turn it down to 180 degrees.", escalation_required: true, provenance: "owner_sourced", status: "approved" }).throwOnError();
  for (let i = 1; i <= 4; i++) {
    const { data: pm } = await admin.from("modules").insert({ venue_id: fx.venueId, title: `Closing checklist ${i}`, status: "pending_approval", version: 1 }).select("id").single().throwOnError();
    await admin.from("module_sections").insert({ module_id: pm!.id, section_order: 1, content: "Lock the back door." }).throwOnError();
    await admin.from("check_questions").insert({ module_id: pm!.id, section_order: 1, question: "What do you lock?", options: ["The back door", "Nothing"], correct_option_index: 0, expected_answer_context: "The back door." }).throwOnError();
    pendingModuleIds.push(pm!.id);
    const { data: pf } = await admin.from("station_faqs").insert({ station_id: stationId, question: `Pending question ${i}`, answer: "Pending answer.", provenance: "owner_sourced", status: "pending_approval" }).select("id").single().throwOnError();
    pendingFaqIds.push(pf!.id);
  }
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
});

test.afterAll(async () => {
  fs.writeFileSync(REPORT, JSON.stringify(results, null, 2));
  await destroyFixture(fx);
});

async function slow3g(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
  });
  return cdp;
}

/**
 * Tap `target` and measure, in the page: ms from the click to the first visible sign of feedback, and (buttons) whether
 * the button stopped being busy while `doneText` was not yet on screen. Resolves once `done` resolves.
 */
async function measuredTap(page: Page, step: string, target: Locator, done: () => Promise<unknown>, doneText?: string) {
  await target.waitFor({ state: "visible", timeout: 120_000 });
  await target.evaluate((el, doneText) => {
    el.setAttribute("data-tap-target", "");
    const w = window as unknown as { __tap: { t0: number; feedback: number | null; wasBusy: boolean; early: boolean } };
    w.__tap = { t0: 0, feedback: null, wasBusy: false, early: false };
    const busyOf = (t: Element) =>
      (t as HTMLButtonElement).disabled === true || t.getAttribute("aria-busy") === "true" || !!t.querySelector("[data-link-pending]");
    const check = () => {
      const t = w.__tap;
      if (!t.t0) return;
      const tgt = document.querySelector("[data-tap-target]");
      const overlay = document.querySelector('.fixed.inset-0[role="status"]');
      const busy = !!tgt && busyOf(tgt);
      if (t.feedback === null && (busy || overlay)) t.feedback = performance.now() - t.t0;
      if (busy) t.wasBusy = true;
      if (tgt && t.wasBusy && !busy && doneText && !document.body.innerText.includes(doneText)) t.early = true;
    };
    document.addEventListener("click", () => { w.__tap.t0 = performance.now(); requestAnimationFrame(check); }, { capture: true, once: true });
    new MutationObserver(check).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-busy", "disabled", "data-link-pending", "class"] });
  }, doneText ?? null);
  await target.click({ force: true });
  await done();
  const tap = await page.evaluate(() => (window as unknown as { __tap?: { feedback: number | null; early: boolean } }).__tap ?? null).catch(() => null);
  // A full navigation (rare) replaces the window and its recorder; the in page numbers are lost then, say so.
  const r: TapResult = tap
    ? { step, feedbackMs: tap.feedback === null ? null : Math.round(tap.feedback), earlyReenable: tap.early }
    : { step, feedbackMs: null, earlyReenable: false, note: "recorder replaced by the next document" };
  results.push(r);
  console.log(`[tap] ${step}: feedback ${r.feedbackMs ?? "n/a"} ms${r.earlyReenable ? ", RE-ENABLED EARLY" : ""}${r.note ? ` (${r.note})` : ""}`);
}

async function staffLogin(page: Page, name: string) {
  await page.context().clearCookies();
  await page.goto(`/${fx.slug}/login`, { timeout: 180_000 });
  await nativeClick(page, pickerName(name));
  await page.locator('input[type="password"]').fill(PIN);
}

test("throttled staff walk on the iPad viewport", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: VIEWPORTS.ipad,
    hasTouch: true,
    baseURL: test.info().project.use.baseURL,
    recordVideo: { dir: path.resolve(__dirname, "../../scratch/loading-feedback/video"), size: VIEWPORTS.ipad },
  });
  const page = await context.newPage();
  await slow3g(page);
  const T = 180_000;

  await staffLogin(page, FIXTURE_NAMES.kitchenHand);
  await measuredTap(page, "staff login: Log in", page.getByRole("button", { name: "Log in", exact: true }), () =>
    page.waitForURL(/\/(home|modules)$/, { timeout: T }),
  );
  await expect(page.getByText("modules complete")).toBeVisible({ timeout: T });

  // Station QR scan lands on the hub (a document load, like the camera opening the link).
  await page.goto(hubPath, { timeout: T });
  await expect(page.getByRole("heading", { name: "What do you need?" })).toBeVisible({ timeout: T });

  await measuredTap(page, "station hub: Troubleshooting card", page.getByRole("link", { name: /Troubleshooting/ }), () =>
    expect(page.getByRole("heading", { name: "Troubleshooting" })).toBeVisible({ timeout: T }),
  );
  await measuredTap(page, "troubleshooting: Back to station", page.getByRole("link", { name: /Back to station/ }), () =>
    expect(page.getByRole("heading", { name: "What do you need?" })).toBeVisible({ timeout: T }),
  );

  // Ask Larder from the station
  await page.getByRole("button", { name: "Ask Larder" }).click({ force: true });
  await page.getByPlaceholder("Type your question").fill("What do I do if the oil is smoking?");
  const askBtn = page.getByRole("button", { name: "Ask", exact: true });
  await measuredTap(page, "Ask Larder: Ask", askBtn, async () => {
    // Input is disabled while Thinking is shown, and stays so until the answer arrives.
    await expect(page.getByText("Thinking", { exact: true })).toBeVisible({ timeout: 2_000 });
    await expect(page.getByPlaceholder("Type your question")).toBeDisabled();
    await expect(page.locator('[data-testid="ask-larder-answer"], .border-preserve-red').first()).toBeVisible({ timeout: T });
  });
  await page.getByRole("button", { name: "Close" }).click({ force: true });

  await measuredTap(page, "station hub: Training card", page.getByRole("link", { name: /Training/ }), () =>
    expect(page.getByRole("button", { name: "Continue" })).toBeVisible({ timeout: T }),
  );
  await page.getByRole("button", { name: "Continue" }).click({ force: true });
  await page.getByRole("button", { name: "Once it has cooled" }).click({ force: true });
  await measuredTap(page, "module: last Continue (posts completion)", page.getByRole("button", { name: "Continue" }), () =>
    expect(page.getByRole("button", { name: "Back to station" })).toBeVisible({ timeout: T }),
    "Back to station",
  );
  await measuredTap(page, "module complete: Back to station", page.getByRole("button", { name: "Back to station" }), () =>
    expect(page.getByRole("heading", { name: "What do you need?" })).toBeVisible({ timeout: T }),
    "What do you need?",
  );

  // Temperature log from the home tile
  await page.goto(`/${fx.slug}/home`, { timeout: T });
  await measuredTap(page, "home: Temperature log tile", page.getByRole("link", { name: /logged today/ }), () =>
    expect(page.getByRole("heading", { name: "Temperature log" })).toBeVisible({ timeout: T }),
  );
  await page.getByLabel("Reading (°C)").nth(0).fill("4");
  await measuredTap(page, "temperature log: Save reading", page.getByRole("button", { name: /Save/ }), () =>
    expect(page.getByText(/1 of \d units logged today/)).toBeVisible({ timeout: T }),
    "1 of ",
  );

  await context.close();
});

test("throttled owner walk on the iPad viewport", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: VIEWPORTS.ipad,
    hasTouch: true,
    baseURL: test.info().project.use.baseURL,
    recordVideo: { dir: path.resolve(__dirname, "../../scratch/loading-feedback/video"), size: VIEWPORTS.ipad },
  });
  const page = await context.newPage();
  await slow3g(page);
  const T = 180_000;

  await page.goto(`/${fx.slug}/owner/login`, { timeout: T });
  await page.locator('input[type="email"]').fill(fx.ownerEmail);
  await page.locator('input[type="password"]').fill(fixtureOwnerPassword());
  await nativeClick(page, "Log in");
  await page.waitForURL(/\/owner\/dashboard/, { timeout: T });

  await page.getByRole("button", { name: /menu/i }).first().click({ force: true });
  await measuredTap(page, "owner nav drawer: Modules", page.getByRole("link", { name: "Modules", exact: true }), () =>
    page.waitForURL(/\/owner\/modules$/, { timeout: T }),
  );
  const approve = page.getByRole("button", { name: "Approve", exact: true }).first();
  await measuredTap(page, "owner modules: Approve", approve, () =>
    expect(page.getByRole("button", { name: "Go live" }).first()).toBeVisible({ timeout: T }),
    "Go live",
  );

  await page.goto(`/${fx.slug}/owner/stations/${stationId}/content`, { timeout: T });
  const before = await page.getByRole("button", { name: "Approve", exact: true }).count();
  await measuredTap(page, "owner station FAQ: Approve", page.getByRole("button", { name: "Approve", exact: true }).first(), () =>
    expect(page.getByRole("button", { name: "Approve", exact: true })).toHaveCount(before - 1, { timeout: T }),
  );

  await context.close();
});

/** Hold every request whose URL matches `match` for `ms` before letting it through. */
async function hold(page: Page, match: (url: URL, method: string) => boolean, ms: number) {
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (match(new URL(req.url()), req.method())) await new Promise((r) => setTimeout(r, ms));
    await route.continue().catch(() => {});
  });
}

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  test(`pending state screenshots, ${vpName}`, async ({ browser }, info) => {
    const i = Object.keys(VIEWPORTS).indexOf(vpName);
    const context = await browser.newContext({ viewport: vp, hasTouch: vpName !== "desktop", baseURL: info.project.use.baseURL });
    const page = await context.newPage();
    const shot = (name: string) => page.screenshot({ path: path.join(SHOTS, `${name}-${vpName}.png`) });
    const isRsc = (u: URL) => u.searchParams.has("_rsc");

    // Staff: station card pending (RSC for the next screen held 4 s)
    await staffLogin(page, FIXTURE_NAMES.kitchenHand);
    await nativeClick(page, "Log in");
    await page.waitForURL(/\/(home|modules)$/, { timeout: 120_000 });
    await page.goto(hubPath);
    await expect(page.getByRole("heading", { name: "What do you need?" })).toBeVisible({ timeout: 60_000 });
    await page.unrouteAll();
    await hold(page, (u) => isRsc(u), 4_000);
    await page.getByRole("link", { name: /Troubleshooting/ }).click({ force: true });
    await page.waitForTimeout(350);
    await shot("01-station-card-pending");
    await page.waitForTimeout(1_600);
    await shot("02-route-loading-overlay");
    await expect(page.getByRole("heading", { name: "Troubleshooting" })).toBeVisible({ timeout: 60_000 });
    await page.unrouteAll();

    // Ask Larder: Thinking (answer held 4 s)
    await page.goto(hubPath);
    await expect(page.getByRole("heading", { name: "What do you need?" })).toBeVisible({ timeout: 60_000 });
    await hold(page, (u) => u.pathname === "/api/staff/ask-larder", 4_000);
    await page.getByRole("button", { name: "Ask Larder" }).click({ force: true });
    await page.getByPlaceholder("Type your question").fill("Where is the fryer oil kept?");
    await page.getByRole("button", { name: "Ask", exact: true }).click({ force: true });
    await page.waitForTimeout(400);
    await shot("03-ask-larder-thinking");
    await expect(page.locator('[data-testid="ask-larder-answer"], .border-preserve-red').first()).toBeVisible({ timeout: 90_000 });
    await page.unrouteAll();

    // Temperature log: Saving (POST held 4 s)
    await page.goto(`/${fx.slug}/temperature`);
    await expect(page.getByRole("heading", { name: "Temperature log" })).toBeVisible({ timeout: 60_000 });
    await hold(page, (u, m) => u.pathname === "/api/staff/compliance/b2" && m === "POST", 4_000);
    await page.getByLabel("Reading (°C)").nth(1).fill("-18");
    await page.getByRole("button", { name: /Save/ }).click({ force: true });
    await page.waitForTimeout(400);
    await shot("04-temperature-saving");
    await page.unrouteAll();

    // Staff nav drawer item pending (mobile and iPad have the hamburger; same drawer on desktop)
    await page.goto(`/${fx.slug}/home`);
    await expect(page.getByText("modules complete")).toBeVisible({ timeout: 60_000 });
    await hold(page, (u) => isRsc(u), 4_000);
    await page.getByRole("button", { name: /menu/i }).first().click({ force: true });
    await page.waitForTimeout(400);
    await page.getByRole("link", { name: "Certificates", exact: true }).click({ force: true });
    await page.waitForTimeout(350);
    await shot("05-staff-nav-item-pending");
    await page.unrouteAll();

    // Owner: module Approve busy (POST held 4 s), on this viewport's own pending module
    await page.context().clearCookies();
    await page.goto(`/${fx.slug}/owner/login`);
    await page.locator('input[type="email"]').fill(fx.ownerEmail);
    await page.locator('input[type="password"]').fill(fixtureOwnerPassword());
    await nativeClick(page, "Log in");
    await page.waitForURL(/\/owner\/dashboard/, { timeout: 120_000 });
    await page.goto(`/${fx.slug}/owner/modules`);
    await hold(page, (u, m) => u.pathname === `/api/owner/modules/${pendingModuleIds[i + 1]}/approve` && m === "POST", 4_000);
    const row = page.locator("li, div").filter({ hasText: `Closing checklist ${i + 2}` }).filter({ has: page.getByRole("button", { name: "Approve", exact: true }) }).last();
    await row.getByRole("button", { name: "Approve", exact: true }).click({ force: true });
    await page.waitForTimeout(400);
    await shot("06-owner-approve-busy");
    await page.unrouteAll();
    await context.close();
  });
}
