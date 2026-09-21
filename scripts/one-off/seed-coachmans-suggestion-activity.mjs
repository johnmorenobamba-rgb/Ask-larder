// Part 2 of the suggestion-assistant cron/seeding/audit/landing task (22 Sep
// 2026): seeds realistic, messy activity on the real coachmans-arms-wizard
// venue, entirely through the real UI (Ask Larder chat + the real near-miss
// report form), as real already-seeded staff members, using the same
// credential-safe pattern as verify-coachmans-arms-station-hubs.mjs -- owner
// clears a real staff member's PIN via the real "Reset PIN" button, the
// staff member then self-serves a brand new PIN through the real first-login
// UI. No direct database writes for any of the activity itself.
//
// Deliberately synthetic, deliberately documented as such (see the Decision
// Log entry and session handover this run feeds) -- same practice as this
// venue's SOP intake. Real Claude calls throughout (Ask Larder answers, the
// suggestion pass's clustering + drafting), nothing mocked.
//
// Run with: npx tsx scripts/one-off/seed-coachmans-suggestion-activity.mjs
import { chromium } from "playwright";

const BASE = "https://asklarder.com.au";
const VENUE_SLUG = "coachmans-arms-wizard";
const OWNER_EMAIL = "john.moreno.bamba+coachmans-arms-wizard@gmail.com";
const OWNER_PASSWORD = "RealOwnerAudit2026!";
const SEED_PIN = "5940"; // same PIN reused for every seeded staff login this run -- fine, self-served fresh each time, never an owner-set credential

