import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Block N1/N2 verification — confirms the hero's GSAP ScrollTrigger `pin`
// actually holds the section fixed against real scroll input (not just a
// screenshot that happens to look pinned), tracks progress with real
// scroll, and releases cleanly, across mobile/tablet/desktop per the
// standing multi-viewport practice (Build Manual Part C.6). Also confirms
// the master timeline's no-overlap invariant for the 4-phrase text
// sequence — the actual regression test for a real bug found and fixed
// once already this session (two headlines with overlapping opacity
// ranges produced illegible double-exposed text). Throwaway-style script,
// same convention as scripts/visual-qa.ts — no DB seeding needed since
// this route is static.

const OUT_DIR = "scratch/visual-qa";
mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS: { label: string; width: number; height: number }[] = [
  { label: "mobile", width: 390, height: 844 },
  { label: "ipad", width: 820, height: 1180 },
  { label: "desktop", width: 1440, height: 900 },
];

const PHRASE_KEYS = ["training", "onboarding", "repeat", "ask-larder"] as const;
const OPACITY_VISIBLE_THRESHOLD = 0.05;

function heroProgress(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector("section");
    return el ? Number(el.dataset.heroProgress ?? "0") : null;
  });
}

function heroPosition(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector("section");
    if (!el) return null;
    return { top: el.getBoundingClientRect().top, position: getComputedStyle(el).position };
  });
}

function splashOpacities(page: Page) {
  return page.evaluate(() => {
    const trace = document.querySelector("[data-hero-splash-trace]");
    const idle = document.querySelector("[data-hero-splash-idle]");
    return {
      trace: trace ? Number(getComputedStyle(trace).opacity) : null,
      idle: idle ? Number(getComputedStyle(idle).opacity) : null,
    };
  });
}

const CARD_KEYS = ["greeting", "progress", "continue", "certificates", "ask-larder"] as const;

function cardStates(page: Page) {
  return page.evaluate((keys) => {
    return Object.fromEntries(
      keys.map((k) => {
        const el = document.querySelector(`[data-hero-card="${k}"]`);
        if (!el) return [k, null];
        const rect = el.getBoundingClientRect();
        const transform = getComputedStyle(el).transform;
        return [k, { opacity: Number(getComputedStyle(el).opacity), top: rect.top, transform }];
      }),
    );
  }, CARD_KEYS);
}

function phraseOpacities(page: Page) {
  return page.evaluate((keys) => {
    return Object.fromEntries(
      keys.map((k) => {
        const el = document.querySelector(`[data-hero-phrase="${k}"]`);
        return [k, el ? Number(getComputedStyle(el).opacity) : null];
      }),
    );
  }, PHRASE_KEYS);
}

/** Scrolls in small steps until heroProgress reaches >= target or a step budget runs out. */
async function scrollToProgress(page: Page, target: number, stepPx: number, maxSteps = 60) {
  for (let i = 0; i < maxSteps; i++) {
    const p = await heroProgress(page);
    if (p !== null && p >= target) return p;
    await page.mouse.wheel(0, stepPx);
    await page.waitForTimeout(120);
  }
  return heroProgress(page);
}

