import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { VoiceOutputToggle } from "@/components/staff/VoiceOutputToggle";
import { PressableLink } from "@/components/shared/PressableLink";

// Personal Dashboard spec's Settings screen: voice output toggle, PIN
// reset, notification preferences. PIN reset stays owner/manager-only
// (existing security model) rather than a self-service change flow —
// confirmed decision, points to the supervisor instead. Notification
// preferences aren't concretely specced and have no backing data model
// yet — left as an open item rather than invented scope.
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);
  if (!staff.staff_role_id) redirect(`/${venueSlug}/roles`);

  return (
    <main className="min-h-screen bg-parchment px-6 pb-10 pt-24">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">Settings</h1>

        <div className="flex items-center justify-between rounded-2xl border-2 border-clay-brown/20 px-4 py-4">
          <div>
            <p className="font-sans text-ink">Spoken answers</p>
            <p className="font-mono text-xs text-clay-brown">Ask Larder reads answers aloud</p>
          </div>
          <VoiceOutputToggle initialEnabled={staff.voice_output_enabled} />
        </div>

        <div className="rounded-2xl border-2 border-clay-brown/20 px-4 py-4">
          <p className="font-sans text-ink">PIN</p>
          <p className="font-mono text-xs text-clay-brown">Ask your supervisor to reset your PIN.</p>
        </div>

        <PressableLink
          href={`/${venueSlug}/intro?replay=1`}
          className="block rounded-2xl border-2 border-clay-brown/20 px-4 py-4 font-sans text-ink hover:border-preserve-red"
        >
          How Ask Larder works
        </PressableLink>
      </div>
    </main>
  );
}
