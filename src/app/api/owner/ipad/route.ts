import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { DeviceError, pairDevice, revokeDevices } from "@/lib/auth/device";

// Owner side of venue iPad mode. POST pairs the iPad making this request (the owner is signed in on it), DELETE revokes
// every paired iPad for the venue (or one, with ?id=). Manager tier of the venue only; the venue comes from the session.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier || staff.role === "device") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.slice(0, 60) : undefined;
  try {
    await pairDevice({ venueId: staff.venue_id, pairedBy: staff.id, label });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DeviceError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("ipad pair unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier || staff.role === "device") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id") ?? undefined;
  try {
    await revokeDevices(staff.venue_id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DeviceError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
