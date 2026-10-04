import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const typedName = typeof body?.typedName === "string" ? body.typedName.trim() : "";
  // Same rule as the signature form (at least 2 characters); the database function refuses anything over 200.
  if (typedName.length < 2 || typedName.length > 200) {
    return NextResponse.json({ error: "typedName is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { data: appUser } = await supabase.from("app_users").select("id").eq("auth_id", user.id).maybeSingle();
  if (!appUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // The IP and device stamp is computed HERE, from the request headers, and nothing in the request body can set it. The
  // database function that writes the record is callable by the service role only, so a signed in user cannot call it
  // directly with a forged stamp (migrations 20261005040000 and 20261005040100). The x-forwarded-for value is set by
  // Vercel's edge proxy.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const device = request.headers.get("user-agent") ?? "unknown";

  const { data, error } = await createAdminClient().rpc("record_onboarding_signature", {
    p_user_id: appUser.id,
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
