import { DEFAULT_TIME_ZONE, venueTimeZone } from "@/lib/compliance/b2";

// Every date a person sees is written day, month, year (Australian order) in the venue's time zone, for example "6 Oct 2026" and
// "6 Oct 2026, 12:35 am". Never rely on the server's or the browser's default locale (a Vercel server renders month first).
const LOCALE = "en-AU";

function asDate(v: Date | string | number): Date {
  return v instanceof Date ? v : new Date(v);
}

export function formatDate(v: Date | string | number, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, day: "numeric", month: "short", year: "numeric" }).format(asDate(v));
}

export function formatDateTime(v: Date | string | number, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(asDate(v));
}

export function formatTimeOfDay(v: Date | string | number, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(asDate(v));
}

/** A calendar date with no time ("2026-10-14", as stored for certificates): written without any time zone shift. */
export function formatCalendarDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return formatDate(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)), "UTC");
}

/** The venue's time zone from its state (venue_licence_profile.state); Melbourne when unknown. */
export async function getVenueTimeZone(
  supabase: { from: (t: "venue_licence_profile") => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  venueId?: string, // omitted: the signed in person's own venue (row level security)
): Promise<string> {
  const q = supabase.from("venue_licence_profile").select("state");
  const { data } = await (venueId ? q.eq("venue_id", venueId) : q).maybeSingle();
  return venueTimeZone((data as { state?: string | null } | null)?.state);
}
