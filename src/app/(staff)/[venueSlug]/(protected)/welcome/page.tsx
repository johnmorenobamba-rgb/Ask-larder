import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PassSlide } from "@/components/staff/PassSlide";

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);
  // Real completion, not just "has a role assigned" -- a role gets set by
  // the owner at hire time, before onboarding even starts, so it can't be
  // used as the "already been through onboarding" signal. Found live during
  // Block O roleplay QA (2026-09-04): using staff_role_id here skipped this
  // screen for every realistically-created account.
  if (staff.onboarding_completed_at) redirect(`/${venueSlug}/home`);

  const supabase = await createClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("name")
    .eq("id", staff.venue_id!)
    .single();

  const venueName = venue?.name ?? "the team";
  const firstName = staff.name.split(" ")[0];

  return (
    <main className="min-h-screen bg-parchment flex items-center justify-center px-6">
      <PassSlide>
        <div className="max-w-md space-y-6 text-center">
          <h1 className="font-display text-4xl font-bold text-ink">
            Welcome to {venueName}, {firstName}.
          </h1>
          <p className="font-sans text-ink">
            You&apos;re here because someone thought you&apos;d be good at this. Before your
            first shift, we&apos;ll walk you through how this kitchen and bar actually run:
            a handful of short modules built from our real procedures, not generic training.
          </p>
          <div className="space-y-1 rounded-2xl border-2 border-clay-brown/20 px-5 py-4 text-left">
            <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">What happens next</p>
            <p className="font-sans text-sm text-ink">
              1. Work through your modules, at your own pace, over as many sessions as you need.
            </p>
            <p className="font-sans text-sm text-ink">
              2. Upload any certificates required for your role.
            </p>
            <p className="font-sans text-sm text-ink">
              3. Sign to confirm you&apos;ve read everything.
            </p>
            <p className="font-sans text-sm text-ink">
              4. You&apos;ll land on your own dashboard, where Ask Larder is always available
              for anything you forget later, and every station has a QR code for a quick
              refresher on the spot.
            </p>
          </div>
          <Link
            href={`/${venueSlug}/roles`}
            className="inline-block rounded-full bg-preserve-red px-8 py-3 font-sans font-medium text-parchment"
          >
            Get started
          </Link>
        </div>
      </PassSlide>
    </main>
  );
}
