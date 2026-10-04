import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { parseFilters, queryRecords, recordsToCsv } from "@/lib/compliance/engine/records";

// GET /api/owner/compliance/export?form=&from=&to=&result=
// Downloads the venue's compliance records as CSV. Manager tier and owners only. Runs through the
// caller's own client, so RLS decides what is included. Capped at 5000 rows. Formula-looking cells are
// prefixed so a spreadsheet keeps them as text.
export async function GET(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const url = new URL(request.url);
  const filters = parseFilters(Object.fromEntries(url.searchParams.entries()));
  const supabase = await createClient();
  const { records, degraded, truncated, venueName } = await queryRecords(supabase, staff.venue_id, filters, 5000);
  if (degraded) return NextResponse.json({ error: "Couldn't load the records. Try again." }, { status: 500 });

  const slug = venueName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(recordsToCsv(records, truncated), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug || "venue"}_compliance_records_${stamp}.csv"`,
      "Cache-Control": "no-store",
      "X-Rows-Truncated": truncated ? "true" : "false",
    },
  });
}
