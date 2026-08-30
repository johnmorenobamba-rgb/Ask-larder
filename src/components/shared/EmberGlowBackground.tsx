"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

// Punchier, more saturated than the Branding Kit's flat swatches -- at low
// canvas opacity + screen blend, the flat #E8A93B/#B23A2C read as one muddy
// brown wash. These are boosted specifically so the two hues stay visually
// distinct once blended and blurred.
const SAFFRON_RGB = "255, 189, 64";
const PRESERVE_RED_RGB = "220, 51, 32";
const PILLAR_COUNT = 6;

type Pillar = {
  xFraction: number;
  width: number;
  rgb: string;
  riseSpeed: number;
  phase: number;
  swayAmp: number;
  baseOpacity: number;
  yOffset: number;
  streakOffset: number;
};

function makePillars(width: number, height: number): Pillar[] {
  return Array.from({ length: PILLAR_COUNT }, (_, i) => ({
    xFraction: (i + 0.5) / PILLAR_COUNT + (Math.random() - 0.5) * 0.08,
    width: width * (0.03 + Math.random() * 0.02),
    rgb: i % 2 === 0 ? SAFFRON_RGB : PRESERVE_RED_RGB,
    riseSpeed: height * (0.05 + Math.random() * 0.04),
    phase: Math.random() * Math.PI * 2,
    swayAmp: width * 0.015,
    baseOpacity: 0.4 + Math.random() * 0.18,
    yOffset: Math.random() * height,
    streakOffset: Math.random() * height,
  }));
}

/** Small tileable grain texture, generated once and cached as a data URL —
 * static, so it doesn't need a redraw loop like the pillars do. */
function makeGrainDataUrl(): string {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return c.toDataURL();
}

/**
 * Block J4 — the splash's ember-glow background. Saffron/Preserve Red only
 * (explicitly not an RGB-chromatic-split/scanline "hologram" look — that
 * reads as generic sci-fi and fights the warm palette), noise-driven
 * organic rising light pillars via layered sine drift (no external noise
 * library), additive "screen" blend so overlapping pillars actually glow
 * brighter rather than just alpha-composite, plus a static paper-grain
 * overlay for the "paper and ink" material language used elsewhere.
 *
 * Reworked after first-pass user feedback: the original 28px `ctx.filter`
 * blur washed the two hues into one indistinct brown, and a smooth
 * symmetric ellipse gave no directional cue when the frame was frozen.
 * Fixed by (1) moving blur off the 2D context entirely onto a CSS
 * `blur-[6px]` on the canvas element (see the JSX below) -- `ctx.filter`
 * re-runs a real CPU blur pass on every single draw call, and with 24 draws
 * a frame that measured at ~4fps, badly delaying the splash's own hide
 * timing; a CSS filter blurs the whole composited layer once, ~free on the
 * GPU, (2) boosting each color's saturation/lightness so screen-blending
 * them still reads as two distinct hues rather than one blend, and (3)
 * drawing each pillar as a tall, top-bright/bottom-fading gradient with
 * thin internal streak lines layered on top -- an asymmetric shape whose
 * brighter leading edge sits at the top, so "rising" is legible even in a
 * single still frame, not just once it's animating.
 *
 * `prefers-reduced-motion`: renders one static frame instead of a
 * continuous rAF loop — same content, no motion, matching how every other
 * animated piece in this app degrades.
 */
export function EmberGlowBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    if (grainRef.current) {
      grainRef.current.style.backgroundImage = `url(${makeGrainDataUrl()})`;
    }

    let width = 0;
    let height = 0;
    let pillars: Pillar[] = [];
    let raf = 0;
    const start = performance.now();

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      pillars = makePillars(width, height);
    }
    resize();
    window.addEventListener("resize", resize);

    function drawPillar(p: Pillar, elapsed: number) {
      const sway = Math.sin(elapsed * 0.35 + p.phase) * p.swayAmp;
      const cx = p.xFraction * width + sway;
      // Rises continuously and wraps -- the leading (bright) edge is the
      // top of the gradient, so the shape itself implies "up" even at a
      // single instant, not only across frames.
      const cycle = height * 1.5;
      const headY = height - (((elapsed * p.riseSpeed + p.yOffset) % cycle) - height * 0.25);
      const tailY = headY + height * 0.62;

      const grad = ctx!.createLinearGradient(cx, headY, cx, tailY);
      grad.addColorStop(0, `rgba(${p.rgb}, 0)`);
      grad.addColorStop(0.12, `rgba(${p.rgb}, ${p.baseOpacity})`);
      grad.addColorStop(0.4, `rgba(${p.rgb}, ${p.baseOpacity * 0.55})`);
      grad.addColorStop(1, `rgba(${p.rgb}, 0)`);
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.ellipse(cx, (headY + tailY) / 2, p.width / 2, (tailY - headY) / 2, 0, 0, Math.PI * 2);
      ctx!.fill();

      // Thin brighter streak lines within the pillar -- reads as vertical
      // texture/definition even in a frozen frame, not just a soft blob.
      const streakCount = 3;
      for (let s = 0; s < streakCount; s++) {
        const t = ((elapsed * 0.4 + p.streakOffset / height + s / streakCount) % 1) - 0.5;
        const sy = headY + t * (tailY - headY) * 1.4;
        const streakGrad = ctx!.createLinearGradient(cx, sy - height * 0.05, cx, sy + height * 0.05);
        streakGrad.addColorStop(0, `rgba(${p.rgb}, 0)`);
        streakGrad.addColorStop(0.5, `rgba(${p.rgb}, ${p.baseOpacity * 0.5})`);
        streakGrad.addColorStop(1, `rgba(${p.rgb}, 0)`);
        ctx!.fillStyle = streakGrad;
        ctx!.fillRect(cx - p.width * 0.16, sy - height * 0.05, p.width * 0.32, height * 0.1);
      }
    }

    function drawFrame(now: number) {
      const elapsed = (now - start) / 1000;
      ctx!.clearRect(0, 0, width, height);
      ctx!.globalCompositeOperation = "screen";
      for (const p of pillars) drawPillar(p, elapsed);
    }

    if (reducedMotion) {
      drawFrame(start);
    } else {
      const loop = (t: number) => {
        drawFrame(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reducedMotion]);

  return (
    <div className={`absolute inset-0 overflow-hidden bg-ink ${className}`}>
      {/* blur lives on the element (CSS/GPU-composited, ~free per frame),
          not on the 2D context (ctx.filter re-runs a CPU blur pass on
          every single draw call -- with 24 draw calls/frame this pinned
          the main thread to ~4fps, badly delaying the splash's own
          hide timing). See drawFrame() below: it draws unfiltered. */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full blur-[6px]" />
      <div ref={grainRef} className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay" />
    </div>
  );
}
