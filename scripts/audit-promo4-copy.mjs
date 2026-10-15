// Promo v4 copy audit: every string the film can put on screen (timeline COPY and data.ts) checked against the
// brand rules (no dashes as punctuation, no exclamation marks, no countdown, discount or scarcity language) and
// the contact details checked against the brief. Run: node scripts/audit-promo4-copy.mjs
import { readFileSync } from "node:fs";
import { COPY } from "../remotion/promo4/timeline.ts";
import * as D from "../remotion/promo4/data.ts";

const strings = [];
const walk = (v, path) => { if (typeof v === "string") strings.push({ path, text: v }); else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`)); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`); };
for (const c of COPY) walk(c.text, `COPY.${c.id}`);
for (const [k, v] of Object.entries(D)) walk(v, k);
// JSX text and quoted literals in the scene files (UI labels typed straight into the markup)
for (const f of ["ui.tsx", "acts/common.tsx", "acts/Hook.tsx", "acts/Ask.tsx", "acts/Pain2.tsx", "acts/Forms.tsx", "acts/Stations.tsx", "acts/Close.tsx"]) {
  const src = readFileSync(`remotion/promo4/${f}`, "utf8");
  for (const m of src.matchAll(/>([^<>{}\n]*[A-Za-z][^<>{}\n]*)</g)) if (!/[=&?()]/.test(m[1])) strings.push({ path: `${f} jsx`, text: m[1].trim() }); // text between tags, not comparisons
}
const URLish = /^(https?:\/\/|[a-z0-9.]+\.[a-z]{2,}(\.[a-z]{2})?$|[^\s]+@[^\s]+$)/i;
const COMPOUND = /\b(self-serve|e-signature|non-negotiable|multi-tenant|walk-in|check-in|sign-off)\b/gi;
const BANNED = [/!/, /\bcountdown\b/i, /\bdiscount\b/i, /\blimited\b/i, /\bhurry\b/i, /\bonly \d+ (spots|places|left)\b/i, /\boffer ends\b/i, /\btoday only\b/i, /% off/i, /\bfree trial\b/i];
const fails = [];
for (const s of strings) {
  if (URLish.test(s.text)) continue;
  const t = s.text.replace(COMPOUND, "");
  if (/[‐-―−]/.test(t)) fails.push(`${s.path}: dash character in "${s.text}"`);
  if (/(^|\s)-(\s|$)|\d-\d|\w-\w/.test(t)) fails.push(`${s.path}: hyphen used as punctuation in "${s.text}"`);
  for (const r of BANNED) if (r.test(t)) fails.push(`${s.path}: banned pattern ${r} in "${s.text}"`);
}
const want = { cta: "Book a walk through", url: "asklarder.com.au", email: "hello@asklarder.com.au" };
// the phone number was taken out of the promo (15 Oct 2026): it must not appear anywhere on screen
if ("phone" in D.CONTACT) fails.push("CONTACT still has a phone field");
for (const s of strings) if (/\b0\d{3} ?\d{3} ?\d{3}\b|0477/.test(s.text)) fails.push(`${s.path}: a phone number on screen in "${s.text}"`);
for (const [k, v] of Object.entries(want)) if (D.CONTACT[k] !== v) fails.push(`CONTACT.${k} is "${D.CONTACT[k]}", the brief says "${v}"`);
console.log(`${strings.length} strings checked`);
for (const f of fails) console.log("FAIL", f);
console.log(fails.length ? `${fails.length} failures` : "copy audit: all pass");
process.exit(fails.length ? 1 : 0);
