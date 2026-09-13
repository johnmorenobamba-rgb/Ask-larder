import { scanForSensitiveContent } from "../src/lib/security/detectSensitiveContent.ts";

const cases = [
  // Should BLOCK -- real card-shaped numbers (these are well-known public
  // test/sample PANs, not real accounts).
  ["Visa test number spaced", "The card number is 4111 1111 1111 1111 for testing.", true],
  ["Visa test number unbroken", "4111111111111111", true],
  ["Mastercard test number hyphenated", "5555-5555-5555-4444", true],
  // Should NOT block -- card-shaped-length numbers that fail Luhn, or are
  // outside the real false-positive risk this is meant to avoid.
  ["Random 16 digits failing Luhn", "1234567890123456", false],
  ["Phone number", "Call the manager on 0412 555 019 if there's an issue.", false],
  ["ABN", "Our ABN is 51 824 753 556 for supplier paperwork.", false],
  ["Long non-card sentence", "The safe was serviced on the 12th of November, ticket 2024011523456789.", false],
  // Credential phrase -- should BLOCK (low confidence, but still blocked).
  ["Password stated", "For the POS terminal the password is Sunshine92!", true],
  ["PIN is stated", "The alarm PIN is 4821, don't tell anyone.", true],
  ["Login stated", "Router admin login is admin123", true],
  ["Credentials stated", "Wifi credentials: guestwifi2024", true],
  // Should NOT block -- legitimate mentions with no actual value attached.
  ["Reset your PIN, no value", "Ask your manager to reset your PIN if you forget it.", false],
  ["Generic login mention", "Ask Dave for the login details if you need them.", false],
  ["Password mention, no value", "Never share your password with anyone.", false],
];

let pass = 0;
let fail = 0;
for (const [label, text, shouldBlock] of cases) {
  const findings = scanForSensitiveContent(text);
  const blocked = findings.length > 0;
  const ok = blocked === shouldBlock;
  console.log(`[${ok ? "PASS" : "FAIL"}] ${label} -- expected ${shouldBlock ? "BLOCK" : "allow"}, got ${blocked ? "BLOCK" : "allow"}${findings.length ? ` (${findings.map((f) => f.kind).join(", ")})` : ""}`);
  if (ok) pass++;
  else fail++;
}
console.log(`\n${pass} passed, ${fail} failed out of ${cases.length}`);
