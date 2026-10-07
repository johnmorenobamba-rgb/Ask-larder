"use client";

import { useEffect, useRef } from "react";

/**
 * Video v2 (launch-2): a silent 60 second film with the words burned into the picture. Same pattern as before: it plays
 * on mute when scrolled into view and pauses when it leaves, but it never autoplays for a visitor who asked for reduced
 * motion, controls are always visible, the file loads only when needed (preload none, the poster shows first), and a text
 * transcript sits under it as the accessible alternative. The old film (/videos/larder-explainer.mp4) stays in the repo, unused.
 */
const TRANSCRIPT: string[] = [
  "Every shift. Every day. Every week. Every month. And all of it needs filing.",
  "“I’ll answer your question tomorrow when the manager’s back.” Sound familiar?",
  "You want to open something and tap.",
  "Three taps. Nothing typed. A checklist where everything passes: open the form from the hub, tap Mark the rest as pass, tap Save.",
  "Temperatures are typed. A failed reading asks what you did about it. One tap on a ready made note does it.",
  "One screen for the owner. Records you can print or download. Failed readings flagged.",
  "Ask Larder answers from your approved content only. Keys, codes and logins go to a supervisor.",
  "Scan the code on the machine.",
  "Book a walk through. asklarder.com.au.",
  "The screens in the film are from an example venue with invented names. The station photos are stock images.",
];

export function ExplainerVideoSection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const video = videoRef.current;
    if (!wrapper || !video) return;
    // visitors who asked for reduced motion press play themselves
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {
            // autoplay refused: the poster and the controls are still there
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="explainer-video" className="bg-ink px-6 py-24 sm:px-10 md:px-16">
      <div className="mx-auto max-w-4xl">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-saffron uppercase">See it in motion</p>
        <h2 className="mb-10 text-center font-display text-3xl font-bold text-parchment sm:text-4xl">
          From a pile of forms to a few taps.
        </h2>
        <div ref={wrapperRef} className="relative overflow-hidden rounded-3xl shadow-2xl">
          <video
            ref={videoRef}
            src="/videos/larder-v2-web.mp4"
            poster="/videos/larder-v2-poster.jpg"
            muted
            controls
            playsInline
            preload="none"
            aria-label="A 60 second film: the forms your venue fills in, three taps to complete a checklist, one screen for the owner, and how to book a walk through. It has no sound. A transcript follows."
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
