import { OwnerVenueCreateForm } from "@/components/onboarding/OwnerVenueCreateForm";

// Q2 Page 1 — pre-auth. Not under (protected), since there's no owner
// session yet; OwnerVenueCreateForm calls the existing bootstrap-owner
// route, signs in client-side, then redirects into the protected wizard.
export default function OnboardingStartPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-parchment px-6 py-10">
      <div className="w-full max-w-md space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">New venue</p>
          <h1 className="font-display text-3xl font-bold text-ink">Set up Larder</h1>
          <p className="font-sans text-sm text-ink/70">A few details to create the venue and your owner account.</p>
        </div>
        <OwnerVenueCreateForm />
      </div>
    </main>
  );
}
