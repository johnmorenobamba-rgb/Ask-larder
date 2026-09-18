import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

// Settings page (item 4, 18 Sep punch list): trading name, legal business
// name, ABN, and address -- kept to this subset deliberately, not the full
// venue_licence_profile row. Licence type/number/capacity/trading hours are
// compliance fields captured carefully during onboarding; letting an owner
// casually overwrite those from a settings form is a bigger, separate
// decision than "fix a typo in the address," so this route doesn't touch
// them.
export async function PATCH(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const tradingName = typeof body?.tradingName === "string" ? body.tradingName.trim() : "";
  const legalName = typeof body?.legalName === "string" ? body.legalName.trim() : "";
  const abn = typeof body?.abn === "string" ? body.abn.trim() : "";
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  const ownerName = typeof body?.ownerName === "string" ? body.ownerName.trim() : "";
  const ownerPhone = typeof body?.ownerPhone === "string" ? body.ownerPhone.trim() : "";

  if (!tradingName) {
    return NextResponse.json({ error: "Trading name is required." }, { status: 400 });
  }
  if (abn && !/^\d{11}$/.test(abn.replace(/\s/g, ""))) {
    return NextResponse.json({ error: "ABN must be 11 digits." }, { status: 400 });
  }
  if (!ownerName) {
    return NextResponse.json({ error: "Your name is required." }, { status: 400 });
  }

  const supabase = await createClient();

  const [{ error: venueError }, { error: licenceError }, { error: ownerError }] = await Promise.all([
    supabase.from("venues").update({ name: tradingName }).eq("id", staff.venue_id),
    supabase
      .from("venue_licence_profile")
      .update({ legal_name: legalName || null, abn: abn ? abn.replace(/\s/g, "") : null, address: address || null })
      .eq("venue_id", staff.venue_id),
    // Deliberately not touching app_users.email here -- it's the owner's
    // real Supabase Auth login identity, and this table's email isn't
    // itself the login credential (auth.users.email is). Changing it here
    // without also going through supabase.auth.updateUser({ email }) (a
    // separate, reconfirmation-gated flow) would silently desync what the
    // owner sees from what they actually log in with.
    supabase.from("app_users").update({ name: ownerName, phone: ownerPhone || null }).eq("id", staff.id),
  ]);

  if (venueError || licenceError || ownerError) {
    console.error("client-details update unexpected error:", venueError ?? licenceError ?? ownerError);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
