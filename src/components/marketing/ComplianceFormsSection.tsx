import { Reveal } from "./Reveal";
import { ScreenFigure } from "./ScreenFigure";

/**
 * Compliance forms, in taps. Replaces the old ComplianceSection, which promised compliance and stated a legal duty we have not
 * verified. This section leads with record keeping, says what is typed, and claims no time saved.
 * Tap counts are measured (tests/e2e/tap-counts.spec.ts): a checklist where everything passes is three taps from the forms hub.
 */
export function ComplianceFormsSection() {
  return (
    <section id="forms" className="relative bg-ink px-6 py-24 sm:px-10 md:px-16">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-saffron">Compliance forms</p>
          <h2 className="mb-6 font-display text-3xl font-bold text-parchment sm:text-4xl">
            The forms you fill in every day, on the iPad already in your kitchen.
          </h2>
          <p className="font-sans text-lg text-parchment/80">
            You know your venue has to keep records. The hard part is how many there are: forms every shift, every day,
            every week and every month, and all of it has to be filed.
          </p>
          <p className="mt-4 font-sans text-lg text-parchment/80">
            With Larder your team opens the forms hub, picks a form and taps. A checklist where everything passes takes
            three taps from the hub, with nothing typed. Temperatures and quantities are typed, and a failed reading asks
            for a short note before it saves.
          </p>
        </Reveal>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Reveal>
            <ScreenFigure
              shot="forms-hub"
              alt="The Larder forms hub on a tablet, grouped by every shift, daily, monthly and when it happens, with cards marked Done, In progress and Not started"
              caption="The forms hub, grouped by how often each form is due. Example venue with invented names."
              sizes="(min-width: 1024px) 420px, 100vw"
              tone="dark"
            />
          </Reveal>
          <div className="space-y-10">
            <Reveal delayMs={80}>
              <ScreenFigure
                shot="checklist-tablet"
                alt="A kitchen opening checklist on a tablet with a Mark the rest as pass button and Pass, Fail and Not applicable choices for each check"
                caption="A checklist. One tap marks the rest as pass, one tap marks a check as failed."
                sizes="(min-width: 1024px) 640px, 100vw"
                tone="dark"
              />
            </Reveal>
            <Reveal delayMs={120}>
              <ScreenFigure
                shot="checklist-fail-note"
                alt="A checklist with one failed check, a red prompt asking what was done about it, and the Save button waiting for the note"
                caption="If a check fails, Larder asks what was done about it. The record does not save until there is a note."
                sizes="(min-width: 1024px) 640px, 100vw"
                tone="dark"
              />
            </Reveal>
          </div>
        </div>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
          <Reveal>
            <ScreenFigure
              shot="temperature-failed"
              alt="A temperature log card for a bain marie with a reading of 55 degrees against a 60 degree limit, a note typed about what was done and quick note buttons"
              caption="Temperatures are typed. A reading outside its limit needs a note, and the owner sees it flagged."
              sizes="(min-width: 1024px) 380px, 100vw"
              tone="dark"
            />
          </Reveal>
          <Reveal delayMs={80}>
            <ScreenFigure
              shot="owner-overview"
              alt="The owner compliance overview with counts of forms done, not started, overdue, open flags and failures, and a list of what needs attention"
              caption="The owner overview shows what is done, what is overdue and what failed. Overdue shows on screen only."
              tone="dark"
            />
          </Reveal>
        </div>

        <Reveal className="mx-auto mt-14 max-w-3xl text-center">
          <p className="font-sans text-base text-parchment/80">
            Every record keeps the time, the person and what was done about anything that failed. Owners can print the
            records or download them as a CSV file.
          </p>
          <p className="mt-4 font-sans text-sm text-parchment/60">
            Which records your venue needs depends on your state, your council and your licence. Each form is marked as a
            recommended record unless a rule is confirmed. Larder helps you keep records. It is not legal advice.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
