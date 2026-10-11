import Image from "next/image";
import type { FeatureFigure } from "@/data/features";
import { SHOTS } from "@/data/featureShots";

/**
 * One real screen from the demo venue with one or two numbered callouts. The callouts are HTML on top of the image, not baked into
 * the pixels, so the legend below is real text. Portrait phone crops are held to a narrow column so they do not fill a desktop.
 */
export function AnnotatedFigure({ figure, priority = false }: { figure: FeatureFigure; priority?: boolean }) {
  const s = SHOTS[figure.shot];
  const portrait = s.height / s.width > 1.1;
  return (
    <figure className={portrait ? "mx-auto w-full max-w-[300px]" : "w-full"}>
      <div className="relative overflow-hidden rounded-2xl border-2 border-ink/15 bg-parchment shadow-[0_18px_40px_-18px_rgba(31,27,22,0.45)]">
        <Image
          src={s.src}
          alt={figure.alt}
          width={s.width}
          height={s.height}
          sizes={portrait ? "300px" : "(min-width: 1024px) 560px, (min-width: 768px) 55vw, 100vw"}
          placeholder="blur"
          blurDataURL={s.blur}
          priority={priority}
          className="h-auto w-full"
        />
        {figure.callouts?.map((c, i) => (
          <span
            key={c.label}
            aria-hidden="true"
            className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-saffron font-mono text-xs font-medium text-ink"
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
          >
            {i + 1}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 font-sans text-sm text-ink/80">
        {figure.callouts && figure.callouts.length > 0 && (
          <ol className="mb-2 space-y-1">
            {figure.callouts.map((c, i) => (
              <li key={c.label} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-saffron font-mono text-[11px] text-ink">
                  {i + 1}
                </span>
                <span>{c.label}</span>
              </li>
            ))}
          </ol>
        )}
        {figure.caption}
      </figcaption>
    </figure>
  );
}
