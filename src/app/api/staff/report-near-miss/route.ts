import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.description) {
    return NextResponse.json({ error: "description is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: appUser } = await supabase
    .from("app_users")
    .select("id, venue_id")
    .eq("auth_id", user.id)
    .single();
  if (!appUser?.venue_id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const isAnonymous = !!body.isAnonymous;

  const { error } = await supabase.from("near_miss_reports").insert({
    venue_id: appUser.venue_id,
    station_id: body.stationId ?? null,
    description: body.description,
    photo_ref: body.photoRef ?? null,
    is_anonymous: isAnonymous,
    // Deliberate omission when anonymous, not reliance on RLS to hide it —
    // the eventual owner-dashboard reader sees this raw row directly.
    reported_by: isAnonymous ? null : appUser.id,
  });

  if (error) {
    console.error("report-near-miss unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
