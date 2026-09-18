import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { ClientDetailsForm } from "@/components/owner/ClientDetailsForm";
import { ChangePasswordCard } from "@/components/owner/ChangePasswordCard";
import { logQueryError } from "@/lib/supabase/logQueryError";

const FAQS = [
  {
    q: "Who can staff ask if Ask Larder can't answer?",
    a: "Ask Larder only answers from your venue's own approved content. Anything it can't find, or anything requiring physical or system access (keys, safes, alarm codes, logins), it hands back to a supervisor rather than guessing.",
  },
  {
    q: "What happens to our content if we cancel?",
    a: "Larder is month to month with 30 days notice. On cancellation, your modules and completion records are yours to export, and chatbot access ends at the notice period.",
  },
  {
    q: "Can I edit a module myself?",
    a: "Content changes go through Request edit on the module's SOP page so there's a record of what changed and why. You get 5 free edit requests a month, then $15 AUD each.",
  },
  {
    q: "Do staff need the app installed?",
    a: "No. Larder is a bookmarked web app on whatever device staff already use on shift, an iPad on the pass is the common setup.",
  },
];

export default async function OwnerSettingsPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: venue, error: venueError }, { data: licence, error: licenceError }] = await Promise.all([
    supabase.from("venues").select("name").eq("id", staff!.venue_id!).maybeSingle(),
    supabase.from("venue_licence_profile").select("legal_name, abn, address").eq("venue_id", staff!.venue_id!).maybeSingle(),
  ]);
  logQueryError(`[${venueSlug}] settings venue`, venueError);
  logQueryError(`[${venueSlug}] settings licence`, licenceError);

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">Settings</h1>

        <ClientDetailsForm
          tradingName={venue?.name ?? ""}
          legalName={licence?.legal_name ?? ""}
          abn={licence?.abn ?? ""}
          address={licence?.address ?? ""}
          ownerName={staff!.name}
          ownerEmail={staff!.email ?? ""}
          ownerPhone={staff!.phone ?? ""}
        />

        <ChangePasswordCard email={staff!.email ?? ""} venueSlug={venueSlug} />

        <div className="space-y-2 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
          <p className="font-display text-ink">Payment cycle</p>
          <p className="font-sans text-sm text-ink/80">
            Larder is billed monthly by invoice, month to month with 30 days notice to cancel. Setup is a one off
            fee scaled to venue size; ongoing content edits get 5 free requests a month, then $15 AUD each.
          </p>
          <p className="font-sans text-sm text-clay-brown">
            For your specific invoice or payment dates, contact us below.
          </p>
        </div>

        <div className="space-y-2 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
          <p className="font-display text-ink">Contact us</p>
          <p className="font-sans text-sm text-ink/80">
            Questions, billing, or anything urgent: email{" "}
            <a href="mailto:hello@asklarder.com.au" className="text-preserve-red underline">
              hello@asklarder.com.au
            </a>
            .
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
          <p className="font-display text-ink">How to use Larder</p>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm text-ink/80">
            <li>Approve each module on the Modules page before it goes live to staff, that approval is yours to give, not automatic.</li>
            <li>Add staff and track who has finished training and who is still working through it from Staff and Completions.</li>
            <li>Certificates shows every staff certificate on file and flags what is expiring or overdue.</li>
            <li>Ask Larder is always on for staff, and answers only from your own approved content.</li>
            <li>Stations gives each physical station a QR code staff can scan for a quick training, FAQ, or troubleshooting refresher.</li>
          </ul>
        </div>

        <div className="space-y-3 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
          <p className="font-display text-ink">FAQs</p>
          <div className="space-y-4">
            {FAQS.map((item) => (
              <div key={item.q} className="space-y-1">
                <p className="font-sans font-medium text-ink">{item.q}</p>
                <p className="font-sans text-sm text-ink/70">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        <Link href="/privacy" className="block font-mono text-xs uppercase tracking-wide text-clay-brown underline">
          Privacy policy
        </Link>
      </div>
    </main>
  );
}
