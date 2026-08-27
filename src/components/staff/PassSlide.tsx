/**
 * The Pass Slide — the locked screen-transition metaphor (an order chit
 * pushed down the pass). Full 320ms variant for screen-to-screen navigation;
 * pass `light` for the 200ms section-to-section variant within a module.
 */
export function PassSlide({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <div className={light ? "animate-pass-slide-light" : "animate-pass-slide"}>
      {children}
    </div>
  );
}
