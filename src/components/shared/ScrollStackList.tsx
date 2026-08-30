"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

const BASE_TOP_PX = 72;
const STACK_OFFSET_PX = 6;

/**
 * Block L9 -- GSAP ScrollTrigger sticky-stack reveal for longer lists
 * (certificates, near-miss history, module lists) that were previously a
 * flat static list. Each direct child becomes `position: sticky` at a
 * slightly deeper offset than the one before it (CSS handles the actual
 * pinning -- cheaper than a JS-driven pin), so scrolling settles each card
 * into a fanned stack rather than just scrolling it off screen. A
 * ScrollTrigger scrubbed to real scroll position (not a fixed-duration
 * animation) additionally scales/dims each card down slightly in the
 * moment the next one arrives to cover it, so settling into the stack
 * reads as deliberate rather than cards simply vanishing behind each
 * other. GSAP/ScrollTrigger are dynamic imports, same bundle-weight
 * reasoning as every other GSAP use added this block -- this renders on
 * list pages that don't otherwise need GSAP at all.
 */
export function ScrollStackList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || reducedMotion) return;

    const items = Array.from(container.children) as HTMLElement[];
    items.forEach((item, i) => {
      item.style.position = "sticky";
      item.style.top = `${BASE_TOP_PX + i * STACK_OFFSET_PX}px`;
      item.style.zIndex = String(i + 1);
    });

    let cancelled = false;
    const triggers: { kill: () => void }[] = [];

    import("gsap").then(async ({ default: gsap }) => {
      if (cancelled) return;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      if (cancelled) return;

      for (let i = 0; i < items.length - 1; i++) {
        const item = items[i];
        const next = items[i + 1];
        const trigger = ScrollTrigger.create({
          trigger: next,
          start: "top bottom",
          end: "top top",
          scrub: true,
          onUpdate: (self) => {
            gsap.set(item, { scale: 1 - self.progress * 0.04, opacity: 1 - self.progress * 0.15 });
          },
        });
        triggers.push(trigger);
      }
    });

    return () => {
      cancelled = true;
      triggers.forEach((t) => t.kill());
      items.forEach((item) => {
        item.style.position = "";
        item.style.top = "";
        item.style.zIndex = "";
        item.style.transform = "";
        item.style.opacity = "";
      });
    };
  }, [reducedMotion]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
