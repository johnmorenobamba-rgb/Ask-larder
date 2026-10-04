import { describe, expect, it } from "vitest";
import { genericAlertContent, isGenericForm, GENERIC_ALERT_FORMS } from "../../src/lib/compliance/genericAlert";

// Owner alert wording for B3, B6 and B12 failures. Pure, no email is sent here.
describe("generic alert content", () => {
  const base = { corrective_action: "Rejected the delivery", submitted_by_name: "Kit Hand" };
  it("covers B3, B6 and B12 only", () => {
    expect([...GENERIC_ALERT_FORMS]).toEqual(["B3", "B6", "B12"]);
    for (const id of ["B2", "B5", "B10", "F3", "CAFE1", "", null, undefined]) expect(isGenericForm(id as string), String(id)).toBe(false);
    for (const id of ["B3", "B6", "B12"]) expect(isGenericForm(id), id).toBe(true);
  });
  it("B3 names the product and supplier", () => {
    const c = genericAlertContent({ ...base, form_id: "B3", payload: { values: { supplier: "Acme Meats", product: "Chicken", temp_c: 9 }, fail_reasons: ["Chilled delivery is warmer than 5°C"] } }, "5 Oct, 9:15am", "The Fixture Pub");
    expect(c.subject).toBe("Delivery check failed: Chicken from Acme Meats");
    expect(c.text).toContain("Why: Chilled delivery is warmer than 5°C.");
    expect(c.text).toContain("Recorded by Kit Hand, 5 Oct, 9:15am.");
    expect(c.text).toContain("Action taken: Rejected the delivery");
  });
  it("B6 names the batch and the stage", () => {
    const c = genericAlertContent({ ...base, form_id: "B6", payload: { stage: "two_hour", values: { temp_c: 30 }, fail_reasons: ["Warmer than 21°C"] } }, "now", "V");
    expect(c.what).toBe("A batch failed its 2 hour cooling check.");
    const c2 = genericAlertContent({ ...base, form_id: "B6", payload: { stage: "six_hour", values: { item: "Beef stew" } } }, "now", "V");
    expect(c2.subject).toBe("Cooling check failed: Beef stew");
    expect(c2.what).toContain("6 hour");
  });
  it("B12 names the location", () => {
    const c = genericAlertContent({ ...base, form_id: "B12", payload: { values: { kind: "sighting", location: "Dry store" } } }, "now", "V");
    expect(c.subject).toBe("Pest sighting: Dry store");
  });
  it("falls back to plain words when values are missing, and says none recorded for a missing action", () => {
    const c = genericAlertContent({ form_id: "B12", corrective_action: null, submitted_by_name: "A", payload: null }, "now", "V");
    expect(c.subject).toBe("Pest sighting: a location");
    expect(c.text).toContain("Action taken: none recorded");
  });
  it("escapes what staff typed in the html and uses no dashes in the copy", () => {
    const c = genericAlertContent({ ...base, corrective_action: "<b>x</b>", form_id: "B12", payload: { values: { location: "<script>alert(1)</script>" } } }, "now", "V");
    expect(c.bodyHtml).not.toContain("<script>");
    expect(c.bodyHtml).toContain("&lt;b&gt;x&lt;/b&gt;");
    const copy = [c.heading, c.what, c.text.replace(/[A-Za-z0-9<>/&;.:,'" ]/g, "")].join(" ");
    expect(/[–—]/.test(copy)).toBe(false);
    // the fixed sentences carry no hyphens or dashes
    expect(c.text.split("\n").filter((l) => l.startsWith("This is the first failure"))[0]).not.toMatch(/[-–—]/);
  });
});
