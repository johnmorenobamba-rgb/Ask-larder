import { Reveal } from "./Reveal";
import { ScreenFigure } from "./ScreenFigure";

/** Certificates and the typed name sign off (claims ledger S4, S5, O5). The sign off is a record that training was understood, never a legal signature. */
export function CertsSignSection() {
  return (
    <section id="certificates" className="bg-parchment px-6 py-24 sm:px-10 md:px-16">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-clay-brown">Certificates and sign off</p>
          <h2 className="mb-4 font-display text-3xl font-bold text-ink sm:text-4xl">Every certificate and sign off in one place.</h2>
        </Reveal>
        <div className="mt-12 grid items-start gap-10 lg:grid-cols-2">
          <Reveal>
            <ScreenFigure
              shot="owner-certificates"
              alt="The owner certificate list showing each person, the certificate type and the date it expires, with the soonest first"
              caption="Staff photograph a certificate and enter its dates. You see every certificate and when it expires."
            />
          </Reveal>
          <Reveal delayMs={80}>
            <ScreenFigure
              shot="esign"
              alt="A Sign to confirm screen where a new hire has typed their full name above a Confirm and sign button"
              caption="Staff confirm they understand a module by typing their name. Larder records when, and from which device. It is a comprehension check, not a contract."
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
