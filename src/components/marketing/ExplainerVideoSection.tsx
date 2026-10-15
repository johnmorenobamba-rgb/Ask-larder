"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/track";

/**
 * Video v4 (video-v3 branch, revision 2): a 74 second film with the words burned into the picture, an upbeat synthesised music track and
 * sound effects. It is a rendered MP4, so no Remotion runtime reaches the browser. It always starts muted, plays on mute when scrolled into
 * view and pauses when it leaves, but it never autoplays for a visitor who asked for reduced motion, it stops autoplaying once the viewer
 * pauses it themselves (WCAG 2.2.2), controls are always visible, the file loads only when needed (preload none, the poster shows first),
 * and a text transcript sits under it as the accessible alternative. There is no narration, so there is nothing to caption beyond the
 * burned in words; the sound is music, taps, key clicks and a scan beep.
 */
const TRANSCRIPT: string[] = [
  "Every shift, the same questions. How do I change the fryer oil? Have the fridges been checked? Why is the beer pouring flat?",
  "Your day off. Their question. Sorry to bother you on your day off.",
  "Ask Larder. How do I change the fryer oil? The answer comes from procedures you approved. Where is the key to the safe? Ask your supervisor for assistance, as they have access to the safe. Keys and safes go to a supervisor.",
  "Every shift. Every day. Every week. Three taps, nothing typed: open the checklist, tap Mark the rest as pass, tap Save record. That is when everything passes.",
  "A walk in cool room reading of 8°C is out of range. No note, no save: pick what you did about it, then save the reading. It is flagged on your dashboard.",
  "First shift in the cellar. Why is the beer pouring flat? Scan the station. Its own fixes, at the station: try this, then this, and if that does not fix it, stop and ask your supervisor for help.",
  "Tonight, someone closes without you. Who do they call?",
  "Book a walk through. asklarder.com.au. hello@asklarder.com.au.",
  "The screens in the film are from example venues with invented names. The Ask Larder panel, the checklist, the temperature log, the station page and the troubleshooting page are redrawn from the app; the forms hub and the owner dashboard are real screens. The cellar photo is a stock image with a sticker added.",
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
        <div ref={wrapperRef} className="relative overflow-hidden rounded-3xl shadow-2xl">
          <video
            ref={videoRef}
            src="/videos/larder-v4-web.mp4"
            poster="/videos/larder-v4-poster.jpg"
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
            aria-label="A 74 second film: staff questions reaching the owner on their day off, Ask Larder answering from approved procedures and sending a question about the safe key to a supervisor, a three tap checklist, an out of range temperature that needs a note, scanning a station QR code for its own troubleshooting, and how to book a walk through. It has music and sound effects but no narration, and it starts muted. A transcript follows."
            className="aspect-video w-full bg-ink"
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
