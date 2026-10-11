"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/track";

/**
 * Video v2b (showcase fix, built on launch-2): a silent 60 second film with the words burned into the picture. It is a rendered MP4,
 * so no Remotion runtime reaches the browser. It plays on mute when scrolled into view and pauses when it leaves, but it never
 * autoplays for a visitor who asked for reduced motion, it stops autoplaying once the viewer pauses it themselves (WCAG 2.2.2),
 * controls are always visible, the file loads only when needed (preload none, the poster shows first), and a text transcript sits
 * under it as the accessible alternative. There is no narration, so there is nothing to caption beyond the burned in words.
 */
const TRANSCRIPT: string[] = [
  "Every shift. Every day. Every week. Every month. And all of it needs filing.",
  "“I’ll answer your question tomorrow when the manager’s back.” Sound familiar?",
  "You want to open something and tap.",
  "Three taps. Nothing typed. A checklist where everything passes: open the form from the hub, tap Mark the rest as pass, tap Save.",
  "Temperatures are typed. A failed reading asks what you did about it. One tap on a ready made note does it.",
  "One screen for the owner. Records you can print or download. Failed readings flagged.",
  "Ask mid shift, get the answer. How do I change the fryer oil? A customer says they are allergic to nuts, what do I do? Each answer comes from your own approved procedures. Anything that needs a key, code or login goes to a supervisor.",
  "Scan the code on the machine.",
  "Book a walk through. asklarder.com.au.",
  "The screens in the film are from an example venue with invented names. The station photos are stock images.",
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
            src="/videos/larder-v2b-web.mp4"
            poster="/videos/larder-v2b-poster.jpg"
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
            aria-label="A 60 second film: the forms your venue fills in, three taps to complete a checklist, one screen for the owner, Ask Larder answering two practical questions, and how to book a walk through. It has no sound. A transcript follows."
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
