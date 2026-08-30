"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { EmberGlowBackground } from "./EmberGlowBackground";

// GSAP + DrawSVG/MorphSVG/SplitText (~40KB gzipped -- real weight on a
// so-so kitchen-iPad wifi connection, per the Decision Log's own flag on
// this block) has no reason to sit in every route's shared JS just because
// SplashScreen mounts globally in the root layout -- `alreadyShownToday` is
// true on nearly every page load once a device has seen the splash today.
// A dynamic import defers fetching this chunk to the one day-per-device
// case where the splash actually renders, instead of every navigation.
const SplashSequence = dynamic(() => import("./SplashSequence").then((m) => m.SplashSequence), { ssr: false });

const STORAGE_KEY = "larder-splash-shown-date";
// SplashSequence's own GSAP timeline (draw + settle + wordmark stagger +
// a legible hold + unsettle) now runs ~2.3s end to end -- MIN_DISPLAY_MS
// must clear that comfortably, or the fade-out (driven independently by
// page-load timing, not by the sequence's own onComplete) can start
// mid-wordmark-reveal, which is exactly what made the wordmark barely
// readable before this was raised from 1300ms.
const MIN_DISPLAY_MS = 2500;
const MAX_WAIT_MS = 3500;
const FADE_MS = 300;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function subscribe() {
  return () => {};
}

function readAlreadyShownToday(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === todayKey();
  } catch {
    return false;
  }
}

/**
 * Block J4/L5 — the in-app cold-load splash. Ember-glow background (Block
 * J4's EmberGlowBackground) behind Block L5's SplashSequence -- one
 * coordinated `gsap.timeline()` that DrawSVG-traces the chit mark,
 * MorphSVGs it into a bolder filled state, then SplitText-staggers the
 * wordmark in character-by-character, before handing off to a plain
 * ChitMark for the same idle traveling-glow trace every other usage has.
 * Plays once per calendar day per device. Never replays on internal
 * client-side navigation -- this mounts once in the root layout, which the
 * App Router doesn't remount on route changes, so only a genuine fresh
 * document load re-runs the sequence below. Same reasoning covers tab
 * backgrounding/return: no unmount, no remount, nothing re-triggers.
 *
 * `alreadyShownToday` reads localStorage via useSyncExternalStore (server
 * snapshot: false, so SSR always renders the splash and there's no
 * hydration mismatch) rather than an effect-set boolean -- react-hooks'
 * set-state-in-effect rule flags any direct setState call in an effect
 * body, even a conditional one, so this keeps the effect's only setState
 * calls inside genuine async callbacks (timeouts), which the rule accepts.
 *
 * SplashSequence's own hand-off to an idle ChitMark IS the "hold until
 * ready, never a hard freeze" behavior -- nothing extra is needed here
 * beyond keeping this overlay mounted until `finish()` below decides to
 * fade it out. SplashSequence is wrapped in `.animate-stamp` (the same
 * lift/scale-in used at the app's other trust moments) for the
 * floating/emerging-above-the-ember-field entrance, instead of a flat
 * fade-in. `.animate-stamp` already has its own reduced-motion override in
 * globals.css (skips straight to the settled scale/opacity); SplashSequence
 * has its own separate reduced-motion check for the GSAP timeline itself.
 */
const ICON_SIZE = 96;
export function SplashScreen({ children }: { children: React.ReactNode }) {
  const alreadyShownToday = useSyncExternalStore(subscribe, readAlreadyShownToday, () => false);
  const [fadingOut, setFadingOut] = useState(false);
  const [sequenceDone, setSequenceDone] = useState(false);

  useEffect(() => {
    if (alreadyShownToday) return;

    const start = Date.now();
    let cancelled = false;

    function finish() {
      if (cancelled) return;
      const remaining = Math.max(0, MIN_DISPLAY_MS - (Date.now() - start));
      window.setTimeout(() => {
        if (cancelled) return;
        setFadingOut(true);
        window.setTimeout(() => {
          if (cancelled) return;
          try {
            window.localStorage.setItem(STORAGE_KEY, todayKey());
          } catch {
            // ignore -- next load just replays, not a real failure
          }
          setSequenceDone(true);
        }, FADE_MS);
      }, remaining);
    }

    if (document.readyState === "complete") {
      finish();
      return;
    }

    window.addEventListener("load", finish);
    const maxTimer = window.setTimeout(finish, MAX_WAIT_MS);
    return () => {
      cancelled = true;
      window.removeEventListener("load", finish);
      window.clearTimeout(maxTimer);
    };
  }, [alreadyShownToday]);

  const visible = !alreadyShownToday && !sequenceDone;

  return (
    <>
      {children}
      {visible && (
        <div
          className={`fixed inset-0 z-[100] transition-opacity duration-300 ${fadingOut ? "opacity-0" : "opacity-100"}`}
        >
          <EmberGlowBackground />
          <div className="relative flex h-full flex-col items-center justify-center">
            <div className="animate-stamp relative">
              <SplashSequence
                size={ICON_SIZE}
                fillColor="var(--color-parchment)"
                traceColor="var(--color-saffron)"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
