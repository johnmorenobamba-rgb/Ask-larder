import { test, expect } from "@playwright/test";

// Quick smoke check for Phase 2's core flow against the disposable
// "Smoke Test Venue" seeded directly in larder-dev (not venue #1's real
// data, which correctly stays hidden until the owner approves modules).
// The full C1-C10 walkthrough with its own seed/cleanup lifecycle is
// Phase 5's job — this is a fast confidence check while building.

test("welcome -> role select -> module -> completion", async ({ page }) => {
  await page.goto("/smoke-test-venue/login");
  await expect(page.getByText("Smoke Test Venue")).toBeVisible();

  await page.getByRole("button", { name: "Smoke Tester" }).click();
  await page.locator('input[type="password"]').fill("1234");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole("heading", { name: "Welcome to Smoke Test Venue." })).toBeVisible();

  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/roles$/);
  await page.getByRole("button", { name: "Tester" }).click();

  await expect(page).toHaveURL(/\/modules$/);
  await page.getByRole("link", { name: "Smoke Test Module" }).click();

  await expect(page).toHaveURL(/\/modules\/.+$/);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: "4" }).click();
  await expect(page.getByText("Smoke Test Module completed")).toBeVisible({ timeout: 3000 });
});
