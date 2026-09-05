const STEPS = [
  {
    number: "01",
    title: "Walkthrough",
    body: "We visit your venue, walk your stations, and collect your SOPs, photos, and the way your staff actually do the job.",
  },
  {
    number: "02",
    title: "Build",
    body: "We turn what we collected into training modules. AI assisted for speed, then edited by hand before you ever see them.",
  },
  {
    number: "03",
    title: "Approve",
    body: "You review every module and approve it before it goes live. Nothing reaches staff without your sign off, because the liability stays with your business.",
  },
  {
    number: "04",
    title: "Live",
    body: "Staff onboard on your venue's own iPad. Ask Larder answers questions from your approved content only, nothing else.",
  },
];

/**
 * Block N4 — How it works. The real done for you service model, set
 * against the explicit "not self serve" expectation the Build Manual
 * calls out by name. Numbered steps are a genuine sequence here (the
 * Branding Kit's own carve-out for the general no-numbered-markers rule),
 * not decoration.
 */
export function HowItWorksSection() {
  return (
    <section className="bg-parchment px-6 py-24 sm:px-10 md:px-16">
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.2em] text-clay-brown">How it works</p>
        <h2 className="mb-2 text-center font-display text-3xl font-bold text-ink sm:text-4xl">
          A done for you service, not a shelf of settings.
        </h2>
        <p className="mb-12 text-center font-sans text-ink/70">
          You don&apos;t build modules yourself. We do, starting with one visit to your venue.
        </p>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.number} className="flex flex-col gap-2">
              <p className="font-mono text-sm text-preserve-red">{step.number}</p>
              <p className="font-display text-lg font-bold text-ink">{step.title}</p>
              <p className="font-sans text-sm text-ink/70">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
