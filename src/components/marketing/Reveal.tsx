"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The same scroll reveal the other marketing sections use (fade up once, 500ms ease out), as one reusable wrapper.
 * Content is visible without script and under reduced motion: the starting state is only applied once the observer exists.
 */
export function Reveal({ children, delayMs = 0, className = "" }: { children: ReactNode; delayMs?: number; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setArmed(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out motion-reduce:transition-none ${className}`}
      style={armed && !visible ? { opacity: 0, transform: "translateY(16px)", transitionDelay: `${delayMs}ms` } : { transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
