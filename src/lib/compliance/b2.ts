// Pure B2 helpers (no server or database imports, so the staff form, the owner
// pages and the unit tests can all use them). The DATABASE is the authority for
// whether a reading is out of range (submit_compliance_form computes it); the
// helpers here only drive the live preview and the day and flag bookkeeping.

import type { RefrigerationUnitType } from "./types";

export const READING_MIN_C = -60;
export const READING_MAX_C = 150;

export type UnitLike = {
  id: string;
  name: string;
  unit_type: string;
  min_temp_c: number | null;
  max_temp_c: number | null;
  station_id?: string | null;
};

export type LimitKind = "max" | "min";

/** Cold and frozen units have a maximum, hot hold has a minimum. */
export function limitFor(unit: Pick<UnitLike, "unit_type" | "min_temp_c" | "max_temp_c">): { kind: LimitKind; limitC: number } | null {
  if (unit.unit_type === "hot_hold") {
    return unit.min_temp_c === null || unit.min_temp_c === undefined ? null : { kind: "min", limitC: Number(unit.min_temp_c) };
  }
  return unit.max_temp_c === null || unit.max_temp_c === undefined ? null : { kind: "max", limitC: Number(unit.max_temp_c) };
}

/**
 * Same rule as the database (submit_compliance_form): out of range when above the
 * unit's maximum OR below its minimum, whichever are set. Equal to a limit is in range.
 */
export function unitOutOfRange(unit: Pick<UnitLike, "min_temp_c" | "max_temp_c">, readingC: number): boolean {
  const max = unit.max_temp_c === null || unit.max_temp_c === undefined ? null : Number(unit.max_temp_c);
  const min = unit.min_temp_c === null || unit.min_temp_c === undefined ? null : Number(unit.min_temp_c);
  return (max !== null && readingC > max) || (min !== null && readingC < min);
}

/** Same rule for one known limit. */

export function isOutOfRange(kind: LimitKind, limitC: number, readingC: number): boolean {
  return kind === "max" ? readingC > limitC : readingC < limitC;
}

/** The message shown when a typed or sent reading is outside what the app accepts (true minus sign, never a hyphen). */
export function readingRangeMessage(): string {
  return `Enter a temperature from ${formatTemp(READING_MIN_C).replace("°C", "")} to ${READING_MAX_C} degrees.`;
}

export function formatTemp(c: number): string {
  const rounded = Math.round(c * 10) / 10;
  // true minus sign for negatives, so a freezer limit never reads as a hyphen
  return `${rounded < 0 ? "−" + Math.abs(rounded) : rounded}°C`;
}

export function describeLimit(unit: Pick<UnitLike, "unit_type" | "min_temp_c" | "max_temp_c">): string {
  const l = limitFor(unit);
  if (!l) return "No limit set";
  return `${l.kind === "max" ? "Max" : "Min"} ${formatTemp(l.limitC)}`;
}

/** The limit as a plain sentence for the person checking a reading against it. */
export function describeLimitSentence(unit: Pick<UnitLike, "unit_type" | "min_temp_c" | "max_temp_c">): string {
  const l = limitFor(unit);
  if (!l) return "No limit set";
  return l.kind === "max" ? `Keep at ${formatTemp(l.limitC)} or colder` : `Keep at ${formatTemp(l.limitC)} or hotter`;
}

/** True for a lone minus sign (or dash) with nothing after it yet: the person is mid way through typing. */
export function isPendingMinus(raw: string): boolean {
  return /^[-\u2212\u2013\u2014]\s*$/.test(raw.trim());
}

/** Parses what a person types: accepts a comma as the decimal mark. null when not a usable number. */
export function parseReadingInput(raw: string): number | null {
  // iPad keyboards can produce a true minus sign or a dash: treat them as a minus
  const cleaned = raw.trim().replace(",", ".").replace(/^[−–—]/, "-");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;
  if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < READING_MIN_C || n > READING_MAX_C) return null;
  return n;
}

