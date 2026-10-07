import React, { useEffect, useState } from "react";
import { AbsoluteFill, OffthreadVideo, delayRender, continueRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";
import { BUBBLE_PATH, C, FONT_DISPLAY, FPS, H, W, easeInOut, easeOut, easeWipe } from "./brand";

// ---------- brand fonts (the files already in the repo, copied into the git ignored public dir) ----------
const fontsReady = Promise.all([
  loadFont({ family: "Space Grotesk", url: staticFile("fonts/spacegrotesk-variable.woff2"), weight: "300 700" }),
  loadFont({ family: "Inter", url: staticFile("fonts/inter-variable.woff2"), weight: "100 900" }),
  loadFont({ family: "IBM Plex Mono", url: staticFile("fonts/ibmplexmono-500.woff2"), weight: "500" }),
]);
export const useBrandFonts = () => {
  const [handle] = useState(() => delayRender("brand fonts"));
  useEffect(() => {
    fontsReady.then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);
};

// ---------- texture ----------
/** Film grain: fractal noise with a new seed every second frame. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.16 }) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2) % 40;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity }}>
      <svg width={W} height={H}>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={W} height={H} filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

/** Halftone dots that fade out toward one corner. */
export const Halftone: React.FC<{ color?: string; opacity?: number; origin?: string }> = ({ color = C.ink, opacity = 0.18, origin = "0% 100%" }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      opacity,
      backgroundImage: `radial-gradient(circle, ${color} 2.2px, transparent 2.8px)`,
      backgroundSize: "14px 14px",
      WebkitMaskImage: `radial-gradient(ellipse at ${origin}, black 0%, transparent 62%)`,
      maskImage: `radial-gradient(ellipse at ${origin}, black 0%, transparent 62%)`,
    }}
  />
);

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.45 }) => (
  <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,${strength}) 100%)` }} />
);

// ---------- duotone grade for stock footage (ink shadows, a palette colour in the highlights) ----------
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
export const DuotoneDefs: React.FC = () => {
  const mk = (id: string, shadow: string, light: string) => {
    const s = hex(shadow), l = hex(light);
    return (
      <filter key={id} id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues={`${s[0]} ${l[0]}`} />
          <feFuncG type="table" tableValues={`${s[1]} ${l[1]}`} />
          <feFuncB type="table" tableValues={`${s[2]} ${l[2]}`} />
        </feComponentTransfer>
      </filter>
    );
  };
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      {mk("duo-saffron", C.ink, C.saffron)}
      {mk("duo-red", C.ink, "#E7B7A6")}
      {mk("duo-green", C.ink, "#B9C29A")}
    </svg>
  );
};

export const Broll: React.FC<{ src: string; grade: "duo-saffron" | "duo-red" | "duo-green"; startFrom?: number; scaleFrom?: number; scaleTo?: number; dur: number; opacity?: number; objectPosition?: string }> = ({
  src, grade, startFrom = 0, scaleFrom = 1.06, scaleTo = 1.16, dur, opacity = 1, objectPosition = "50% 50%",
}) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, dur], [scaleFrom, scaleTo], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity }}>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        startFrom={startFrom}
        style={{ width: W, height: H, objectFit: "cover", objectPosition, filter: `url(#${grade}) contrast(1.08)`, transform: `scale(${s})` }}
      />
    </AbsoluteFill>
  );
};

