"use client";

import { useEffect, useRef, useState } from "react";

// Same 24x24/1.5-stroke custom-glyph language as FeatureGuideStrip's icons
// (Branding Kit rule: no stock icon library).
function SpeakerOffGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m16 9 5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function SpeakerOnGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M16.5 9.5a4 4 0 0 1 0 5M19 7a7.5 7.5 0 0 1 0 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Block N — Section 2 (Build Manual, revised sequencing 1 Sep 2026): the
 * Remotion explainer video, embedded directly below Section 1's features
 * list. Autoplay-on-scroll-into-view, muted by default per standard
 * browser autoplay policy (Chrome/Safari won't autoplay unmuted regardless
 * of what we ask for) -- a visible, always-on unmute control compensates,
 * rather than silently hoping the viewer notices sound is off.
 */
export function ExplainerVideoSection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const video = videoRef.current;
    if (!wrapper || !video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {
            // Autoplay can still be blocked in rare cases (e.g. Low Power
            // Mode) -- the poster frame and visible controls mean the
            // viewer can always start it manually, so this is a silent no-op.
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
    <section className="bg-ink px-6 py-24 sm:px-10 md:px-16">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-saffron uppercase">See it in motion</p>
        <h2 className="mb-10 text-center font-display text-3xl font-bold text-parchment sm:text-4xl">
          What your team actually sees.
        </h2>
        <div ref={wrapperRef} className="relative overflow-hidden rounded-3xl shadow-2xl">
          <video
            ref={videoRef}
            src="/videos/larder-explainer.mp4"
            poster="/videos/larder-explainer-poster.png"
            muted={muted}
            playsInline
            preload="metadata"
            className="aspect-square w-full bg-ink"
          />
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute video" : "Mute video"}
            className="absolute right-4 bottom-4 flex h-11 w-11 items-center justify-center rounded-full bg-ink/70 text-parchment backdrop-blur-sm transition-colors hover:bg-ink/90"
          >
            {muted ? <SpeakerOffGlyph /> : <SpeakerOnGlyph />}
          </button>
        </div>
      </div>
    </section>
  );
}
