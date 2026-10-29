"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOutEverywhere } from "@/components/staff/signOutClient";

const IDLE_MS = 5 * 60 * 1000;
const WARN_MS = 30 * 1000;
const EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

// Venue iPad mode: a person who walks away is logged out so the next person never lands in their account. After five
// minutes with no touch, a banner counts down 30 seconds, then the session ends and the iPad returns to its home.
export function IdleSignOut({ venueSlug }: { venueSlug: string }) {
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARN_MS / 1000);
  const lastActive = useRef(0);
  const leaving = useRef(false);

  const leave = useCallback(async () => {
    if (leaving.current) return;
    leaving.current = true;
    await signOutEverywhere();
    // A full page load, so no signed in state from the old session survives in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/${venueSlug}/login`);
  }, [venueSlug]);

  useEffect(() => {
    lastActive.current = Date.now();
    const touch = () => {
      lastActive.current = Date.now();
    };
    for (const e of EVENTS) window.addEventListener(e, touch, { passive: true });
    const timer = window.setInterval(() => {
      const idle = Date.now() - lastActive.current;
      if (idle >= IDLE_MS + WARN_MS) {
        void leave();
      } else if (idle >= IDLE_MS) {
        setWarning(true);
        setSecondsLeft(Math.max(0, Math.ceil((IDLE_MS + WARN_MS - idle) / 1000)));
      } else {
        setWarning(false);
      }
    }, 1000);
    return () => {
      for (const e of EVENTS) window.removeEventListener(e, touch);
      window.clearInterval(timer);
    };
  }, [leave]);

  if (!warning) return null;
  return (
    <div role="alert" className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-between gap-4 bg-ink px-6 py-4 text-parchment">
      <p className="font-sans text-sm">Still there? You will be logged out in {secondsLeft} seconds.</p>
      <button
        type="button"
        onClick={() => {
          lastActive.current = Date.now();
          setWarning(false);
        }}
        className="rounded-xl bg-saffron px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink"
      >
        Stay logged in
      </button>
    </div>
  );
}