// ---------- chit bubble shape wipe: the new scene shows through a growing speech bubble ----------
export const BubbleReveal: React.FC<{ color: string; frames?: number; id: string }> = ({ color, frames = 16, id }) => {
  const frame = useCurrentFrame();
  if (frame >= frames) return null;
  const t = interpolate(frame, [0, frames], [0, 1], { easing: easeWipe, extrapolateRight: "clamp" });
  const s = interpolate(t, [0, 1], [0.4, 50]);
  const rot = interpolate(t, [0, 1], [-8, 0]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={W} height={H}>
        <defs>
          <mask id={`m-${id}`}>
            <rect width={W} height={H} fill="white" />
            <g transform={`translate(${W / 2} ${H / 2}) rotate(${rot}) scale(${s}) translate(-36 -32)`}>
              <path d={BUBBLE_PATH} fill="black" />
            </g>
          </mask>
        </defs>
        <rect width={W} height={H} fill={color} mask={`url(#m-${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

// ---------- camera: one eased move per scene ----------
export const Cam: React.FC<{ dur: number; from?: { s?: number; x?: number; y?: number }; to?: { s?: number; x?: number; y?: number }; children: React.ReactNode; origin?: string }> = ({
  dur, from = {}, to = {}, children, origin = "50% 50%",
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, dur], [0, 1], { easing: easeInOut, extrapolateRight: "clamp" });
  const lerp = (a = 0, b = 0) => a + (b - a) * t;
  const s = 1 + lerp((from.s ?? 1) - 1, (to.s ?? 1) - 1);
  return <AbsoluteFill style={{ transform: `translate(${lerp(from.x, to.x)}px, ${lerp(from.y, to.y)}px) scale(${s})`, transformOrigin: origin }}>{children}</AbsoluteFill>;
};

// ---------- a product plane with depth: rounded frame, layered shadow ----------
export const Plane: React.FC<{ x: number; y: number; w: number; h: number; children: React.ReactNode; rotY?: number; rotX?: number; z?: number; radius?: number; shadow?: number }> = ({
  x, y, w, h, children, rotY = 0, rotX = 0, z = 0, radius = 28, shadow = 1,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `perspective(2600px) rotateY(${rotY}deg) rotateX(${rotX}deg) translateZ(${z}px)`, transformStyle: "preserve-3d" }}>
    <div
      style={{
        position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", background: C.parchment,
        boxShadow: `0 ${60 * shadow}px ${120 * shadow}px -${20 * shadow}px rgba(0,0,0,0.6), 0 ${14 * shadow}px ${30 * shadow}px rgba(0,0,0,0.35), 0 0 0 3px rgba(242,233,216,0.18)`,
      }}
    >
      {children}
    </div>
  </div>
);

/** Plays a recorded clip inside a Plane, with a zoom and offset so the part that matters fills the frame. */
export const ClipView: React.FC<{ src: string; w: number; h: number; zoom: number; cx: number; cy: number; startFrom?: number; rate?: number; srcW: number; srcH: number }> = ({ src, w, h, zoom, cx, cy, startFrom = 0, rate = 1, srcW, srcH }) => {
  // cx, cy: the point of the source (0 to 1) that sits at the middle of the plane
  const base = Math.max(w / srcW, h / srcH) * zoom;
  const vw = srcW * base, vh = srcH * base;
  return (
    <div style={{ position: "absolute", width: vw, height: vh, left: w / 2 - cx * vw, top: h / 2 - cy * vh }}>
      <OffthreadVideo src={staticFile(src)} muted startFrom={startFrom} playbackRate={rate} style={{ width: "100%", height: "100%", display: "block", objectFit: "fill" }} />
    </div>
  );
};

// ---------- kinetic type ----------
export const Words: React.FC<{ text: string; size: number; color: string; start?: number; stagger?: number; weight?: number; font?: string; lineHeight?: number; maxWidth?: number; align?: "left" | "center" }> = ({
  text, size, color, start = 0, stagger = 6, weight = 700, font = FONT_DISPLAY, lineHeight = 1.04, maxWidth, align = "left",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: `0 ${size * 0.26}px`, fontFamily: font, fontWeight: weight, fontSize: size, lineHeight, color, maxWidth, justifyContent: align === "center" ? "center" : "flex-start", letterSpacing: "-0.015em" }}>
      {words.map((w, i) => {
        const p = spring({ frame: frame - start - i * stagger, fps, config: { damping: 16, stiffness: 140, mass: 0.7 } });
        return (
          <span key={i} style={{ display: "inline-block", opacity: interpolate(p, [0, 0.5, 1], [0, 1, 1]), transform: `translateY(${(1 - p) * size * 0.55}px) rotate(${(1 - p) * 3}deg)` }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** In-flow version of Fade: keeps its place in the layout. */
export const FadeBlock: React.FC<{ children: React.ReactNode; from: number; inF?: number }> = ({ children, from, inF = 10 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [from, from + inF], [0, 1], { easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ opacity: o }}>{children}</div>;
};

/** Fades a block in over the scene start and out before the end (frames are scene relative). */
export const Fade: React.FC<{ children: React.ReactNode; from: number; to: number; inF?: number; outF?: number }> = ({ children, from, to, inF = 8, outF = 8 }) => {
  const frame = useCurrentFrame();
  const out = Math.max(outF, 1);
  const end = Math.max(to, from + inF + out + 2); // a fade that would start after its scene ends just never shows
  const o = interpolate(frame, [from, from + inF, end - out, end], [0, 1, 1, outF === 0 ? 1 : 0], { easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export { FPS };