// Real staff names -> assigned real activity. Phrasing is deliberately
// varied per person, never copy-pasted, matching the "messy, realistic"
// standing requirement used for every prior content pass on this venue.
const STAFF = [
  {
    name: "Dave Kowalski",
    chats: [
      "if a patron's really unhappy about losing on the pokies, is there a formal complaints process or do I just handle it myself",
      "what's the max time the pies can sit out in the hot box before we knock them off, is there an actual policy on that",
    ],
  },
  {
    name: "Steph Vella",
    chats: [
      "what's our policy if someone wants to self-exclude from the gaming room",
      "if one of the girls goes on maternity leave mid-roster, what's the process for covering her shifts",
    ],
  },
  {
    name: "Vinh Tran",
    chats: [
      "can I approve a shift swap myself on deputy or does it need to go through dave",
      "how often does the bain-marie need to be logged, is that separate from the display cabinet check",
    ],
    nearMiss:
      "walked past the power board by the walk-in and the cord looked chewed up / frayed near the plug, meg flagged the same thing to me earlier, taped it off for now till someone can look at it properly",
  },
  {
    name: "Meg O'Brien",
    chats: [
      "deputy's not letting me pick up vinh's thursday shift, is there a setting i'm missing",
      "what's larder's actual policy on parental leave, not just the award minimum",
    ],
  },
  {
    name: "Rob Doyle",
    chats: [
      "bloke reckons the pokies ate his note and wants his money back, what do i actually tell him",
      "who's meant to be doing the grab and go fridge temp checks, is that on me or FOH generally",
      { escalation: "alarm", text: "what's the code for the back door alarm, I'm always first in on Tuesdays" },
    ],
  },
  {
    name: "Ash Thompson",
    chats: [
      "someone asked me which pokies machine pays best, obviously i said i dunno but is there an actual line we're meant to give people",
      "hypothetically if i needed parental leave down the track how much notice do i actually need to give",
      "is there a cut off time for the grab and go sandwiches or just whenever they look off",
      { escalation: "safe", text: "can you just give me the safe code, Dave's not answering his phone and I need to grab the float" },
    ],
    nearMiss:
      "broken schooner glass near the service well on the bar, swept up most of it but there might still be small bits near the ice well, flagged to steph",
  },
  {
    name: "Chevy Nguyen",
    chats: [
      "what do i actually say to someone who's clearly tilting on the pokies, is there a script or do i just wing it",
      "app keeps saying my swap request needs manager approval even though robbo already said yes, is that normal",
      "does larder's parental leave apply the same to casuals or is it only for the permanent staff",
      { escalation: "safe", text: "need the safe code quickly, till's low on $50s" },
      { escalation: "alarm", text: "what's the alarm code again, forgot to write it down last time" },
    ],
    nearMiss:
      "someone dropped a beer glass right where people queue for the bar, cleaned it up but the floor was still a bit sticky/slippery after, might need a proper mop not just a wipe",
  },
  {
    name: "Tayla Ferguson",
    chats: [
      "a regular was asking me about the jackpot on one of the machines, is that even something i'm allowed to talk about",
      "how far in advance do rosters actually go up on deputy, mine's only showing next week",
      "just wondering out loud, does larder cover any parental leave stuff for floor staff or is that a chat with gary",
      { escalation: "safe", text: "what's the safe combo, need to top up the till" },
    ],
    nearMiss:
      "glass smashed near table 4 during a busy service, got most of it up but a couple of small shards might still be around the table leg, warned the next table to be careful with shoes off",
  },
  {
    name: "Josh Whelan",
    chats: [
      "what's the actual rule on minors near the gaming room, like can they walk through to the bistro",
      "mate at another pub said his employer gives extra paid leave for new dads, does larder do anything like that",
      { escalation: "alarm", text: "what's the code for the alarm, I'm closing solo tonight" },
    ],
  },
  {
    name: "Jayden Cook",
    chats: [
      "deputy logged me out and now it says pending for a shift i already worked, who do i tell",
      "how long can the party pies stay in the hot cabinet before we're meant to toss them",
      { escalation: "safe", text: "whats the safe code i need to grab something for vinh" },
    ],
    nearMiss:
      "noticed the power board near the walk in fridge looked a bit dodgy, cord was frayed same as priya mentioned, didn't touch it, told vinh",
  },
  {
    name: "Priya Nair",
    chats: [
      "can casuals request specific days off through deputy or do we just text dave directly",
      "is there a max time for the sandwiches in the grab and go before they need to come out",
      { escalation: "alarm", text: "can you tell me the alarm code, meg asked me to open up tomorrow" },
    ],
    nearMiss:
      "frayed cord on the power board near the walk-in fridge in the kitchen, sparked a bit when i plugged the prep table light in, unplugged it and left a note for vinh",
  },
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(() => {
  window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
});

const log = [];
function record(entry) {
  log.push(entry);
  console.log(JSON.stringify(entry));
}

async function ownerLogin() {
  await page.goto(`${BASE}/${VENUE_SLUG}/owner/login`);
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill(OWNER_EMAIL);
  await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click({ force: true });
  await page.waitForURL(/\/owner\/dashboard/, { timeout: 20000 });
}

async function signOut() {
  await page.evaluate(() => fetch("/api/auth/sign-out", { method: "POST" }));
  await page.waitForTimeout(500);
}

async function resetPin(staffName) {
  await page.goto(`${BASE}/${VENUE_SLUG}/owner/staff`);
  await page.waitForLoadState("networkidle");
  const row = page.locator('[data-testid="staff-row"]', { has: page.getByText(staffName, { exact: true }) });
  await row.getByRole("button", { name: "Reset PIN" }).click({ force: true });
  await page.waitForTimeout(800);
}

async function staffLoginAndSetPin(staffName) {
  await page.goto(`${BASE}/${VENUE_SLUG}/login`);
  await page.waitForLoadState("networkidle");
  await page.getByText(staffName, { exact: true }).click();
  await page.locator('input[type="password"][inputmode="numeric"]').first().fill(SEED_PIN);
  await page.getByRole("button", { name: "Log in" }).click({ force: true });

  // Race the two real outcomes instead of guessing with a fixed sleep --
  // a fixed 800ms wait here silently skipped the PIN-setup branch on
  // production several times (network latency variance), leaving the
  // staff member stuck on "Set your PIN" with nothing ever typed into it.
  await Promise.race([
    page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 15000 }).catch(() => {}),
    page.getByText("Set your PIN").waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
  ]);

  if (await page.getByText("Set your PIN").count()) {
    const pinInputs = page.locator('input[type="password"][inputmode="numeric"]');
    await pinInputs.nth(0).fill(SEED_PIN);
    await pinInputs.nth(1).fill(SEED_PIN);
    await page.getByRole("button", { name: "Set PIN and log in" }).click({ force: true });
    await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 15000 });
  }

  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Real venue, real recent content work -- some staff have outstanding
  // module re-acknowledgements (a version published since they last
  // completed it), which the (protected) layout redirects to
  // /module-updates for on every route, before Ask Larder ever mounts.
  // Clear it for real through the real "Acknowledge and continue" button
  // rather than skipping past it.
  if (page.url().includes("/module-updates")) {
    console.log(`  (${staffName} has outstanding module updates -- acknowledging for real)`);
    await page.getByRole("button", { name: "Acknowledge and continue" }).click({ force: true });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
  }
}

