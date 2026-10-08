import { Reveal } from "./Reveal";
import { ScreenFigure } from "./ScreenFigure";

/** The owner dashboard as one large screen. Every line below is something the dashboard shows today (claims ledger O1, O4, O5, O8, O16). */
export function OwnerOverviewSection() {
  const points = [
    "Who has finished which training",
    "Certificates and when they expire",
    "Failed readings and missed records",
    "Near miss reports and questions sent to a supervisor",
  ];
  return (
    <section id="owner" className="bg-parchment px-6 py-24 sm:px-10 md:px-16">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-clay-brown">For the owner</p>
          <h2 className="mb-4 font-display text-3xl font-bold text-ink sm:text-4xl">One screen, so you can see the whole venue.</h2>
          <p className="font-sans text-ink/70">
            Stop piecing it together from group chats and binders. Open the dashboard and see what needs your attention.
          </p>
        </Reveal>
        <Reveal className="mt-12">
          <ScreenFigure
            shot="owner-dashboard"
            alt="The Larder owner dashboard with tiles for what needs attention, staff completion, near miss reports, questions sent to a supervisor, the temperature log and a gallery of five station photos"
            caption="The owner dashboard. Example venue. Stock images."
            sizes="(min-width: 1152px) 1100px, 100vw"
            priority
          />
        </Reveal>
        <Reveal className="mt-10">
          <ul className="mx-auto grid max-w-3xl gap-3 font-sans text-base text-ink sm:grid-cols-2">
            {points.map((p) => (
              <li key={p} className="border-l-4 border-saffron py-1 pl-4">
                {p}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
