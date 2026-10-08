import { test, expect } from "@playwright/test";

// Landing page (launch-1): the story sections are there, nothing overflows sideways at four widths, every image has alt text,
// the FAQ opens, the contact route still works. Read only: no form is submitted.
test.describe.configure({ timeout: 180_000 });

for (const w of [375, 820, 1024, 1440]) {
  test(`landing page at ${w} wide has no sideways scroll and every image has alt text`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("load");
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 700) { await page.mouse.wheel(0, 700); await page.waitForTimeout(80); } // reveal and lazy load
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // an empty alt is allowed for decorative images only
    const missing = await page.evaluate(() => Array.from(document.images).filter((i) => !i.hasAttribute("alt") || ((i.getAttribute("alt") ?? "").trim().length > 0 && (i.getAttribute("alt") ?? "").trim().length < 8)).map((i) => i.src));
    expect(missing, "images without meaningful alt text").toEqual([]);
    const broken = await page.evaluate(() => Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
    expect(broken, "broken images").toEqual([]);
  });
}

test("the page tells the story in order and keeps the claims honest", async ({ page }) => {
  await page.goto("/");
  const ids = ["forms", "owner", "stations", "certificates", "faq"];
  for (const id of ids) await expect(page.locator(`#${id}`)).toBeAttached();
  const order = await page.evaluate((ids) => ids.map((id) => document.getElementById(id)!.getBoundingClientRect().top + window.scrollY), ids);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  const text = (await page.locator("main").textContent()) ?? ""; // textContent includes closed FAQ answers
  for (const banned of [/legally compliant/i, /compliant with the rules/i, /audit proof/i, /guarantee/i, /offline/i, /\bwelcome offer\b/i, /nudged/i, /lawsuit/i, /export all your records/i]) {
    expect(text, String(banned)).not.toMatch(banned);
  }
  expect(text).not.toMatch(/[–—]/); // no en or em dashes
  expect(text).toMatch(/not a rostering tool/i);
  expect(text).toMatch(/we export your records for you on request/i);
});

test("an FAQ answer opens, and the contact route still loads", async ({ page, request }) => {
  await page.goto("/");
  const first = page.locator("#faq details").first();
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");
  await expect(first.locator("p")).toBeVisible();
  const res = await request.get("/contact");
  expect(res.status()).toBe(200);
  await page.goto("/contact");
  await expect(page.locator("form")).toBeVisible();
});
