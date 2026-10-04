import type { Cadence } from "./types";

// Due logic for the staff hub. Pure and time zone aware (venue local time via IANA zones).
// Period arithmetic is done on CALENDAR fields (year, month, day), never by adding milliseconds,
// so a daylight saving change cannot shift a day, week or month boundary.
//
// A form is
//   done         when a record exists in the current period (shift and daily: the local day;
//                weekly: Monday to Sunday; monthly: the calendar month; yearly: the calendar year),
//   overdue      when the current period has no record AND either the form has a due hour that has
//                passed today (shift and daily forms, and the form was on before that hour), or the
//                PREVIOUS period had no record and the form was switched on before that period began,
//   not started  otherwise,
//   event        for forms logged when something happens (never due).
// Overdue is shown on screen only. Nothing here sends an email or a push.

type Ymd = { y: number; m: number; d: number };

function parts(instant: Date | string, timeZone: string): Ymd & { hour: number; weekday: number } {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const map: Record<string, string> = {};
  for (const p of f.formatToParts(d)) map[p.type] = p.value;
  const weekdayIndex = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(map.weekday);
  if (weekdayIndex < 0) throw new Error(`Unexpected weekday value: ${map.weekday}`);
  return { y: Number(map.year), m: Number(map.month), d: Number(map.day), hour: Number(map.hour) % 24, weekday: weekdayIndex };
}

const pad = (n: number) => String(n).padStart(2, "0");
const key = (t: Ymd) => `${t.y}-${pad(t.m)}-${pad(t.d)}`;

function addDays(t: Ymd, days: number): Ymd {
  const u = new Date(Date.UTC(t.y, t.m - 1, t.d + days));
  return { y: u.getUTCFullYear(), m: u.getUTCMonth() + 1, d: u.getUTCDate() };
}

/**
 * The venue TRADING date of a local moment: before the cutoff hour (default 5 in the app, 0 here means no
 * cutoff) the moment still belongs to the previous calendar day. Done on calendar fields, so a daylight
 * saving change cannot shift it. Used for shift and daily forms only.
 */
function tradingDate(p: Ymd & { hour: number }, cutoffHour: number): Ymd {
  return cutoffHour > 0 && p.hour < cutoffHour ? addDays(p, -1) : p;
}

/** First local day of the period the instant falls in (shift and daily: the trading day when a cutoff is given). */
export function periodStart(cadence: Cadence, instant: Date | string, timeZone: string, cutoffHour = 0): string {
  const p = parts(instant, timeZone);
  switch (cadence) {
    case "shift":
    case "daily":
      return key(tradingDate(p, cutoffHour));
    case "weekly":
      return key(addDays(p, -p.weekday)); // Monday is weekday 0
    case "monthly":
      return key({ y: p.y, m: p.m, d: 1 });
    case "annual":
      return key({ y: p.y, m: 1, d: 1 });
    case "event":
      return "event";
  }
}

/** First local day of the period before the one the instant falls in. */
export function previousPeriodStart(cadence: Cadence, instant: Date | string, timeZone: string, cutoffHour = 0): string {
  const p = parts(instant, timeZone);
  switch (cadence) {
    case "shift":
    case "daily":
      return key(addDays(tradingDate(p, cutoffHour), -1));
    case "weekly":
      return key(addDays(p, -p.weekday - 7));
    case "monthly":
      return p.m === 1 ? key({ y: p.y - 1, m: 12, d: 1 }) : key({ y: p.y, m: p.m - 1, d: 1 });
    case "annual":
      return key({ y: p.y - 1, m: 1, d: 1 });
    case "event":
      return "event";
  }
}

export function localHour(instant: Date | string, timeZone: string): number {
  return parts(instant, timeZone).hour;
}

/** The hour on the trading clock: 1am with a 5am cutoff is hour 25 of the previous trading day. */
export function tradingHour(instant: Date | string, timeZone: string, cutoffHour: number): number {
  const h = parts(instant, timeZone).hour;
  return cutoffHour > 0 && h < cutoffHour ? h + 24 : h;
}

