import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PassSlide } from "@/components/staff/PassSlide";
import { CONTACT_TYPES } from "@/lib/onboarding/constants";
import { logQueryError } from "@/lib/supabase/logQueryError";

const TYPE_LABEL = new Map<string, string>(CONTACT_TYPES.map((t) => [t.value, t.label]));

/**
 * Part 2/3, 20 Sep 2026 -- the staff-facing half of the contact directory,
 * opened from the dashboard's Contacts tile. Role-scoped the same way Ask
 * Larder's contact answers are (ask-larder/route.ts): frontline sees the
 * check-first step and who this is for, but not the raw number -- get a
 * manager to make the call, the same fallback pattern as everything else
 * requiring access this app deliberately doesn't hand to frontline
 * directly. Manager-tier staff (staff.isManagerTier, the same field that
 * gates the owner dashboard) see the real number too.
 */
export default async function StaffContactsPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);
  if (!staff.staff_role_id) redirect(`/${venueSlug}/roles`);

  const supabase = await createClient();
  const { data: contacts, error } = await supabase
    .from("venue_contacts")
    .select("id, contact_type, name, phone, notes, check_first_step")
    .eq("venue_id", staff.venue_id!)
    .order("name");
  logQueryError(`[${venueSlug}] staff contacts`, error);

  return (
    <main className="min-h-screen bg-parchment px-6 pb-10 pt-24">
      <PassSlide>
        <div className="mx-auto w-full max-w-lg space-y-6">
          <h1 className="font-display text-3xl font-bold text-ink">Contacts</h1>
          {!staff.isManagerTier && (
            <p className="font-sans text-sm text-clay-brown">
              Numbers are visible to managers and above. Ask your manager to make the call.
            </p>
          )}
          {(contacts ?? []).length === 0 ? (
            <p className="font-sans text-sm text-clay-brown">No contacts on file yet.</p>
          ) : (
            <div className="space-y-3">
              {(contacts ?? []).map((c) => (
                <div key={c.id} className="space-y-1 rounded-2xl border-2 border-clay-brown/20 px-4 py-4">
                  <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">
                    {TYPE_LABEL.get(c.contact_type ?? "") ?? "Uncategorised"}
                  </p>
                  <p className="font-display text-ink">{c.name}</p>
                  {c.notes && <p className="font-sans text-sm text-ink/70">{c.notes}</p>}
                  {c.check_first_step && (
                    <p className="font-sans text-sm text-ink/70">Check first: {c.check_first_step}</p>
                  )}
                  {staff.isManagerTier ? (
                    c.phone && <p className="font-sans text-ink">{c.phone}</p>
                  ) : (
                    <p className="font-mono text-xs uppercase tracking-wide text-preserve-red">Ask your manager to call</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PassSlide>
    </main>
  );
}
