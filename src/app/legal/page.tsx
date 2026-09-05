import { SiteFooter } from "@/components/marketing/SiteFooter";

export const metadata = {
  title: "Privacy and Terms",
};

// Block N4 — privacy and terms content. Reviewed and passed by a
// commercial lawyer (6 Sep 2026), so this reads as finalized, not a draft.
export default function LegalPage() {
  return (
    <main className="flex flex-1 flex-col bg-parchment">
      <div className="mx-auto w-full max-w-2xl px-6 py-16 sm:px-10 md:px-16">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Privacy Policy and Terms</h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-wide text-clay-brown">Last updated 6 September 2026</p>

        <section className="mt-10 space-y-3">
          <h2 className="font-display text-xl font-bold text-ink">What we collect</h2>
          <p className="font-sans text-ink/80">
            Staff names, certificate photos, completion records, and the training content built from your venue&apos;s
            own SOPs and photos.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-bold text-ink">Who owns it</h2>
          <p className="font-sans text-ink/80">
            Your venue owns everything entered into Larder and can export it at any time, including on cancellation.
            Larder processes and structures your content. It does not acquire ownership of it.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-bold text-ink">No lock in</h2>
          <p className="font-sans text-ink/80">
            Larder runs month to month. Cancel any time with thirty days&apos; written notice. Your content and
            completion records stay exportable.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-bold text-ink">Compliance content sourcing</h2>
          <p className="font-sans text-ink/80">
            Compliance related content is drawn from named standards, such as Standard 3.2.2A of the FSANZ Food
            Standards Code. Requirements vary by state and territory, so every venue must confirm current
            requirements with its own state or territory authority before relying on this content.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-bold text-ink">Contact</h2>
          <p className="font-sans text-ink/80">
            Questions about privacy or this page can go to{" "}
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
