import { randomBytes, randomInt } from "node:crypto";

// Test credentials are made fresh at runtime, never committed. A fixture's owner password and staff PINs only have to
// live as long as the disposable venue they belong to. Set E2E_FIXTURE_PIN to pin a value for a debugging session.

/** A random 4 digit PIN with no repeated or sequential look, never 0000 (the tests use 0000 as a wrong guess). */
export function randomPin(): string {
  for (;;) {
    const pin = String(randomInt(1000, 10000));
    const d = [...pin].map(Number);
    const sequential = d.every((v, i) => i === 0 || v === d[i - 1] + 1) || d.every((v, i) => i === 0 || v === d[i - 1] - 1);
    if (new Set(d).size >= 3 && !sequential) return pin;
  }
}

export function fixturePin(): string {
  const fromEnv = process.env.E2E_FIXTURE_PIN;
  return fromEnv && /^[0-9]{4}$/.test(fromEnv) && fromEnv !== "0000" ? fromEnv : randomPin();
}

/** A random password that meets the usual rules (upper, lower, digit, symbol, 8+ characters). */
export function randomPassword(): string {
  return `Aa1!${randomBytes(12).toString("base64url")}`;
}
