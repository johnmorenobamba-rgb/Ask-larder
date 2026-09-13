// Block V1 -- catches card numbers and credential-shaped text before it's
// ever stored, in guided-intake answers and in whatever parse-sop extracts
// from an uploaded document. This is a backstop, not the primary defense --
// V2's reframed access-control questions are meant to stop the sensitive
// answer from being invited in the first place. Deliberately never logs or
// echoes back the actual matched value; only a masked/generic description.

export interface SensitiveMatch {
  kind: "card_number" | "credential_phrase";
  confidence: "high" | "low";
  message: string;
}

// Luhn checksum, the standard reliable check for a real card-shaped number
// -- a bare "13-19 digits in a row" regex alone would false-positive
// constantly on phone numbers, ABNs, and licence numbers, which is exactly
// what this avoids.
function luhnValid(digits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48; // '0' = 48
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// Candidate PAN shapes: 13-19 digits, optionally grouped with spaces or
// hyphens (real cards are written "4111 1111 1111 1111" or
// "4111-1111-1111-1111" as often as one unbroken run).
const CARD_CANDIDATE_RE = /\b(?:\d[ -]?){13,19}\b/g;

function findCardNumbers(text: string): SensitiveMatch[] {
  const matches: SensitiveMatch[] = [];
  for (const raw of text.match(CARD_CANDIDATE_RE) ?? []) {
    const digits = raw.replace(/[ -]/g, "");
    if (digits.length < 13 || digits.length > 19) continue;
    if (luhnValid(digits)) {
      matches.push({
        kind: "card_number",
        confidence: "high",
        message: `Looks like a real card number (ending ${digits.slice(-4)}). Larder never stores payment card numbers -- remove it and describe the process instead (e.g. "the EFTPOS terminal handles this").`,
      });
    }
  }
  return matches;
}

// Credential heuristic -- genuinely harder to pattern-match reliably than a
// card number (no checksum to lean on), so this is deliberately narrow:
// one of a short list of trigger words/phrases immediately followed by
// what looks like an actual value, not just the word appearing on its own
// ("reset your PIN" or "ask for the manager's login" must NOT match --
// there's no value attached).
const LABELLED_CREDENTIAL_RE = /\b(password|passcode|credentials?|login)\b\s*(?:is|:|=)\s*["']?([^\s,.;"']{3,})/i;
const PIN_IS_RE = /\bpin is\b\s*["']?(\d{3,8})/i;

function findCredentialPhrases(text: string): SensitiveMatch[] {
  const matches: SensitiveMatch[] = [];
  if (LABELLED_CREDENTIAL_RE.test(text) || PIN_IS_RE.test(text)) {
    matches.push({
      kind: "credential_phrase",
      confidence: "low",
      message:
        "This looks like it might state an actual password, PIN, or login value. Credentials are harder to detect reliably than card numbers, so this is a lower-confidence flag -- if this genuinely isn't a real secret, rephrase it (e.g. \"ask your manager to reset it\" instead of stating the value) and save again.",
    });
  }
  return matches;
}

export function scanForSensitiveContent(text: string | null | undefined): SensitiveMatch[] {
  if (!text || !text.trim()) return [];
  return [...findCardNumbers(text), ...findCredentialPhrases(text)];
}
