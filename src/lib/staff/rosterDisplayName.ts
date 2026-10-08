// Reference implementation of the short names the anon callable venue_roster() returns (migration 20261007100000).
// The database function is the source of truth; this mirror pins the display rules in unit tests.
export type RosterPerson = { id: string; name: string };

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const capIfFlat = (s: string) => (s === s.toLowerCase() || s === s.toUpperCase() ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const stripLead = (s: string) => s.replace(/^[^\p{L}]+/u, "") || s;
const cap1 = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function rosterDisplayNames(people: RosterPerson[]): Map<string, string> {
  const rows = people.map((p) => {
    const n = clean(p.name);
    const parts = n.split(" ");
    const first = parts[0] ?? "";
    let last: string | null = parts.length > 1 ? parts[parts.length - 1] : null;
    if (last) {
      last = stripLead(last);
      if (last.length > 1 && last === last.toUpperCase()) last = last.toLowerCase();
    }
    return { id: p.id, n, first: capIfFlat(first), last };
  });
  const shown = rows.map((r) => {
    if (r.last === null) return { id: r.id, d: r.n || "Staff" };
    const last = r.last;
    let k = Math.max(1, last.length - 1);
    for (let i = 1; i <= Math.max(1, last.length - 1); i++) {
      const clash = rows.some(
        (o) => o.id !== r.id && o.last !== null && o.first.toLowerCase() === r.first.toLowerCase() &&
          o.last.slice(0, i).toLowerCase() === last.slice(0, i).toLowerCase() && o.last.toLowerCase() !== last.toLowerCase(),
      );
      if (!clash) { k = i; break; }
    }
    return { id: r.id, d: `${r.first} ${cap1(last.slice(0, k))}${k === 1 || k < last.length ? "." : ""}` };
  });
  const out = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const s of shown) counts.set(s.d.toLowerCase(), (counts.get(s.d.toLowerCase()) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (const s of [...shown].sort((a, b) => a.id.localeCompare(b.id))) {
    const key = s.d.toLowerCase();
    if ((counts.get(key) ?? 0) > 1) { const i = (seen.get(key) ?? 0) + 1; seen.set(key, i); out.set(s.id, `${s.d} ${i}`); }
    else out.set(s.id, s.d);
  }
  return out;
}
