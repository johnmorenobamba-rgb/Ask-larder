import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Block N4 verification — the three new marketing sections, the footer,
// and the nav/CTA wiring (Login -> Block M gateway, Learn more -> the
// explainer video, Contact us / Book a walkthrough -> the real contact
// form). Same conventions as scripts/verify-marketing-hero.ts (viewport
// set, labeled screenshot naming) -- this project's own established
// pattern, since the Claude Browser pane tool is known unreliable for
// this site's scroll-pinned hero (see reference_dev_environment_quirks
// memory), Playwright is the real verification tool here.

const OUT_DIR = "scratch/visual-qa";
mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS: { label: string; width: number; height: number }[] = [
  { label: "mobile", width: 390, height: 844 },
  { label: "ipad", width: 820, height: 1180 },
  { label: "desktop", width: 1440, height: 900 },
];

function heroProgress(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector("section");
    return el ? Number(el.dataset.heroProgress ?? "0") : null;
  });
}

/** Scrolls in small steps until heroProgress reaches >= target -- clears the
 * pinned hero's own scroll range before touching the static sections below
 * it, same helper as verify-marketing-hero.ts. */
async function scrollPastHero(page: Page, stepPx: number, maxSteps = 80) {
  for (let i = 0; i < maxSteps; i++) {
    const p = await heroProgress(page);
    if (p !== null && p >= 1) return;
    await page.mouse.wheel(0, stepPx);
    await page.waitForTimeout(120);
  }
}

async function main() {
  const browser = await chromium.launch();
  let anyFail = false;

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3000/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(4200); // clears the once-per-day splash, same as verify-marketing-hero.ts

    // Nav: Blog removed, Login and Contact us point at real destinations.
    const navText = await page.locator("header nav").innerText();
    const blogGone = !navText.includes("Blog");
    if (!blogGone) console.log(`[${vp.label}] FAIL: Blog link still present in nav`);

    const loginHref = await page.locator('header nav a:has-text("Login")').getAttribute("href");
    const contactHref = await page.locator('header nav a:has-text("Contact us")').getAttribute("href");
    const navWiringOk = loginHref === "/two-fires" && contactHref === "/contact";
    if (!navWiringOk) console.log(`[${vp.label}] FAIL: nav hrefs wrong -- login=${loginHref} contact=${contactHref}`);

    // "Learn more" smooth scrolls to the explainer video, not the features
    // strip. A native DOM click (not Playwright's mouse-simulated click) --
    // a decorative aria-hidden glow div behind the hero's buttons
    // (continuous idle float animation) both fails the actionability check
    // and, on the mobile viewport specifically, silently swallows a
    // mouse-simulated click without triggering the anchor's navigation.
    await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="#explainer-video"]')?.click());
    // The scroll-smooth jump crosses the pinned hero's own large scroll
    // range (several viewport heights), so the browser's native smooth
    // scroll duration is longer than a normal in-page jump -- poll instead
    // of a fixed wait. Threshold allows for the sticky header's own height.
    let videoTop: number | null = null;
    for (let i = 0; i < 30; i++) {
      videoTop = await page.evaluate(() => document.getElementById("explainer-video")?.getBoundingClientRect().top ?? null);
      if (videoTop !== null && videoTop < 100) break;
      await page.waitForTimeout(200);
    }
    const learnMoreOk = videoTop !== null && videoTop >= 0 && videoTop < 100;
    if (!learnMoreOk) console.log(`[${vp.label}] FAIL: Learn more didn't land on #explainer-video (top=${videoTop})`);

    // Scroll past the pinned hero to reach the new static sections.
    await scrollPastHero(page, Math.round(vp.height * 0.5));
    await page.waitForTimeout(600);

    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-n4-problem-solution.png` });
    const problemSolutionText = await page.locator("body").innerText();
    const hasProblemSolution = problemSolutionText.includes("Binders don't train anyone.");
    if (!hasProblemSolution) console.log(`[${vp.label}] FAIL: Problem/Solution section not found after scrolling past hero`);

    await page.mouse.wheel(0, vp.height);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-n4-compliance.png` });
    const hasCompliance = (await page.locator("body").innerText()).includes("Standard 3.2.2A");

    await page.mouse.wheel(0, vp.height);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-n4-how-it-works.png` });
    const hasHowItWorks = (await page.locator("body").innerText()).includes("A done for you service");

    await page.mouse.wheel(0, vp.height);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-n4-cta-footer.png` });
    const footerText = await page.locator("footer").innerText();
    const footerOk = footerText.includes("157 Fitzroy Street") && footerText.includes("Legal");

    // "Book a walkthrough" (final CTA) lands on /contact.
    await page.locator('a:has-text("Book a walkthrough")').last().click();
    await page.waitForLoadState("networkidle");
    const ctaToContactOk = page.url().endsWith("/contact");
    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-n4-contact-page.png` });

    // Header "Contact us" also lands on /contact (from a fresh load).
    await page.goto("http://localhost:3000/");
    await page.waitForTimeout(4200);
    await page.locator('header nav a:has-text("Contact us")').click();
    await page.waitForLoadState("networkidle");
    const contactUsOk = page.url().endsWith("/contact");

    // Block M: Login opens the real venue gateway with a working picker.
    await page.goto("http://localhost:3000/two-fires");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-n4-venue-gateway.png` });
    const gatewayHasName = (await page.locator("body").innerText()).includes("Two Fires");
    await page.locator('button:has-text("Login")').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-n4-venue-picker.png` });
    const staffHref = await page.locator('a:has-text("I\'m on shift")').getAttribute("href");
    const ownerHref = await page.locator('a:has-text("I\'m the owner")').getAttribute("href");
    const pickerOk = staffHref === "/two-fires/login" && ownerHref === "/two-fires/owner/login";
    if (!pickerOk) console.log(`[${vp.label}] FAIL: picker hrefs wrong -- staff=${staffHref} owner=${ownerHref}`);

    // Legal page loads and reads as finalized (lawyer-reviewed, 6 Sep
    // 2026) -- no draft/caution language anywhere on the page.
    await page.goto("http://localhost:3000/legal");
    await page.waitForLoadState("networkidle");
    const legalBodyText = await page.locator("body").innerText();
    const legalOk = /last updated/i.test(legalBodyText) && !/working draft|not a substitute for a lawyer/i.test(legalBodyText);
    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-n4-legal.png` });

    const pass =
      blogGone &&
      navWiringOk &&
      learnMoreOk &&
      hasProblemSolution &&
      hasCompliance &&
      hasHowItWorks &&
      footerOk &&
      ctaToContactOk &&
      contactUsOk &&
      gatewayHasName &&
      pickerOk &&
      legalOk;
    if (!pass) anyFail = true;

    console.log(
      `[${vp.label}] blogGone=${blogGone} navWiringOk=${navWiringOk} learnMoreOk=${learnMoreOk} ` +
        `sections(problem=${hasProblemSolution},compliance=${hasCompliance},how=${hasHowItWorks}) ` +
        `footerOk=${footerOk} ctaToContactOk=${ctaToContactOk} contactUsOk=${contactUsOk} ` +
        `gatewayHasName=${gatewayHasName} pickerOk=${pickerOk} legalOk=${legalOk} -> ${pass ? "PASS" : "FAIL"}`,
    );

    await ctx.close();
  }

  await browser.close();
  if (anyFail) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
