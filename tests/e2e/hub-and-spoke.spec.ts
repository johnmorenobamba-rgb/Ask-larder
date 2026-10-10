import { test, expect, type Page } from "@playwright/test";
import { FEATURES } from "../../src/data/features";

// Hub and spoke landing page. Read only: no form is submitted and nothing touches the database.
test.describe.configure({ timeout: 180_000 });

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "ipad", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

async function revealAll(page: Page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 600) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function noSidewaysScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

test("the hub has only the five blocks, six cards and one link per card", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("load");
  // hero, film, features, closing call to action (header and footer sit outside main)
  const mainChildren = await page.locator("main > *").evaluateAll((els) => els.map((e) => (e as HTMLElement).id || e.tagName.toLowerCase()));
  expect(mainChildren).toEqual(["div", "explainer-video", "features", "cta"]);
  await expect(page.locator("header")).toHaveCount(1);
  await expect(page.locator("footer")).toHaveCount(1);
  await expect(page.locator("#features h2")).toHaveText("Tap a feature to see how it works on your floor.");
  const cards = page.locator("#features ul > li");
  await expect(cards).toHaveCount(FEATURES.length);
  expect(FEATURES.length).toBeLessThanOrEqual(6);
  for (let i = 0; i < FEATURES.length; i++) {
    const card = cards.nth(i);
    await expect(card.locator("a")).toHaveCount(1);
    expect(await card.locator("h3 a").count()).toBe(1);
    const name = (await card.locator("a").textContent()) ?? "";
    expect(name).not.toMatch(/^\s*learn more\s*$/i);
    expect(name).toContain(FEATURES[i].card.linkText);
  }
  // the hero button that used to say Learn more is descriptive now
  await expect(page.getByRole("link", { name: "Watch the film" })).toBeVisible();
  // the film is a rendered file: muted, inline, not preloaded, with visible controls
  const video = page.locator("#explainer-video video");
  await expect(video).toHaveAttribute("preload", "none");
  await expect(video).toHaveAttribute("poster", /poster/);
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted && v.controls && v.playsInline)).toBe(true);
});

for (const vp of VIEWPORTS) {
  test(`hub at ${vp.name}: every card lands on its own page and nothing scrolls sideways`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const f of FEATURES) {
      await page.goto("/");
      await page.waitForLoadState("load");
      await page.locator("#features").scrollIntoViewIfNeeded();
      expect(await noSidewaysScroll(page), "hub sideways scroll").toBe(true);
      await page.locator(`#features a[href="/features/${f.slug}"]`).click();
      await page.waitForURL(`**/features/${f.slug}`);
      await expect(page.locator("h1")).toHaveText(f.h1);
    }
  });
}

