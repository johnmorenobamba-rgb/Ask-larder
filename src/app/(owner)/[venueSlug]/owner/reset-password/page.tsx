import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/owner/ResetPasswordForm";
import { LoginBackdrop } from "@/components/shared/LoginBackdrop";
import { logQueryError } from "@/lib/supabase/logQueryError";

type VenueRoster = {
  venue: { id: string; name: string; branding: Record<string, unknown> } | null;
};

// Where a Supabase Auth password-reset email's link lands. Didn't exist
// anywhere in this app before -- confirmed while verifying a real reset for
// an existing owner account (2026-09-13); every owner needs this, not just
// this one venue.
export default async function OwnerResetPasswordPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("venue_roster", { p_slug: venueSlug });
  logQueryError(`[${venueSlug}] owner reset-password venue_roster`, error);
  const roster = data as VenueRoster | null;

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-parchment px-6">
        <p className="font-sans text-ink">Something went wrong loading this page. Try again in a moment.</p>
      </main>
    );
  }
  if (!roster?.venue) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-parchment px-6">
        <p className="font-sans text-ink">Couldn&apos;t find this venue. Check the link and try again.</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-parchment px-6">
      <LoginBackdrop />
      <div className="relative z-10 w-full max-w-sm space-y-6">
        <div>
          <p className="font-mono text-xs text-clay-brown">Owner dashboard</p>
          <h1 className="font-display text-3xl font-bold text-ink">{roster.venue.name}</h1>
          <p className="font-sans text-sm text-ink/70">Set a new password.</p>
        </div>
        <ResetPasswordForm redirectTo={`/${venueSlug}/owner/login`} />
      </div>
    </main>
  );
}
