import { Reveal } from "./Reveal";
import { ScreenFigure } from "./ScreenFigure";

/**
 * Ask Larder, led by a useful answer (claims ledger A1: answers come from the venue's own approved content; the owner
 * approves every module first). The supervisor fallback appears only as the one plain trust line, with no screenshot of it.
 */
export function AskLarderSection() {
  return (
    <section id="ask" className="bg-bay-green px-6 py-24 sm:px-10 md:px-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-saffron">Ask Larder</p>
          <h2 className="mb-4 font-display text-3xl font-bold text-parchment sm:text-4xl">Ask mid shift, get the answer.</h2>
          <p className="font-sans text-lg text-parchment/90">
            A new hire is on their own at close and asks how to change the fryer oil. Ask Larder answers from your
            venue&apos;s own approved procedures, at any hour, in plain steps.
          </p>
          <p className="mt-4 font-sans text-base text-parchment/80">
            Your owner approves every procedure before it goes live, so Ask Larder only works from content you have signed off.
          </p>
          <p className="mt-6 font-sans text-base text-saffron">
            Anything that needs a key, code or login goes to a supervisor.
          </p>
        </Reveal>
        <Reveal delayMs={80}>
          <ScreenFigure
            shot="ask-answer"
            alt="The Ask Larder chat on a phone. The question is how to change the fryer oil, and the answer lists the steps: let the oil cool for an hour, drain it, clean and dry the tank, refill to the line and write the date on the fryer log"
            caption="An answer from the Ask Larder chat. Example venue with invented names."
            tone="dark"
            sizes="(min-width: 1024px) 384px, 100vw"
            className="mx-auto max-w-sm"
          />
        </Reveal>
      </div>
    </section>
  );
}
