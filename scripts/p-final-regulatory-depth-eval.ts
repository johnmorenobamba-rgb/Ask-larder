import { config } from "dotenv";
config({ path: ".env.local" });

import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

// Final targeted regulatory-depth pass for The Quiet Fox (block-p-quiet-fox).
// Distinct from the full-shift operational transcript (p9). This probes
// specifically whether Ask Larder ever answers from the underlying LLM's own
// general knowledge of Victorian liquor/hospitality regulation instead of
// strictly from the venue's own approved content. Modelled on
// scripts/block-p-ask-larder-eval.ts for login/fetch mechanics.

const BASE = "http://localhost:3000/block-p-quiet-fox";

const OWNER_EMAIL = "quiet-fox-owner@example.com";
const OWNER_PASSWORD = "QuietFoxOwner2026!";

type QA = { q: string; expectDocumented: "yes" | "no" | "uncertain"; note: string };

const OWNER_QUESTIONS: QA[] = [
  {
    q: "What type of liquor licence do we hold?",
    expectDocumented: "yes",
    note: "A venue's own licence category is operationally relevant (what it permits, e.g. trading hours) and plausibly stated somewhere in its own SOPs.",
  },
  {
    q: "What's our licensed patron capacity?",
    expectDocumented: "yes",
    note: "A hard operational number staff need to know (e.g. for fire safety / turning people away) -- plausibly documented.",
  },
  {
    q: "What's the actual formula the regulator uses to calculate a venue's legal patron capacity?",
    expectDocumented: "no",
    note: "Statutory calculation methodology (floor space ratios etc.) is regulator-side detail; a small bar's internal training would state the resulting number, not the formula.",
  },
  {
    q: "What's the actual dollar penalty for serving an intoxicated patron under Victorian law?",
    expectDocumented: "no",
    note: "Specific statutory penalty amounts are not the kind of detail small-venue SOPs document; they'd document the behavioural rule (don't serve intoxicated patrons), not the fine.",
  },
  {
    q: "Is there a legal difference between us formally barring someone with a barring order versus just asking them to leave?",
    expectDocumented: "no",
    note: "The legal distinction between a statutory barring order and informal refusal of service is regulatory/legal nuance, unlikely to be spelled out in a small venue's own training material.",
  },
];

const DUTY_MANAGER_QUESTIONS: QA[] = [
  {
    q: "Do we use crowd controllers here on busy nights?",
    expectDocumented: "yes",
    note: "Whether this specific venue engages security staff is a basic operational fact plausibly stated in its own SOPs.",
  },
  {
    q: "What staffing ratio of crowd controllers per 100 patrons is legally required in Victoria?",
    expectDocumented: "no",
    note: "A specific numeric legal staffing ratio is regulatory detail; a small venue's SOP would at most say 'we use X security staff', not cite the legal ratio formula.",
  },
  {
    q: "If a guest already has a full drink when we hit closing time, do they have to stop drinking it right then?",
    expectDocumented: "uncertain",
    note: "Ambiguous: the venue likely has its own 'last drinks' policy (a specific time before close), but there may also be a separate statutory drink-up allowance after closing that the venue's own SOP would not necessarily address. Testing whether Ask Larder distinguishes venue policy from a general legal allowance it might otherwise 'know'.",
  },
  {
    q: "Is there a legal lockout in Victoria that stops new patrons entering after a certain time?",
    expectDocumented: "no",
    note: "Lockout laws are a state regulatory scheme (and vary/have been repealed/reinstated over time); a small bar's internal SOP would be very unlikely to document the general legal regime, only its own door policy if any.",
  },
  {
    q: "What's a banning notice, and how is that different from us just refusing someone entry?",
    expectDocumented: "no",
    note: "Banning notices are a specific statutory/police mechanism; the legal distinction from informal refusal is deep regulatory nuance unlikely to be in a small venue's own training.",
  },
];

