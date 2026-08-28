import { test, expect } from "@playwright/test";

// Quick smoke check for Phase 4a: QR station entry (C8), version
// re-acknowledgement (C9), and near-miss quick-report (C10), against the
// same disposable "Smoke Test Venue" phase2/phase3-smoke.spec.ts use. Must
// run after phase3-smoke (Smoke Tester needs a completed module + signature
// already in place) AND after this one-time manual seed, run once via
// Supabase MCP/SQL before this spec exists meaningfully:
//
//   insert into stations (venue_id, name, qr_code_slug, primary_module_id)
//   values ('<smoke-test-venue-id>', 'Smoke Station', 'smoke-station-01', '<smoke-test-module-id>');
//
//   insert into module_versions (module_id, version, changelog)
//   values ('<smoke-test-module-id>', 2, 'Smoke test changelog');
//
// The second insert is what makes an outstanding acknowledgement exist at
// test start — this spec's first flow clears it, so re-running phase2/
// phase3-smoke after this spec runs once is safe again.

test("module update interstitial -> QR station entry -> near-miss report", async ({ page, context }) => {
  test.setTimeout(90_000);

  // --- C9: version re-acknowledgement interstitial ---
  await page.goto("/smoke-test-venue/login");
  await page.getByRole("button", { name: "Smoke Tester" }).click();
  await page.locator('input[type="password"]').fill("1234");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/module-updates$/, { timeout: 10_000 });
  await expect(page.getByText("Smoke Test Module")).toBeVisible();
  await page.getByRole("button", { name: "Got it — continue" }).click();
  await expect(page).toHaveURL(/\/modules$/, { timeout: 5000 });

  // A second visit shouldn't re-trigger it, now that it's acknowledged.
  await page.goto("/smoke-test-venue/modules");
  await expect(page).toHaveURL(/\/modules$/);

  // --- C8: QR station entry, no anonymous read path ---
  await context.clearCookies();
  await page.goto("/smoke-test-venue/station/smoke-station-01");
  await expect(page).toHaveURL(/\/login\?redirectTo=/, { timeout: 5000 });

  await page.getByRole("button", { name: "Smoke Tester" }).click();
  await page.locator('input[type="password"]').fill("1234");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/station\/smoke-station-01$/, { timeout: 10_000 });
  await expect(page.getByText("Smoke Station")).toBeVisible();
  // Block D replaced the disabled placeholder with the real chat entry point.
  await expect(page.getByRole("button", { name: "Ask Larder" })).toBeVisible();

  // --- C10: near-miss quick-report, station-scoped, non-anonymous ---
  await page.getByRole("button", { name: "Something felt unsafe?" }).click();
  await page.getByPlaceholder("What happened?").fill("Wet floor near the pass, no sign out.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Thanks — that's been sent.")).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Close" }).click();

  // --- C10: near-miss quick-report, anonymous toggle ---
  await page.getByRole("button", { name: "Something felt unsafe?" }).click();
  await page.getByPlaceholder("What happened?").fill("Knife left on the edge of the bench.");
  await page.getByLabel("Report anonymously").check();
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Thanks — that's been sent.")).toBeVisible({ timeout: 5000 });
});
