// Parses what a person types into a number field of a generic compliance form (litres, minutes, dollars,
// temperatures). Unlike the temperature log parser it applies NO range: each field's own min and max are
// checked by the form and again by the database. Accepts a comma as the decimal mark and the minus signs an
// iPad keyboard can produce. Returns null when the text is not a usable number.
export function parseNumberInput(raw: string): number | null {
  const cleaned = raw.trim().replace(",", ".").replace(/^[\u2212\u2013\u2014]/, "-");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;
  if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
