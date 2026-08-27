import { NextResponse } from "next/server";
import { loginWithStaffPin, PinAuthError } from "@/lib/auth/staffPin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await loginWithStaffPin(body);
    return NextResponse.json({
      ok: true,
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      expiresAt: result.expiresAt,
      user: { id: result.userId },
    });
  } catch (err) {
    if (err instanceof PinAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("login-pin unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