for (const vp of VIEWPORTS) {
  for (const f of FEATURES) {
    test(`feature page ${f.slug} at ${vp.name}`, async ({ page, request }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`/features/${f.slug}`);
      await page.waitForLoadState("load");
      // one h1, with the outcome in it
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(f.h1);
      // breadcrumb: parent only on a phone, full trail from sm up
      const crumb = page.getByRole("navigation", { name: "Breadcrumb" });
      await expect(crumb).toBeVisible();
      await expect(crumb.getByRole("link", { name: /Features/ }).first()).toBeVisible();
      if (vp.width >= 640) await expect(crumb.locator('[aria-current="page"]')).toHaveText(f.name);
      // the persistent All features strip, with this page marked
      const strip = page.getByRole("navigation", { name: "All features" });
      await expect(strip.getByRole("link")).toHaveCount(FEATURES.length);
      await expect(strip.locator('[aria-current="page"]')).toHaveText(f.name);
      // the header call to action stays in view, and so does the hero one
      await expect(page.locator("header").getByRole("link", { name: "Book a walkthrough" })).toBeVisible();
      await expect(page.locator("main section").first().getByRole("link", { name: "Book a walkthrough" })).toHaveAttribute("href", "/contact");
      // template sections in order
      const heads = await page.locator("main h2").allTextContents();
      expect(heads.slice(0, 5)).toEqual(["The problem", "What it does", "How it works", "How it helps", "Related features"]);
      await expect(page.locator("#how-heading ~ ol > li")).toHaveCount(3);
      // related: two cards with descriptive link text
      const related = page.locator("#related-heading ~ ul > li");
      await expect(related).toHaveCount(2);
      for (let i = 0; i < 2; i++) {
        const target = FEATURES.find((x) => x.slug === f.related[i])!;
        await expect(related.nth(i).locator("a")).toHaveAttribute("href", `/features/${target.slug}`);
        expect(await related.nth(i).locator("a").textContent()).toContain(target.card.linkText);
      }
      // previous and next
      const pn = page.getByRole("navigation", { name: "Previous and next feature" });
      await expect(pn.getByRole("link")).toHaveCount(2);
      // images load and have real alt text, after scrolling to trigger lazy loading
      await revealAll(page);
      expect(await noSidewaysScroll(page), "sideways scroll").toBe(true);
      const imgs = await page.evaluate(() =>
        Array.from(document.images).map((i) => ({ src: i.src, ok: i.complete && i.naturalWidth > 0, alt: i.alt })),
      );
      expect(imgs.filter((i) => !i.ok), "broken images").toEqual([]);
      expect(imgs.filter((i) => i.alt.trim().length < 20), "images without real alt text").toEqual([]);
      // every internal link resolves
      const hrefs = await page.evaluate(() =>
        Array.from(new Set(Array.from(document.querySelectorAll("a[href]")).map((a) => a.getAttribute("href") ?? "")))
          .filter((h) => h.startsWith("/") && !h.startsWith("//"))
          .map((h) => h.split("#")[0] || "/"),
      );
      for (const h of new Set(hrefs)) expect((await request.get(h)).status(), `link ${h}`).toBe(200);
    });
  }
}

test("metadata, structured data, sitemap and the 404", async ({ page, request }) => {
  for (const f of FEATURES) {
    await page.goto(`/features/${f.slug}`);
    await expect(page).toHaveTitle(`${f.seo.title} | Larder`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", f.seo.description);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/features/${f.slug}$`));
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", f.seo.title);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toHaveLength(3);
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect((await request.get(og!)).status()).toBe(200);
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const f of FEATURES) expect(sitemap).toContain(`/features/${f.slug}`);
  expect((await request.get("/features/not-a-feature")).status()).toBe(404);
});

test("copy rules: no dashes, no banned claims, compliance wording and the Stamp stay in screenshots", async ({ page }) => {
  const banned = [/legally compliant/i, /compliant with the rules/i, /audit proof/i, /guarantee/i, /offline/i, /lawsuit/i, /\bsued?\b/i, /protects you/i];
  for (const path of ["/", ...FEATURES.map((f) => `/features/${f.slug}`)]) {
    await page.goto(path);
    const text = (await page.locator("body").textContent()) ?? "";
    expect(text, `${path} dashes`).not.toMatch(/[–—]/);
    expect(text, `${path} standalone hyphen`).not.toMatch(/\s-\s/);
    for (const b of banned) expect(text, `${path} ${b}`).not.toMatch(b);
  }
  await page.goto("/features/compliance-forms");
  await expect(page.locator("body")).toContainText("Standard 3.2.2A");
  await expect(page.locator("body")).toContainText("depends on your food business category");
  await expect(page.locator("body")).toContainText("It is not legal advice");
  await page.goto("/features/certificates-signoff");
  await expect(page.locator("body")).toContainText("differ by state");
});

test("an FAQ answer opens on a feature page and the contact route still loads", async ({ page, request }) => {
  await page.goto("/features/ask-larder");
  const first = page.locator("#faq-heading ~ div details").first();
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");
  await expect(first.locator("p")).toContainText("only from content you have approved");
  expect((await request.get("/contact")).status()).toBe(200);
});
