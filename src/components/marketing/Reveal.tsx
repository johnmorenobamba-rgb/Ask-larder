"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The same scroll reveal the other marketing sections use (fade up once, 500ms ease out), as one reusable wrapper.
 * Content is visible without script and under reduced motion: the hidden starting state is only applied once the observer
 * exists, and it is applied to the element directly so no state is set inside the effect.
 */
export function Reveal({ children, delayMs = 0, className = "" }: { children: ReactNode; delayMs?: number; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(16px)";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "";
          el.style.transform = "";
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      el.style.opacity = "";
      el.style.transform = "";
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out motion-reduce:transition-none ${className}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
