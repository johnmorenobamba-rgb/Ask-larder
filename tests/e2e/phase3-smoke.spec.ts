import { test, expect } from "@playwright/test";

// Quick smoke check for Phase 3's certs -> signature -> completion -> Ask
// Larder explainer flow, against the same disposable "Smoke Test Venue"
// phase2-smoke.spec.ts uses. Runs after phase2-smoke, which already gives
// "Smoke Tester" a role and one completed module — this test picks up from
// there rather than re-driving the whole checklist.

test("certs -> signature -> completion -> Ask Larder intro", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/smoke-test-venue/login");
  await page.getByRole("button", { name: "Smoke Tester" }).click();
  await page.locator('input[type="password"]').fill("1234");
  await page.getByRole("button", { name: "Log in" }).click();

  // Login always lands on welcome first, regardless of prior progress.
  await expect(page).toHaveURL(/\/welcome$/);

  await page.goto("/smoke-test-venue/certs");
  await page.getByRole("link", { name: "Food Handling Certificate" }).click();
  await expect(page).toHaveURL(/\/certs\/.+$/);

  await page.setInputFiles('input[type="file"]', {
    name: "cert.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.locator('input[type="date"]').first().fill("2026-01-01");
  await page.locator('input[type="date"]').last().fill("2027-01-01");
  await page.getByRole("button", { name: "Save certificate" }).click();
  await expect(page.getByText("Food Handling Certificate uploaded")).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Back to certificates" }).click();

  await page.goto("/smoke-test-venue/signature");
  await expect(page).toHaveURL(/\/signature$/);
  await page.getByPlaceholder("Full name").fill("Smoke Tester");
  await page.getByRole("button", { name: "Confirm and sign" }).click();

  await expect(page).toHaveURL(/\/complete$/, { timeout: 5000 });
  await expect(page.getByRole("heading", { name: "You're set up." })).toBeVisible();

  // Unskippable explainer, auto-advances through 6 beats (~45s total).
  await expect(page).toHaveURL(/\/intro$/, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Got it" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Got it" }).click();

  await expect(page).toHaveURL(/\/modules$/);

  // Shown once per user, ever -- a direct hit after the flag flips just
  // returns to the app instead of replaying.
  await page.goto("/smoke-test-venue/intro");
  await expect(page).toHaveURL(/\/modules$/);
});
