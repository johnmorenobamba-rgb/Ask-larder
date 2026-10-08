import { Reveal } from "./Reveal";
import { ScreenFigure } from "./ScreenFigure";

/** Station QR codes and the station gallery (claims ledger S6, O9). The photos in the example are generated samples, not real venue photography. */
export function StationGallerySection() {
  return (
    <section id="stations" className="bg-ink px-6 py-24 sm:px-10 md:px-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-saffron">Stations</p>
          <h2 className="mb-4 font-display text-3xl font-bold text-parchment sm:text-4xl">Scan the code on the machine.</h2>
          <p className="font-sans text-lg text-parchment/80">
            Every station gets its own QR code and a photo of your equipment. Staff scan it on the floor and get that
            station&apos;s training, its questions and answers, and troubleshooting, with Ask Larder one tap away.
          </p>
          <p className="mt-4 font-sans text-base text-parchment/70">
            You print the label from the owner screen and stick it where it is needed.
          </p>
        </Reveal>
        <Reveal delayMs={80}>
          <ScreenFigure
            shot="stations-gallery"
            alt="The owner dashboard station gallery: a large photo of a pizza oven with its QR code and four more station photos beside it (fryer, grill, dish pit and range)"
            caption="The station gallery on the owner dashboard. Example venue. Stock images."
            tone="dark"
          />
        </Reveal>
      </div>
    </section>
  );
}
