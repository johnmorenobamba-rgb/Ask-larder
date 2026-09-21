// Pre-publish check added 14 Sep 2026 after a real incident: a live
// venue's "Safe access and alarm/premises access (restricted)" module
// stated the real safe combination and alarm code in plain text, had zero
// module_roles rows (the app's "no rows = every role can see it"
// convention), and passed the owner-approval gate anyway -- nothing in
// that gate checked for this class of problem. See
// reference_module_roles_zero_rows_unrestricted memory for the full
// incident.
//
// Deliberately narrow, same design philosophy as Block V's credential-
// phrase heuristic (src/lib/security/detectSensitiveContent.ts): a
// trigger word immediately followed by "is/:/=" and an actual value, not
// just the word appearing on its own ("ask for the alarm code" or "reset
// your PIN" must NOT match -- there's no value attached). This flags a
// PATTERN worth a human decision, not a confirmed leak -- it never blocks
// storage, only blocks an UNRESTRICTED module from going live while the
// pattern is present.
// "keypad code"/"lock code" added 21 Sep 2026 during the suggestion
// assistant's Part 4 testing: a direct unit test of this regex against
// "the walk-in fridge keypad code is 8812" (real hospitality phrasing,
// the exact way staff naturally describe a cold-storage door keypad)
// came back false -- neither phrase was in the original trigger list.
// The suggestion pipeline reads raw staff free text (near-miss reports,
// escalations) into a model prompt, so this gate is now on that path too,
// not just the original safe/alarm incident it was built for.
const CREDENTIAL_VALUE_RE =
  /\b(combination|alarm code|access code|safe code|door code|gate code|keypad code|lock code|security code|passcode|password|credentials?|login|pin)\b\s*(?:is|:|=)\s*["']?[\w-]{2,}/i;

export function moduleContentReferencesCredential(sections: { content: string | null }[]): boolean {
  return sections.some((s) => !!s.content && CREDENTIAL_VALUE_RE.test(s.content));
}
