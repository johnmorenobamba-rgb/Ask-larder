"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/track";

/**
 * Video v5 (video-promo-30s branch, 29 Oct 2026): a 45 second vertical (9:16) film with an ElevenLabs voiceover, word by word captions
 * burned into the picture, a synthesised music track and sound effects. It merges promo v4's in-app Ask Larder demo, its three tap
 * checklist and its glowing chit close into the new fast cut. It is a rendered MP4, so no Remotion runtime reaches the browser. It always
 * starts muted, plays on mute when scrolled into view and pauses when it leaves, but it never autoplays for a visitor who asked for reduced
 * motion, it stops autoplaying once the viewer pauses it themselves (WCAG 2.2.2), controls are always visible, the file loads only when
 * needed (preload none, the poster shows first), and a text transcript sits under it as the accessible alternative. The voiceover is
 * captioned in the picture (lines that repeat words already full screen are not captioned twice); the transcript has every spoken line.
 */
const TRANSCRIPT: string[] = [
  "Day one. New starter.",
  "Nobody's free to train them. Every answer? Ask Dave. Certificates? Nobody's tracking.",
  "Larder trains your team from your own SOPs.",
  "Stuck mid shift? Ask Larder. How do I change the fryer oil? It answers from the procedures you approved.",
  "Daily checklists, done in three taps: tap Pass, tap Mark the rest as pass, tap Save record. Pass, 11 of 11 checks passed. Three taps. Nothing typed.",
  "Your dashboard tracks completion and certificate expiry: RSA, food handling, WWCC and first aid.",
  "Opening procedure, module completed. Trained your way, from day one.",
  "Larder. Book a walkthrough. asklarder.com.au.",
  "The app screens in the film are redrawn from the app for an example venue with invented names.",
];

export function ExplainerVideoSection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // true while this component, not the viewer, is the one pausing or playing
  const scriptedRef = useRef(false);
  const viewerPausedRef = useRef(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const video = videoRef.current;
    if (!wrapper || !video) return;
    // visitors who asked for reduced motion press play themselves
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (viewerPausedRef.current) return;
          scriptedRef.current = true;
          video.play().catch(() => {
            // autoplay refused: the poster and the controls are still there
          });
        } else if (!video.paused) {
          scriptedRef.current = true;
          video.pause();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="explainer-video" aria-labelledby="film-heading" className="bg-ink px-6 py-16 sm:px-10 md:py-24 md:px-16">
      <div className="mx-auto max-w-4xl">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-saffron uppercase">See it in motion</p>
        <h2 id="film-heading" className="mb-10 text-center font-display text-3xl font-bold text-parchment sm:text-4xl">
          From a pile of forms to a few taps.
        </h2>
        {/* the film is vertical (9:16): as wide as fits, at most 28rem, and never taller than 80 percent of the screen (45svh x 16/9) */}
        <div
          ref={wrapperRef}
          className="relative mx-auto aspect-[9/16] overflow-hidden rounded-3xl shadow-2xl"
          style={{ width: "min(100%, 28rem, 45svh)" }}
        >
          <video
            ref={videoRef}
            src="/videos/larder-v5-web.mp4"
            poster="/videos/larder-v5-poster.jpg"
            muted
            controls
            playsInline
            preload="none"
            onPlay={() => {
              track("video_play", { trigger: scriptedRef.current ? "scroll" : "viewer" });
              scriptedRef.current = false;
            }}
            onPause={() => {
              const byScript = scriptedRef.current;
              scriptedRef.current = false;
              if (!byScript) viewerPausedRef.current = true;
              track("video_pause", { trigger: byScript ? "scroll" : "viewer" });
            }}
            aria-label="A 45 second film with a voiceover: a new starter's first day with nobody free to train them, Larder training staff from the venue's own procedures, Ask Larder answering a question from approved procedures, a daily checklist finished in three taps, the owner dashboard tracking certificate expiry, a completed module, and how to book a walkthrough. It starts muted, the voiceover is captioned in the picture, and a transcript follows."
            className="h-full w-full bg-ink object-contain"
          />
        </div>
        <details className="mt-6 rounded-2xl border-2 border-parchment/30 px-5 py-4 text-parchment open:border-parchment/60">
          <summary className="min-h-11 cursor-pointer font-display text-lg font-bold">Read the transcript</summary>
          <ol className="mt-3 space-y-2 font-sans text-base text-parchment/90">
            {TRANSCRIPT.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </details>
      </div>
    </section>
  );
}
