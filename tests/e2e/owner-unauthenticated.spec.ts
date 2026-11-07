import { test, expect } from "@playwright/test";

// B4: an owner page requested without a session redirects to the owner login (same target as the layout) on every owner page, using
// a venue slug that does not exist so no real venue is touched. The server log must stay free of TypeErrors; that is checked by
// running this against a dev server and reading its output (see the hardening-3 report).
//
// Since the owner loading boundaries (loading.tsx, 7 Nov 2026) the response streams, so the layout's redirect() arrives as a
// 200 carrying a NEXT_REDIRECT to the login (the browser follows it client side) instead of a 307. Either form passes; what must
// hold is that the redirect target is the owner login. Production behaved the same way before this was updated (8 Nov 2026).
const PAGES = ["dashboard", "temperature", "forms", "staff", "certs", "weekly-report", "compliance", "compliance/records", "contacts", "suggestions", "settings", "sops", "stations", "photo-library", "onboarding/review", "onboarding/compliance-forms", "onboarding/equipment", "onboarding/venue-basics"];
test.describe.configure({ timeout: 300_000 });
for (const p of PAGES) {
  test(`/owner/${p} without a session redirects to the owner login`, async ({ request }) => {
    const res = await request.get(`/no-such-venue-b4/owner/${p}`, { maxRedirects: 0 });
    if (res.status() === 307) {
      expect(res.headers()["location"]).toContain("/no-such-venue-b4/owner/login");
    } else {
      expect(res.status()).toBe(200);
      expect(await res.text()).toContain("NEXT_REDIRECT;replace;/no-such-venue-b4/owner/login;307;");
    }
  });
}
