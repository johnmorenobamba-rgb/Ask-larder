import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const typedName = body?.typedName?.trim();
  if (!typedName) {
    return NextResponse.json({ error: "typedName is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // IP/device are captured here, server-side, rather than trusted from the
  // client body — a browser can't reliably report its own public IP anyway.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const device = request.headers.get("user-agent") ?? "unknown";

  const { data, error } = await supabase.rpc("complete_onboarding_signature", {
    p_typed_name: typedName,
    p_ip: ip,
    p_device: device,
  });

  if (error) {
    console.error("complete-signature unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: data });
}
