import { SiteFooter } from "@/components/marketing/SiteFooter";

export const metadata = {
  title: "Privacy & AI Use Policy",
};

// Client Documents batch -- content pulled verbatim from the finalised
// Notion source of truth ("Client Documents — Finalised (CSA, Order Form,
// Pricing Schedule, Privacy Policy)", Larder HQ / Sources of Truth, last
// edited 11 Sep 2026), §4 "PRIVACY & AI USE POLICY (for
// asklarder.com.au/privacy)". Distinct from /legal, which is an earlier,
// shorter summary page -- this is the actual finalised policy Notion
// points the domain at.
export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col bg-parchment">
      <div className="mx-auto w-full max-w-2xl px-6 py-16 sm:px-10 md:px-16">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Privacy &amp; AI Use Policy</h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-wide text-clay-brown">Last updated 11 September 2026</p>

        <section className="mt-10 space-y-3">
          <h2 className="font-display text-xl font-bold text-ink">What we collect</h2>
          <p className="font-sans text-ink/80">
            Venue business details, staff names and role assignments, compliance certificate images and expiry
            dates, and records of module completion and staff questions asked through Ask Larder.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-bold text-ink">How AI is used</h2>
          <p className="font-sans text-ink/80">
            Larder uses artificial intelligence (Anthropic&apos;s Claude) to structure training content from material
            your venue provides, and to power the Ask Larder chatbot, which only answers from your venue&apos;s own
            approved content. It does not reason freely or guess. No content goes live until your venue&apos;s
            authorised representative approves it. Your data is never used to train any third-party or
            general-purpose AI model.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-bold text-ink">Who we share data with</h2>
          <p className="font-sans text-ink/80">
            Larder uses third-party providers to deliver the service: Anthropic (AI processing), Supabase (database
            and file storage), Vercel (hosting), and Resend (transactional email). Each processes data only as
            needed to provide the service to you, not for their own purposes.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-bold text-ink">Security</h2>
          <p className="font-sans text-ink/80">
            Your venue&apos;s data is isolated from every other venue on the platform at the database level. Access
            is role-scoped to your own staff and admin accounts.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-bold text-ink">On cancellation</h2>
          <p className="font-sans text-ink/80">
            Your content and staff completion records are exportable in a standard format. Chatbot and platform
            access ends at the close of your notice period.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-bold text-ink">Contact</h2>
          <p className="font-sans text-ink/80">
            Questions about this policy can go to{" "}
            <a href="mailto:hello@asklarder.com.au" className="text-preserve-red underline">
              hello@asklarder.com.au
            </a>
            .
          </p>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