// ---------------------------------------------------------------------------
// Time zones. The venue's IANA zone comes from venue_licence_profile.state;
// default Melbourne when unknown. Both the staff view and the owner view use
// this so "today" always agrees.
// ---------------------------------------------------------------------------
const STATE_TIME_ZONES: Record<string, string> = {
  VIC: "Australia/Melbourne",
  NSW: "Australia/Sydney",
  ACT: "Australia/Sydney",
  TAS: "Australia/Hobart",
  QLD: "Australia/Brisbane",
  SA: "Australia/Adelaide",
  WA: "Australia/Perth",
  NT: "Australia/Darwin",
};
export const DEFAULT_TIME_ZONE = "Australia/Melbourne";

export function venueTimeZone(state: string | null | undefined): string {
  if (!state) return DEFAULT_TIME_ZONE;
  return STATE_TIME_ZONES[state.trim().toUpperCase()] ?? DEFAULT_TIME_ZONE;
}

/** Local calendar date, YYYY-MM-DD, of an instant in the given zone. */
export function localDateKey(instant: Date | string, timeZone: string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function formatLocalTime(instant: Date | string, timeZone: string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat("en-AU", { timeZone, hour: "numeric", minute: "2-digit", hour12: true })
    .format(d)
    .replace(/\s/g, "")
    .toLowerCase();
}

export function formatLocalDateTime(instant: Date | string, timeZone: string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const day = new Intl.DateTimeFormat("en-AU", { timeZone, weekday: "short", day: "numeric", month: "short" }).format(d);
  return `${day}, ${formatLocalTime(d, timeZone)}`;
}

// ---------------------------------------------------------------------------
// Unit status: "done today" and open flags, from the latest EFFECTIVE reading
// per unit (the compliance_b2_latest_readings view). An open flag is the latest
// effective reading being out of range, however old: a flag from yesterday with
// no recheck stays open until a LATER in range reading exists.
// ---------------------------------------------------------------------------
export type LatestReading = {
  id: string;
  unit_id: string;
  out_of_range: boolean;
  corrective_action: string | null;
  submitted_at: string;
  submitted_by_name: string;
  payload: { reading_c?: number; unit_name?: string; unit_type?: string; limit_kind?: string; limit_c?: number } | Record<string, unknown>;
};

export type UnitStatus = {
  unit: UnitLike;
  latest: LatestReading | null;
  readingC: number | null;
  doneToday: boolean;
  openFlag: boolean;
};

export function readingOf(r: LatestReading): number | null {
  const v = (r.payload as { reading_c?: unknown }).reading_c;
  return typeof v === "number" ? v : typeof v === "string" && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
}

export function buildUnitStatuses(units: UnitLike[], latest: LatestReading[], now: Date, timeZone: string): UnitStatus[] {
  const byUnit = new Map(latest.map((r) => [r.unit_id, r]));
  const today = localDateKey(now, timeZone);
  return units.map((unit) => {
    const l = byUnit.get(unit.id) ?? null;
    return {
      unit,
      latest: l,
      readingC: l ? readingOf(l) : null,
      doneToday: !!l && localDateKey(l.submitted_at, timeZone) === today,
      openFlag: !!l && l.out_of_range,
    };
  });
}

export function summarise(statuses: UnitStatus[]): { total: number; doneToday: number; openFlags: number } {
  return {
    total: statuses.length,
    doneToday: statuses.filter((s) => s.doneToday).length,
    openFlags: statuses.filter((s) => s.openFlag).length,
  };
}

export const UNIT_TYPE_ORDER: RefrigerationUnitType[] = ["cold", "frozen", "hot_hold"];
export const UNIT_TYPE_HEADINGS: Record<RefrigerationUnitType, string> = {
  cold: "Cold storage",
  frozen: "Frozen storage",
  hot_hold: "Hot hold",
};
