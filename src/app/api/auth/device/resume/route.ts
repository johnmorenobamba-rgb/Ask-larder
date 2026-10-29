import { NextResponse } from "next/server";
import { DeviceError, resumeDevice } from "@/lib/auth/device";

// Signs a paired venue iPad back in as the venue's device account. Called by the login page when the iPad carries a
// valid pairing cookie. Returns session tokens the client sets, exactly like the PIN login.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const venueSlug = typeof body?.venueSlug === "string" ? body.venueSlug : "";
  if (!venueSlug) return NextResponse.json({ error: "venueSlug is required." }, { status: 400 });
  try {
    const s = await resumeDevice(venueSlug);
    return NextResponse.json({ ok: true, access_token: s.accessToken, refresh_token: s.refreshToken, expiresAt: s.expiresAt });
  } catch (err) {
    if (err instanceof DeviceError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("device resume unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
