import { Reveal } from "./Reveal";

// Every answer maps to a built and tested item in the claims ledger, or says plainly what Larder does not do.
export const FAQS: { q: string; a: string }[] = [
  {
    q: "Does Larder replace our rostering tool?",
    a: "No. Larder is not a rostering tool. It holds staff names, roles, training, certificates and compliance records. It does not hold shifts, hours, days off or pay. It works alongside tools like Tanda or Deputy, and it does not connect to them.",
  },
  {
    q: "Do we have to build the training ourselves?",
    a: "No. We do it with you, starting with one visit to your venue. We turn your own procedures and photos into training modules, and you review every one before it goes live.",
  },
  {
    q: "What can Ask Larder answer?",
    a: "Only what is in your own approved content. If a question needs a key, a code or a login, Ask Larder tells the person to ask their supervisor. If the answer is not in your content, it says so and points to a supervisor.",
  },
  {
    q: "Are the compliance forms legally required?",
    a: "Which records your venue needs depends on your state, your council and your licence. Each form says whether it is a recommended record. Larder helps you keep records and it is not legal advice.",
  },
  {
    q: "Does Larder send reminders about overdue forms?",
    a: "Overdue forms show on screen, for staff on the forms hub and for you on the owner overview. Larder does not send reminders or chase forms.",
  },
  {
    q: "Do state rules make a difference?",
    a: "Some rules differ by state. RSA and working with children checks have different regulators and names in each state, so we set those up for the state your venue is in.",
  },
  {
    q: "Does it need an internet connection?",
    a: "Yes. Larder runs in the browser on the iPad you already have, and it needs a connection to save records and answer questions.",
  },
  {
    q: "What happens if we cancel?",
    a: "Larder is month to month with 30 days notice. We export your records for you on request. Access to Ask Larder ends when you cancel.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="bg-parchment px-6 py-24 sm:px-10 md:px-16">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.2em] text-clay-brown">Questions</p>
          <h2 className="mb-10 text-center font-display text-3xl font-bold text-ink sm:text-4xl">Questions owners ask us.</h2>
        </Reveal>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border-2 border-clay-brown/40 bg-parchment px-5 py-4 open:border-ink/60">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold text-ink">
                {f.q}
                <span aria-hidden="true" className="font-mono text-xl text-preserve-red transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 font-sans text-base text-ink/80">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
