// CSV helpers for the venue data export. Pure, no server imports.
//  - cells that could run as a spreadsheet formula (start with = + - @ tab or return) are neutralised with a leading apostrophe,
//    except genuine numbers such as -18.5, which stay numbers;
//  - cells with a comma, quote or line break are quoted;
//  - files start with a UTF-8 byte order mark so Excel reads accents correctly, and lines end with CRLF.
export const CSV_BOM = "﻿";

const NUMBER_RE = /^-?\d+(\.\d+)?$/;

export function csvCell(value: unknown): string {
  let s: string;
  if (value === null || value === undefined) s = "";
  else if (typeof value === "string") s = value;
  else if (typeof value === "number" || typeof value === "boolean") s = String(value);
  else s = JSON.stringify(value);
  if (/^[=+\-@\t\r]/.test(s) && !NUMBER_RE.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return CSV_BOM + lines.join("\r\n") + "\r\n";
}

/** Minimal parser for the files this module writes (used by the tests to round trip a file). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\r" || c === "\n") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Flattens nested values to dotted keys: { items: { a: "pass" } } becomes { "items.a": "pass" }. */
export function flattenValues(value: unknown, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flattenValues(v, key));
      else out[key] = Array.isArray(v) ? v.join("; ") : v;
    }
  } else if (prefix) out[prefix] = value;
  return out;
}
