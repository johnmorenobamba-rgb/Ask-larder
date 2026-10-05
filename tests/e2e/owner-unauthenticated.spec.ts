import { test, expect } from "@playwright/test";

// B4: an owner page requested without a session redirects to the owner login (same target as the layout) on every owner page, using
// a venue slug that does not exist so no real venue is touched. The server log must stay free of TypeErrors; that is checked by
// running this against a dev server and reading its output (see the hardening-3 report).
const PAGES = ["dashboard", "temperature", "forms", "staff", "certs", "weekly-report", "compliance", "compliance/records", "contacts", "suggestions", "settings", "sops", "stations", "photo-library", "onboarding/review", "onboarding/equipment", "onboarding/venue-basics"];
test.describe.configure({ timeout: 300_000 });
for (const p of PAGES) {
  test(`/owner/${p} without a session redirects to the owner login`, async ({ request }) => {
    const res = await request.get(`/no-such-venue-b4/owner/${p}`, { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toContain("/no-such-venue-b4/owner/login");
  });
}
