// A clock seam for tests and the staff UI guide ONLY. When the app runs under `next dev`
// (NODE_ENV is "development"), a page may be asked to behave as if it were a different moment with
// ?asof=2026-10-07T03:00:00Z. This is how a screenshot can show a form as Overdue, or a flag from a
// previous day, without ever editing or backdating a record: records keep their real server time and
// only the page's idea of "now" moves. In a production build (NODE_ENV "production", which includes
// Vercel preview and production) this function ignores the parameter, so nobody can use it there.
export function resolveNow(asof: string | string[] | undefined): Date {
  if (process.env.NODE_ENV === "development" && typeof asof === "string") {
    const d = new Date(asof);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