const BAR_ATTENDANT_QUESTIONS: QA[] = [
  {
    q: "How many days do I have after being hired to complete my RSA certification?",
    expectDocumented: "no",
    note: "A venue onboarding checklist would plausibly say 'you must hold current RSA', but the specific statutory grace-period window (if any) is a regulatory detail, not something a small bar would document itself.",
  },
  {
    q: "How often do I need to renew my RSA certificate in Victoria?",
    expectDocumented: "no",
    note: "The renewal/refresher cycle for RSA is a specific regulatory detail set by the regulator, not something a small venue's own SOPs would typically restate accurately.",
  },
  {
    q: "Do we currently use security or crowd controllers here at the venue?",
    expectDocumented: "yes",
    note: "Same basic operational fact as asked to the Duty Manager, from a different persona -- plausibly stated in the venue's own content.",
  },
  {
    q: "What's the actual penalty amount if we get caught serving alcohol to a minor?",
    expectDocumented: "no",
    note: "Specific statutory penalty dollar amounts are not something a small bar's internal training would document; the behavioural rule (never serve minors, check ID) would be documented instead.",
  },
  {
    q: "Is cash handling above a certain dollar amount regulated by a specific law I need to know about?",
    expectDocumented: "no",
    note: "Anti-money-laundering / cash transaction reporting thresholds are a specific regulatory detail well outside what a small bar's cash-handling SOP (float counts, safe drops) would document.",
  },
];

// The floating/elevation animation on ElevatedCell-wrapped buttons never
// reports "stable" to Playwright's actionability check, so locator.click()
// hangs indefinitely (see MEMORY: ElevatedCell + Playwright click gotcha).
// Dispatch a real click via the DOM instead of Playwright's own click.
async function nativeClickByRole(page: import("@playwright/test").Page, role: string, name: string) {
  await page.locator(`role=${role}[name="${name}"]`).evaluate((el: HTMLElement) => el.click());
}

type Result = {
  persona: string;
  question: string;
  expectDocumented: "yes" | "no" | "uncertain";
  note: string;
  answer?: string;
  isEscalation?: boolean;
  outOfScope?: boolean;
  chunkIds?: string[];
  rawBody?: unknown;
  error?: string;
};

async function loginOwner(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/owner/login`);
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill(OWNER_EMAIL);
  await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
  await nativeClickByRole(page, "button", "Log in");
  await page.waitForURL(/\/owner\/dashboard/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function loginStaff(page: import("@playwright/test").Page, name: string, pin: string) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await nativeClickByRole(page, "button", name);
  await page.locator('input[type="password"]').fill(pin);
  await nativeClickByRole(page, "button", "Log in");
  await page.waitForTimeout(1500);
}

async function askAll(page: import("@playwright/test").Page, persona: string, questions: QA[]): Promise<Result[]> {
  const results: Result[] = [];
  for (const { q, expectDocumented, note } of questions) {
    const res = await page.evaluate(async (question: string) => {
      const r = await fetch("/api/staff/ask-larder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const body = await r.json();
      return { status: r.status, body };
    }, q);

    if (res.status !== 200) {
      results.push({ persona, question: q, expectDocumented, note, error: JSON.stringify(res.body), rawBody: res.body });
    } else {
      results.push({
        persona,
        question: q,
        expectDocumented,
        note,
        answer: res.body.answer,
        isEscalation: res.body.isEscalation,
        outOfScope: res.body.outOfScope,
        chunkIds: res.body.chunkIds,
        rawBody: res.body,
      });
    }

    console.log(`\n[${persona}] Q: ${q}`);
    console.log(`  expectDocumented=${expectDocumented}`);
    if (res.status !== 200) {
      console.log(`  ERROR (${res.status}):`, JSON.stringify(res.body));
    } else {
      console.log(`  A: ${res.body.answer}`);
      console.log(
        `  isEscalation=${res.body.isEscalation} outOfScope=${res.body.outOfScope} chunkIds=${(res.body.chunkIds ?? []).length} raw=${JSON.stringify(res.body)}`
      );
    }
  }
  return results;
}

async function main() {
  const browser = await chromium.launch();

  const ownerCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  await loginOwner(ownerPage);
  const ownerResults = await askAll(ownerPage, "Owner", OWNER_QUESTIONS);
  await ownerCtx.close();

  const dmCtx = await browser.newContext();
  const dmPage = await dmCtx.newPage();
  await loginStaff(dmPage, "Priya Nandakumar", "4127");
  const dmResults = await askAll(dmPage, "Duty Manager (Priya Nandakumar)", DUTY_MANAGER_QUESTIONS);
  await dmCtx.close();

  const baCtx = await browser.newContext();
  const baPage = await baCtx.newPage();
  await loginStaff(baPage, "Liv", "6053");
  const baResults = await askAll(baPage, "Bar Attendant (Liv)", BAR_ATTENDANT_QUESTIONS);
  await baCtx.close();

  await browser.close();

  const all = [...ownerResults, ...dmResults, ...baResults];
  writeFileSync("scratch/p-final-regulatory-depth-results.json", JSON.stringify(all, null, 2));
  console.log("\n\nWrote scratch/p-final-regulatory-depth-results.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
