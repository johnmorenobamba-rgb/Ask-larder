import { NextResponse } from "next/server";
import { bootstrapOwner, BootstrapOwnerError } from "@/lib/auth/bootstrapOwner";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Same header pair/fallback used by complete-signature's own IP capture
  // -- trusted from the platform's edge proxy (Vercel), not the client body.
  const requestIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  try {
    const result = await bootstrapOwner({ ...body, requestIp });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof BootstrapOwnerError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("bootstrap-owner unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
