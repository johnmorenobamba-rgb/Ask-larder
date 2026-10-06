import { Reveal } from "./Reveal";

const POINTS = [
  { title: "Locked to your venue", body: "Ask Larder only answers from your own approved content. Other venues are never searched." },
  { title: "You approve everything", body: "Nothing reaches your staff until you have reviewed and approved it." },
  { title: "Month to month", body: "No lock in. 30 days notice to cancel." },
  { title: "Your records are yours", body: "We export your records for you on request." },
];

export function TrustStrip() {
  return (
    <section aria-label="How Larder works with your venue" className="border-y border-ink/10 bg-parchment px-6 py-14 sm:px-10 md:px-16">
      <Reveal>
        <ul className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((p) => (
            <li key={p.title}>
              <p className="font-display text-lg font-bold text-ink">{p.title}</p>
              <p className="mt-1 font-sans text-sm text-ink/85">{p.body}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
