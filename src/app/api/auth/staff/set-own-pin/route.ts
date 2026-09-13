import { NextResponse } from "next/server";
import { setOwnPinIfUnset, PinAuthError } from "@/lib/auth/staffPin";

// Block U -- staff-side, no owner/manager auth required (matches the
// existing model: picking your own name off the roster + setting your own
// PIN is already the whole first-time auth flow, no token-bearing link to
// check here). Only ever succeeds while pin_hash is genuinely unset.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    await setOwnPinIfUnset(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PinAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("set-own-pin unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
