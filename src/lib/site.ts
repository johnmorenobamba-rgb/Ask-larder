// The one place that decides which address a printed or scanned code points at. Never the request host: a label printed from a
// preview or a local run must still open the real site.
export const SITE_URL_FALLBACK = "https://asklarder.com.au";

export function siteUrl(raw: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^\s/]+/i.test(value) ? value : SITE_URL_FALLBACK;
}

export function stationScanUrl(venueSlug: string, qrCodeSlug: string, raw?: string): string {
  return `${siteUrl(raw)}/${venueSlug}/station/${qrCodeSlug}`;
}