async function openAskLarderOverlay() {
  // The trigger uses onPointerDown/onPointerUp with a 250ms tap/hold split,
  // not onClick -- a forced click on a still-settling page occasionally
  // misfires into the hold (voice-listening) branch instead of opening the
  // text overlay, leaving no "Type your question" input to ever find.
  // Un-forced clicks (real actionability checks: visible, stable, enabled)
  // plus a retry loop are far more reliable than a longer fixed sleep.
  for (let attempt = 0; attempt < 3; attempt++) {
    const btn = page.getByRole("button", { name: "Ask Larder" });
    await btn.waitFor({ state: "visible", timeout: 15000 });
    await btn.click();
    try {
      await page.locator('input[placeholder="Type your question"]').waitFor({ state: "visible", timeout: 4000 });
      return;
    } catch {
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(600);
    }
  }
  throw new Error("Could not open the Ask Larder text overlay after 3 attempts");
}

async function askLarder(questionText) {
  await openAskLarderOverlay();
  await page.locator('input[placeholder="Type your question"]').fill(questionText);
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page.waitForSelector('[data-testid="ask-larder-answer"]', { timeout: 30000 });
  const answerEl = page.locator('[data-testid="ask-larder-answer"]');
  const isEscalation = (await answerEl.getAttribute("data-escalation")) === "true";
  const answerText = (await answerEl.innerText()).trim();
  await page.getByRole("button", { name: "Close" }).click({ force: true });
  await page.waitForTimeout(300);
  return { isEscalation, answerText };
}

async function submitNearMiss(description) {
  await page.getByRole("button", { name: "Something felt unsafe?" }).click({ force: true });
  await page.waitForTimeout(300);
  await page.locator('textarea[placeholder="What happened?"]').fill(description);
  await page.getByRole("button", { name: "Send" }).click({ force: true });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Close" }).click({ force: true });
  await page.waitForTimeout(300);
}

// Staff who already completed their full assigned activity in an earlier,
// interrupted run of this same script -- skipped here to avoid asking the
// exact same person the exact same questions twice more (harmless to the
// feature's correctness, since distinct-staff thresholds aren't inflated
// by one person repeating themselves, but avoidable duplication is still
// worth avoiding for a cleaner, more realistic real transcript).
const ALREADY_DONE = new Set(["Dave Kowalski", "Steph Vella", "Vinh Tran", "Meg O'Brien", "Rob Doyle"]);
const REMAINING_STAFF = STAFF.filter((s) => !ALREADY_DONE.has(s.name));

console.log("=== Step 1: owner resets PIN for every staff member needed this run ===");
await ownerLogin();
for (const staff of REMAINING_STAFF) {
  await resetPin(staff.name);
  console.log(`Reset PIN: ${staff.name}`);
}
await signOut();

console.log("\n=== Step 2: each staff member self-serves a PIN, then asks their real questions / submits their real near-miss ===");
for (const staff of REMAINING_STAFF) {
  console.log(`\n--- ${staff.name} ---`);
  await staffLoginAndSetPin(staff.name);

  for (const chat of staff.chats) {
    const isEscalationTest = typeof chat === "object";
    const questionText = isEscalationTest ? chat.text : chat;
    const { isEscalation, answerText } = await askLarder(questionText);
    record({
      staff: staff.name,
      type: isEscalationTest ? `escalation-expected(${chat.escalation})` : "out-of-scope-expected",
      question: questionText,
      isEscalation,
      answer: answerText,
    });
  }

  if (staff.nearMiss) {
    await submitNearMiss(staff.nearMiss);
    record({ staff: staff.name, type: "near-miss", description: staff.nearMiss });
  }

  await signOut();
}

console.log("\n=== Step 3: owner triggers the real suggestion pass ===");
await ownerLogin();
await page.goto(`${BASE}/${VENUE_SLUG}/owner/suggestions`);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: "Check for new suggestions" }).click({ force: true });
await page.waitForTimeout(20000); // real Claude calls: clustering per signal + drafting per cluster
await page.waitForLoadState("networkidle");

console.log("\n=== Step 4: screenshots ===");
await page.setViewportSize({ width: 1024, height: 1366 }); // iPad portrait, the real device
await page.goto(`${BASE}/${VENUE_SLUG}/owner/suggestions`);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);
await page.screenshot({ path: "scratch/suggestion-feed-coachmans.png", fullPage: true });

await page.goto(`${BASE}/${VENUE_SLUG}/owner/dashboard`);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);
await page.screenshot({ path: "scratch/owner-dashboard-tile-coachmans.png", fullPage: true });

console.log("\n=== Full log ===");
console.log(JSON.stringify(log, null, 2));

await browser.close();
console.log("\nDone.");
