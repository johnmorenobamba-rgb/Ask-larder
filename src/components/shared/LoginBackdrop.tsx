/**
 * Daytime companion to J4/L5's EmberGlowBackground for the two login
 * screens, which read as flat with nothing behind the content. Large,
 * soft-blurred brand-color shapes at low opacity on the parchment surface
 * -- not a gradient fill (the Branding Kit's own anti-pattern), a layered
 * composition of solid blurred shapes, the same technique
 * EmberGlowBackground already uses for the splash, just a light/static
 * daytime register instead of a dark animated one. Static (no motion), so
 * no `prefers-reduced-motion` handling is needed.
 */
export function LoginBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-saffron opacity-[0.14] blur-3xl" />
      <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-bay-green opacity-[0.10] blur-3xl" />
      <div className="absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-preserve-red opacity-[0.08] blur-3xl" />
      <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-clay-brown opacity-[0.12] blur-3xl" />
    </div>
  );
}
