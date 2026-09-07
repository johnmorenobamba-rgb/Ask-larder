import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";
import { findOrCreateCertificateType, replaceCertificateTypeRoles } from "@/lib/onboarding/certificateTypes";

// Q2 Pages 6a+6b — RSA-required roles and the RSA marshal gate, combined
// into one page/route per RsaMarshalForm's brief. Marshal identity goes
// into venue_key_roles (nullable app_user_id — this person very often
// doesn't have a login yet, Q1 D.1.4).
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const roleIds = Array.isArray(body?.roleIds) ? body.roleIds.filter((r: unknown) => typeof r === "string") : [];
  const marshalDesignated = body?.marshalDesignated === true;
  const marshalName = typeof body?.marshalName === "string" ? body.marshalName.trim() : "";
  const marshalPhone = typeof body?.marshalPhone === "string" ? body.marshalPhone.trim() : "";
  const marshalEmail = typeof body?.marshalEmail === "string" ? body.marshalEmail.trim() : "";

  if (roleIds.length === 0) {
    return NextResponse.json({ error: "Select at least one role that requires RSA." }, { status: 400 });
  }
  if (marshalDesignated && !marshalName) {
    return NextResponse.json({ error: "The RSA marshal's name is required." }, { status: 400 });
  }

  const supabase = await createClient();

  const certificateTypeId = await findOrCreateCertificateType(supabase, staff.venue_id, "RSA");
  await replaceCertificateTypeRoles(supabase, certificateTypeId, roleIds);

  const { data: existingMarshal } = await supabase
    .from("venue_key_roles")
    .select("id")
    .eq("venue_id", staff.venue_id)
    .eq("role_type", "rsa_marshal")
    .maybeSingle();

  if (marshalDesignated) {
    if (existingMarshal) {
      await supabase
        .from("venue_key_roles")
        .update({ name: marshalName, phone: marshalPhone || null, email: marshalEmail || null })
        .eq("id", existingMarshal.id);
    } else {
      await supabase.from("venue_key_roles").insert({
        venue_id: staff.venue_id,
        role_type: "rsa_marshal",
        name: marshalName,
        phone: marshalPhone || null,
        email: marshalEmail || null,
      });
    }
  } else if (existingMarshal) {
    await supabase.from("venue_key_roles").delete().eq("id", existingMarshal.id);
  }

  const flags = await upsertWizardSession(supabase, staff.venue_id, {
    currentStep: "rsa",
    flags: { rsa_marshal_designated: marshalDesignated },
  });

  return NextResponse.json({ ok: true, flags });
}