export type FormStatusKind = "done" | "not_started" | "overdue" | "event";

export type FormStatus = {
  status: FormStatusKind;
  /** Plain reason shown on the hub next to Overdue. */
  reason: string | null;
  lastAt: string | null;
};

export type StatusInput = {
  cadence: Cadence;
  now: Date;
  timeZone: string;
  /** Effective record times (ISO) for this form. */
  recordTimes: string[];
  /** When the form was switched on (or the engine went live), as an instant. */
  activatedAt: Date | string;
  dueAfterHour?: number;
  /** Venue trading day cutoff hour (local) for closing forms; 0 or omitted means the calendar day. */
  cutoffHour?: number;
};

export function formStatus(input: StatusInput): FormStatus {
  const { cadence, now, timeZone, recordTimes, activatedAt, dueAfterHour } = input;
  const cut = input.cutoffHour ?? 0;
  const sorted = [...recordTimes].sort();
  const lastAt = sorted.length ? sorted[sorted.length - 1] : null;
  if (cadence === "event") return { status: "event", reason: null, lastAt };

  const current = periodStart(cadence, now, timeZone, cut);
  if (recordTimes.some((t) => periodStart(cadence, t, timeZone, cut) === current)) {
    return { status: "done", reason: null, lastAt };
  }

  const previous = previousPeriodStart(cadence, now, timeZone, cut);
  const activatedDay = periodStart("daily", activatedAt, timeZone, cut);
  const hadPrevious = recordTimes.some((t) => periodStart(cadence, t, timeZone, cut) === previous);
  // The previous period only counts as missed if the form was already on BEFORE the day it began
  // (switching a form on at 9pm must not show it as missed yesterday).
  if (!hadPrevious && previous > activatedDay) {
    const word = cadence === "shift" || cadence === "daily" ? "yesterday" : cadence === "weekly" ? "last week" : cadence === "monthly" ? "last month" : "last year";
    return { status: "overdue", reason: `Not done ${word}`, lastAt };
  }
  // A form switched on today after its due hour is not overdue today.
  const onBeforeDueHour = activatedDay < current || tradingHour(activatedAt, timeZone, cut) < (dueAfterHour ?? 0);
  if ((cadence === "shift" || cadence === "daily") && dueAfterHour !== undefined && onBeforeDueHour && tradingHour(now, timeZone, cut) >= dueAfterHour) {
    return { status: "overdue", reason: `Due by ${formatHour(dueAfterHour)}`, lastAt };
  }
  return { status: "not_started", reason: null, lastAt };
}

export function formatHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? "am" : "pm"}`;
}

/** Wording for the cadence period a record covers, used on the hub ("today", "this week"). */
export function periodWord(cadence: Cadence): string {
  switch (cadence) {
    case "shift":
    case "daily":
      return "today";
    case "weekly":
      return "this week";
    case "monthly":
      return "this month";
    case "annual":
      return "this year";
    case "event":
      return "";
  }
}

/**
 * The instant of local midnight at the start of a local date (yyyy-mm-dd) in an IANA zone, plus a number
 * of days. Searches in 30 minute steps so half hour zones (Adelaide, Darwin) are exact.
 */
export function localMidnightInstant(ymd: string, timeZone: string, addDays = 0): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1, d + addDays));
  const wantDate = target.toISOString().slice(0, 10);
  const base = target.getTime();
  const f = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  for (let offsetMin = -14 * 60; offsetMin <= 14 * 60; offsetMin += 30) {
    const t = new Date(base - offsetMin * 60_000);
    const map: Record<string, string> = {};
    for (const p of f.formatToParts(t)) map[p.type] = p.value;
    if (`${map.year}-${map.month}-${map.day}` === wantDate && Number(map.hour) % 24 === 0 && map.minute === "00") return t.toISOString();
  }
  return target.toISOString();
}
