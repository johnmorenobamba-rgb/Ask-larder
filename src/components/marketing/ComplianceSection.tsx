/**
 * Block N4 — the locked FSANZ 3.2.2A compliance hook (Marketing Strategy,
 * Decision Log 24 Aug 2026: "lead with FSANZ Standard 3.2.2A, not a
 * liability-protection pitch"). Leads with the product's own positioning
 * ("trained on your own way of doing things"), then the real, named,
 * verifiable standard -- never framed as protection from lawsuits, which
 * was explicitly rejected as legally weak (AU WHS law assesses whether
 * training was adequate, not merely acknowledged).
 */
export function ComplianceSection() {
  return (
    <section className="bg-ink px-6 py-24 sm:px-10 md:px-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-saffron">Compliance, built in</p>
        <h2 className="mb-6 font-display text-3xl font-bold text-parchment sm:text-4xl">
          Trained on your own way of doing things. Compliant with the rules that actually apply.
        </h2>
        <p className="mx-auto max-w-2xl font-sans text-lg text-parchment/80">
          Since December 2023, Standard 3.2.2A of the Food Standards Code has required a trained food safety
          supervisor and trained food handlers in every food business in Australia, enforced by your state and
          territory food authority. Ask Larder builds that training into the same modules your staff already use for
          everything else, so it happens as a normal part of onboarding, not a separate box to tick.
        </p>
      </div>
    </section>
  );
}
