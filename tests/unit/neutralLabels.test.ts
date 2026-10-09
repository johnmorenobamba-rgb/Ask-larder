import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMPLIANCE_FORMS, STATUS_TAG_LABELS } from "../../src/lib/compliance/catalog";
import { FORM_TAG_LABELS } from "../../src/lib/compliance/engine/types";
import { FORM_OPTIONS, tagLabel, CSV_HEADER } from "../../src/lib/compliance/engine/records";

// Unverified legal status wording must not come back until a person has read FSANZ Standard 3.2.2A, 3.2.2A-12 and the FoodSmart record sheets.
const OLD = [/legally required/i, /best practice/i, /required to show compliance/i, /required if/i, /legal limit/i];
const NEUTRAL = "Recommended record";

function walkWith(dir: string, ext: RegExp, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walkWith(p, ext, out);
    else if (ext.test(p)) out.push(p);
  }
  return out;
}
const walk = (dir: string) => walkWith(dir, /\.tsx$/);
const walkTs = (dir: string) => walkWith(dir, /\.tsx?$/);

describe("neutral record labels", () => {
  it("every tag label the screens show is the one neutral label", () => {
    for (const v of [...Object.values(STATUS_TAG_LABELS), ...Object.values(FORM_TAG_LABELS)]) expect(v).toBe(NEUTRAL);
  });
  it("owner records tag labels (list, print layout and filters) are neutral for every form", () => {
    for (const f of FORM_OPTIONS) expect(tagLabel(f.id), f.id).toBe(NEUTRAL);
  });
  it("temperature form limit labels carry no legal status wording", () => {
    for (const l of Object.values(COMPLIANCE_FORMS.B2.limits)) for (const re of OLD) expect(l.label).not.toMatch(re);
  });
  it("CSV export columns carry no legal status wording", () => {
    for (const h of CSV_HEADER) for (const re of OLD) expect(h).not.toMatch(re);
  });
  it("no screen, component, landing page or compliance source line says legally required, legal limits, required to show compliance, the law requires, no law names or required by law", () => {
    const banned = [/legally required/i, /legal limits/i, /required to show compliance/i, /the law requires/i, /no law names/i, /required by law/i];
    const files = [...walk("src/app"), ...walk("src/components"), ...walkTs("src/lib/compliance")];
    const isComment = (l: string) => /^\s*(\/\/|\*|\/\*)/.test(l);
    for (const f of files) {
      const code = readFileSync(f, "utf8").split(/\r?\n/).filter((l) => !isComment(l)).join("\n");
      for (const re of banned) expect(code, f).not.toMatch(re);
    }
  });
  it("no screen or component file hardcodes the old status labels", () => {
    for (const f of [...walk("src/app"), ...walk("src/components")].filter((p) => !p.includes("marketing"))) {
      const text = readFileSync(f, "utf8");
      for (const re of OLD.filter((r) => !/legal limit/.test(r.source))) expect(text, f).not.toMatch(re);
    }
  });
});
