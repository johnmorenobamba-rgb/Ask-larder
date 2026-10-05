import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { adminClient, createFixture, destroyFixture, listObjects, loginOwner, loginStaff, nativeClick, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";

// Certificate file access (20261005030000), through the real app on a disposable venue: a staff member uploads a certificate
// photo, sees it again on their own page, the expiry is captured, the owner export still includes the file, and a manager tier
// person can still export. The database level denials (colleague, other venue, anon) are proven by tests/sql/certs-read-scope.sql.
// The test photo is a 1x1 PNG; the object is removed with the fixture venue (only paths under the fixture's own venue folder).
test.describe.configure({ timeout: 600_000, mode: "serial" });
let fx: Fixture;
let certTypeId = "";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test.beforeAll(async () => {
  fx = await createFixture("ca");
  const { data, error } = await adminClient()
    .from("certificate_types")
    .insert({ venue_id: fx.venueId, name: "RSA (test data)", cert_kind: "rsa", tracking_type: "hard_expiry", validity_years: 3 })
    .select("id")
    .single();
  if (error) throw error;
  certTypeId = data!.id;
});
test.afterAll(async () => {
  await destroyFixture(fx);
});

test("a staff member uploads a certificate, sees it again, and the expiry is captured", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  await page.goto(`/${fx.slug}/certs/${certTypeId}`);
  await expect(page.getByRole("heading", { name: "RSA (test data)" })).toBeVisible({ timeout: 90_000 });
  await page.locator('input[type="file"]').setInputFiles({ name: "cert.png", mimeType: "image/png", buffer: PNG });
  await page.locator('input[type="date"]').fill("2026-03-01");
  await expect(page.getByRole("button", { name: "Save certificate" })).toBeEnabled();
  await nativeClick(page, "Save certificate");
  await expect(page.getByRole("button", { name: "Back to certificates" })).toBeVisible({ timeout: 90_000 });

  const { data: row } = await adminClient().from("staff_certificates").select("photo_ref, issued_date, expiry_date").eq("user_id", fx.staff.waiter.id).eq("certificate_type_id", certTypeId).single();
  expect(row?.issued_date).toBe("2026-03-01");
  expect(row?.expiry_date).toBe("2029-03-01");
  expect(row?.photo_ref?.startsWith(`${fx.venueId}/${fx.staff.waiter.id}/`)).toBe(true);
  expect(await listObjects("certs", fx.venueId)).toHaveLength(1);

  // the uploader can still read their own file: the page signs it and says a photo is on file
  await page.goto(`/${fx.slug}/certs/${certTypeId}`);
  await expect(page.getByText("A photo is already on file.")).toBeVisible({ timeout: 90_000 });
});

test("the owner export still includes the certificate file; a manager tier person can export too; a frontline colleague cannot", async ({ page }) => {
  const check = async () => {
    const res = await page.request.get("/api/owner/export");
    expect(res.status()).toBe(200);
    const zip = await JSZip.loadAsync(await res.body());
    const csv = await zip.file("certificates.csv")!.async("string");
    expect(csv).toContain("RSA (test data)");
    const files = Object.keys(zip.files).filter((n) => n.startsWith("certificates/") && !n.endsWith("/"));
    expect(files).toHaveLength(1);
    expect((await zip.file(files[0])!.async("uint8array")).length).toBeGreaterThan(0);
  };
  await loginOwner(page, fx);
  await check();
  await loginStaff(page, fx, FIXTURE_NAMES.dutyManager);
  await check();
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  expect((await page.request.get("/api/owner/export")).status()).toBe(403);
});

test("a colleague's own certificate page does not show the uploader's file", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  await page.goto(`/${fx.slug}/certs/${certTypeId}`);
  await expect(page.getByRole("heading", { name: "RSA (test data)" })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("A photo is already on file.")).toHaveCount(0);
});
