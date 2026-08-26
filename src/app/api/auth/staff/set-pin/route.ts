import { NextResponse } from "next/server";
import { setStaffPin, PinAuthError } from "@/lib/auth/staffPin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    await setStaffPin(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PinAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
