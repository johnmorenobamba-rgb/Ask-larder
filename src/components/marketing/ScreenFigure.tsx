import Image from "next/image";
import shots from "./launchShots.json";

export type ShotKey = keyof typeof shots;

/**
 * A real screen from the product, shown plainly (no device frame). All screens come from an example venue with invented
 * names, which the page says once near the top of the first section that uses them.
 */
export function ScreenFigure({
  shot,
  alt,
  caption,
  sizes = "(min-width: 1024px) 560px, 100vw",
  priority = false,
  tone = "light",
  className = "",
}: {
  shot: ShotKey;
  alt: string;
  caption?: string;
  sizes?: string;
  priority?: boolean;
  tone?: "light" | "dark";
  className?: string;
}) {
  const s = shots[shot];
  return (
    <figure className={className}>
      <div className="overflow-hidden rounded-2xl border-2 border-ink/15 bg-parchment shadow-[0_18px_40px_-18px_rgba(31,27,22,0.45)]">
        <Image
          src={s.src}
          alt={alt}
          width={s.width}
          height={s.height}
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="h-auto w-full"
        />
      </div>
      {caption && <figcaption className={`mt-3 font-sans text-sm ${tone === "dark" ? "text-parchment/90" : "text-ink/80"}`}>{caption}</figcaption>}
    </figure>
  );
}
