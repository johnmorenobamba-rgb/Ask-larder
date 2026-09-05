// Custom line-icon glyphs, same 24x24/1.5-stroke language as
// FeatureGuideStrip.tsx (Branding Kit rule: no stock icon library).
function BinderGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3.5h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 3.5v18M9 8h9M9 13h9M9 18h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function PersonGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function ClockGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7.5V12l3.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PROBLEMS = [
  {
    glyph: BinderGlyph,
    body: "Training lives in one manager's head, a binder nobody reads, or last week's group chat.",
  },
  {
    glyph: PersonGlyph,
    body: "Every new hire learns a slightly different version of the same shift.",
  },
  {
    glyph: ClockGlyph,
    body: "When someone experienced leaves, their knowledge leaves with them.",
  },
];

/**
 * Block N4 — Problem and Solution. Names what's actually broken today
 * (reinforcing the explainer video's own pain-first hook in scannable
 * text) then states the solution in one line, not a second features list
 * (FeatureGuideStrip already owns that job further up the page).
 */
export function ProblemSolutionSection() {
  return (
    <section className="bg-parchment px-6 py-24 sm:px-10 md:px-16">
      <div className="mx-auto max-w-4xl">
        <p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.2em] text-clay-brown">
          The real cost of training by memory
        </p>
        <h2 className="mb-12 text-center font-display text-3xl font-bold text-ink sm:text-4xl">
          Binders don&apos;t train anyone.
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {PROBLEMS.map(({ glyph: Glyph, body }) => (
            <div key={body} className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-preserve-red/10 text-preserve-red">
                <Glyph />
              </div>
              <p className="font-sans text-sm text-ink/80">{body}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-12 max-w-2xl text-center font-sans text-lg text-ink">
          Ask Larder turns what your best staff already know into training every new hire gets the same way, built
          from your own venue, not a generic course.
        </p>
      </div>
    </section>
  );
}