async function main() {
  const browser = await chromium.launch();
  let anyFail = false;

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3000/");
    await page.waitForLoadState("networkidle");

    // Stage 1/2 has nothing after the hero yet (N3-N4 land later), so the
    // page's real scroll range currently ends exactly at the pin's own end
    // — there'd be no room to scroll far enough to observe the release
    // transition otherwise. This filler is test-only; it never touches the
    // real page.
    await page.evaluate(() => {
      const filler = document.createElement("div");
      filler.style.height = "3000px";
      filler.setAttribute("data-verify-filler", "true");
      document.body.appendChild(filler);
    });

    // Clears the once-per-day cold-load splash (SplashScreen: up to
    // MAX_WAIT_MS 3500 + FADE_MS 300) so "start" reliably captures the
    // actual hero, not the splash mid-fade.
    await page.waitForTimeout(4200);
    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-hero-00-start.png` });
    const startPos = await heroPosition(page);

    // Scroll partway into the pin window and confirm it's genuinely held
    // fixed against real scroll input, not just scrolled with the page.
    await scrollToProgress(page, 0.15, Math.round(vp.height * 0.15));
    await page.waitForTimeout(1200); // clears scrub(1)'s ~1s smoothing lag
    const midPos = await heroPosition(page);
    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-hero-01-mid.png` });

    // Sample through every crossfade transition, checking at most one
    // phrase is meaningfully visible at any sampled point — the actual
    // no-overlap regression test, not just an eyeballed screenshot.
    let overlapFound = false;
    const samplePoints = Array.from({ length: 19 }, (_, i) => (i + 1) * 0.05); // 0.05 .. 0.95
    for (const target of samplePoints) {
      await scrollToProgress(page, target, Math.round(vp.height * 0.08));
      await page.waitForTimeout(1200);
      const opacities = await phraseOpacities(page);
      const visibleCount = Object.values(opacities).filter(
        (o) => o !== null && o > OPACITY_VISIBLE_THRESHOLD,
      ).length;
      if (visibleCount > 1) {
        overlapFound = true;
        console.log(`[${vp.label}] OVERLAP at progress~${target}:`, JSON.stringify(opacities));
      }
    }
    // Splash handoff checkpoint: comfortably past the crossfade (which
    // lands at normalized progress ~0.67-0.76 regardless of viewport,
    // since the master timeline's abstract duration is the same across
    // viewports -- only the real pixel distance mapped to it differs) --
    // the raw trace/fill/wordmark group should have faded out for good.
    // (The idle ChitMark it hands off to is itself only transient here --
    // it fades back out again once the bento cascade starts landing on
    // top of it, so idle opacity is NOT asserted at a fixed checkpoint.)
    await scrollToProgress(page, 0.78, Math.round(vp.height * 0.08));
    await page.waitForTimeout(1200);
    const splashOps = await splashOpacities(page);
    const splashHandoffDone = (splashOps.trace ?? 1) < 0.05;
    if (!splashHandoffDone) console.log(`[${vp.label}] SPLASH HANDOFF NOT DONE at 0.78:`, JSON.stringify(splashOps));

    // The final phrase's fade-in occupies only the tail of the timeline
    // (it completes exactly at progress 1.0) — push explicitly past the
    // last overlap-sample point (0.95) rather than reusing it, or this
    // checkpoint would catch the fade-in still mid-flight.
    await scrollToProgress(page, 0.995, Math.round(vp.height * 0.08));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-hero-02-final-phrase.png` });
    const finalOpacities = await phraseOpacities(page);
    const finalCards = await cardStates(page);
    const cardsLanded = CARD_KEYS.every((k) => (finalCards[k]?.opacity ?? 0) > 0.9);
    if (!cardsLanded) console.log(`[${vp.label}] CARDS NOT LANDED:`, JSON.stringify(finalCards));

    // Scroll well past the pin distance and confirm it released.
    await page.mouse.wheel(0, vp.height * 3);
    await page.waitForTimeout(1200);
    const endPos = await heroPosition(page);
    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-hero-03-end.png` });

    const pinHeld = midPos?.position === "fixed" && Math.abs(midPos.top) < 2;
    const pinReleased = endPos !== null && endPos.position !== "fixed";
    const finalPhraseVisible = (finalOpacities["ask-larder"] ?? 0) > 0.9;
    const pass = pinHeld && pinReleased && !overlapFound && finalPhraseVisible && splashHandoffDone && cardsLanded;
    if (!pass) anyFail = true;

    console.log(
      `[${vp.label}] start=${JSON.stringify(startPos)} mid=${JSON.stringify(midPos)} (pinned=${pinHeld}) ` +
        `end=${JSON.stringify(endPos)} (released=${pinReleased}) overlapFound=${overlapFound} ` +
        `splashHandoffDone=${splashHandoffDone} finalPhraseVisible=${finalPhraseVisible} (opacity=${finalOpacities["ask-larder"]}) ` +
        `cardsLanded=${cardsLanded} -> ${pass ? "PASS" : "FAIL"}`,
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
