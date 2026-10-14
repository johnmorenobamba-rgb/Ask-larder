"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/track";

/**
 * Video v3 (video-v2 branch): a 74 second film with the words burned into the picture and a quiet synthesised sound track. It is a rendered MP4,
 * so no Remotion runtime reaches the browser. It always starts muted, plays on mute when scrolled into view and pauses when it leaves, but it never
 * autoplays for a visitor who asked for reduced motion, it stops autoplaying once the viewer pauses it themselves (WCAG 2.2.2),
 * controls are always visible, the file loads only when needed (preload none, the poster shows first), and a text transcript sits
 * under it as the accessible alternative. There is no narration, so there is nothing to caption beyond the burned in words, and the sound is only ticks, key clicks and a soft bed.
 */
const TRANSCRIPT: string[] = [
  "Closing alone for the first time. The manager is not picking up.",
  "Staff open one screen, on the iPad your venue already has.",
  "Ask Larder. How do I change the fryer oil? The answer comes from your approved procedures. Where is the key to the safe? Ask your supervisor for assistance, as they have access to the safe. Keys, codes and logins go to a supervisor.",
  "Scan the sticker. It is printed from the owner screen and stuck where it is needed. Scanning opens that station's training, answers and fixes.",
  "Three taps. A checklist where everything passes. Nothing typed: open the form from the hub, tap Mark the rest as pass, tap Save.",
  "Add a certificate. Add the photo and the issued date, and Larder works out the due date.",
  "Built from your SOPs. You approve every module first. Staff sign off by typing their name.",
  "You see what staff ask: every question sent to a supervisor shows on the owner screen. You see what is expiring: every certificate and its date.",
  "Larder. Answers from your venue. Not from a guess. asklarder.com.au.",
  "The screens in the film are from an example venue with invented names. The Ask Larder panel, the station page, the certificate upload and the sign off screens are redrawn from the app. The station photo is a stock image with a sticker added.",
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
            src="/videos/larder-v3-web.mp4"
            poster="/videos/larder-v3-poster.jpg"
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
            aria-label="A 74 second film: a new hire closing alone, Ask Larder answering a question and sending a key question to a supervisor, scanning a station QR code, a three tap checklist, adding a certificate, signing off by typing a name, and the owner screen. It has no narration, only a quiet sound track, and it starts muted. A transcript follows."
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
