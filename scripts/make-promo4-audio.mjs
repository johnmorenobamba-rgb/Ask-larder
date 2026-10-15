// Promo v4 soundtrack: score, sound effects, reserved voiceover ducking and the master, synthesised with no
// dependencies and no licensed audio, from the same timeline the picture uses (remotion/promo4/timeline.ts).
// Spec: research/video-v3/sound.md. Run: node scripts/make-promo4-audio.mjs
// Writes: remotion/public-promo4/audio/promo4-mix.wav (the film's audio, no voice), out/v4/stems/{music,sfx,vo,mix-guide}.wav,
// and out/v4/qa/sound-cues.json (the manifest the audit reads).
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { b, BEAT, FPS, TOTAL, CUE, VO, sfxCues, WHOOSH_APEX, ACT, HOLD, CUT, CUT_TOTAL } from "../remotion/promo4/timeline.ts";

const SR = 48000;
const SPF = SR / FPS; // 1600 samples per frame
let N = TOTAL * SPF; // let: the 30 s cutdown is mastered at its own length at the end of this file
const at = (f) => Math.round(f * SPF);
const TWO_PI = Math.PI * 2;
const db = (d) => 10 ** (d / 20);
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

// ---------------------------------------------------------------- determinism
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const rng = (seed) => { let a = fnv(String(seed)); return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// ---------------------------------------------------------------- buffers and mixing
const stereo = () => ({ L: new Float64Array(N), R: new Float64Array(N) });
const panLR = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];
function add(bus, start, x, gain = 1, pan = 0) {
  const [gl, gr] = panLR(pan);
  const fade = Math.min(288, x.length); // 6 ms cos^2 fade on the voice's tail so nothing clicks
  for (let i = 0; i < x.length; i++) {
    const j = start + i;
    if (j < 0 || j >= N) continue;
    let v = x[i] * gain;
    const k = x.length - 1 - i;
    if (k < fade) v *= Math.sin((k / fade) * Math.PI / 2) ** 2;
    bus.L[j] += v * gl; bus.R[j] += v * gr;
  }
}
const voice = (sec) => new Float64Array(Math.max(1, Math.round(sec * SR)));

// ---------------------------------------------------------------- filters
const onePoleLP = (x, fc) => { const a = 1 - Math.exp((-TWO_PI * fc) / SR); let y = 0; for (let i = 0; i < x.length; i++) x[i] = y += a * (x[i] - y); return x; };
const onePoleHP = (x, fc) => { const a = 1 - Math.exp((-TWO_PI * fc) / SR); let y = 0; for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = x[i] - y; } return x; };
function biquad(type, fc, Q = 0.707, gainDb = 0) {
  const w = (TWO_PI * fc) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * Q), A = 10 ** (gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === "bp") { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; } // peaking
  const k = [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  return (x) => { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = k[0] * x[i] + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; x[i] = v; } return x; };
}
const both = (bus, fn) => { fn(bus.L); fn(bus.R); return bus; };

// ---------------------------------------------------------------- the arrangement map (bars, from the brief)
const SECT = [
  { id: "hook", from: 1, to: 3, kind: "hook" },
  { id: "pain1", from: 4, to: 6, kind: "pain" },
  { id: "sol1", from: 7, to: 12, kind: "sol" },
  { id: "pain2", from: 13, to: 14, kind: "pain" },
  { id: "sol2", from: 15, to: 21, kind: "payoff" },
  { id: "pain3", from: 22, to: 23, kind: "pain" },
  { id: "sol3", from: 24, to: 27, kind: "sol3" },
  { id: "urgency", from: 28, to: 30, kind: "urgency" },
  { id: "cta", from: 31, to: 32, kind: "cta" },
];
const sectionOf = (bar) => SECT.find((s) => bar >= s.from && bar <= s.to);
// chords: one or two per bar (two = the bar splits at beat 2). Voicings from sound.md 2.2 (MIDI)
const V = {
  Fmaj9: { rh: [57, 60, 64, 67], root: 41, pad: [53, 60, 69] },
  Am7: { rh: [55, 60, 64, 69], root: 45, pad: [57, 64, 72] },
  Bbmaj9: { rh: [57, 60, 62, 65], root: 46, pad: [53, 58, 62] },
  C9sus4: { rh: [58, 60, 62, 65], root: 48, pad: [55, 60, 65] },
  Dm9: { rh: [57, 60, 64, 65], root: 50, pad: [50, 57, 65] },
  Bbmaj7s11: { rh: [57, 62, 64, 65], root: 46, pad: [53, 58, 62] },
  Gm9: { rh: [58, 62, 65, 69], root: 43, pad: [55, 62, 70] },
  CoverE: { rh: [55, 60, 64, 67], root: 52, pad: [55, 60, 64] },
  Bbmaj9overF: { rh: [62, 65, 69, 72], root: 41, pad: [53, 58, 65] },
};
const CHORDS = {
  1: ["Dm9"], 2: ["Dm9"], 3: ["Gm9", "C9sus4"],
  4: ["Dm9"], 5: ["Bbmaj7s11"], 6: ["C9sus4"],
  7: ["Fmaj9"], 8: ["Am7"], 9: ["Bbmaj9"], 10: ["Fmaj9"], 11: ["Gm9"], 12: ["C9sus4"],
  13: ["Dm9"], 14: ["Bbmaj7s11", "C9sus4"],
  15: ["Fmaj9"], 16: ["Am7"], 17: ["Bbmaj9"], 18: ["Fmaj9"], 19: ["Am7", "Dm9"], 20: ["Bbmaj9"], 21: ["Gm9", "C9sus4"],
  22: ["Dm9"], 23: ["Bbmaj7s11", "C9sus4"],
  24: ["Fmaj9"], 25: ["Am7"], 26: ["Bbmaj9"], 27: ["Gm9", "C9sus4"],
  28: ["Dm9", "CoverE"], 29: ["Fmaj9", "Gm9"], 30: ["Am7", "Bbmaj9"],
  31: ["Fmaj9"], 32: ["Bbmaj9overF"],
};
const LIFTS = [7, 15, 24]; // pain to solution: the breath, then the resolved chord
const STOP = CUE.musicStop; // urgency stops dead one 8th before the close
const CTA_END = b(33, 1); // the music fades out on this frame; one beat of air before the resolve
const RESOLVE = CUE.wordmark;
const inVO = (f) => VO.some((v) => f >= v.from - 5 && f <= v.to + 4);
const BEAT_S = BEAT * SPF; // 25600 samples

// ---------------------------------------------------------------- instruments
function rhodes(midi, vel, durSec, seed, tine = 1, detuneCents = 0) {
  const f = midiHz(midi) * 2 ** (detuneCents / 1200);
  const ks = Math.sqrt(261.63 / f);
  const len = durSec + 1.4;
  const x = voice(len);
  let pc = 0, pm1 = 0, pc2 = 0, pm14 = 0;
  const off = durSec * SR;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const Ib = vel * (1.1 * Math.exp(-t / 0.35) + 0.35) * ks;
    const It = vel * 2.0 * tine * Math.exp(-t / 0.03) * ks;
    pc += (TWO_PI * f) / SR; pm1 += (TWO_PI * (f + 0.15)) / SR; pc2 += (TWO_PI * f) / SR; pm14 += (TWO_PI * 14 * f) / SR;
    const body = Math.sin(pc + Ib * Math.sin(pm1));
    const tn = Math.sin(pc2 + It * Math.sin(pm14));
    let amp = (1 - Math.exp(-t / 0.0015)) * (0.65 * Math.exp(-t / (1.4 * ks ** 0.7)) + 0.35 * Math.exp(-t / 0.22));
    if (i > off) amp *= Math.exp(-(i - off) / SR / 0.16);
    let y = amp * vel ** 1.4 * (body + 0.35 * tn);
    y = y + 0.08 * y * y; // the tine bark
    x[i] = y;
  }
  return onePoleHP(x, 20);
}
const polyblep = (t, dt) => (t < dt ? ((t /= dt), 2 * t - t * t - 1) : t > 1 - dt ? ((t = (t - 1) / dt), t * t + 2 * t + 1) : 0);
function padVoice(midi, durSec, attack, seed) {
  const f = midiHz(midi);
  const rel = 1.2;
  const x = voice(durSec + rel);
  const r = rng(seed);
  let p1 = r(), p2 = r(), ps = 0;
  const f1 = f * 2 ** (7 / 1200), f2 = f * 2 ** (-7 / 1200);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const d1 = f1 / SR, d2 = f2 / SR;
    p1 += d1; if (p1 >= 1) p1 -= 1; p2 += d2; if (p2 >= 1) p2 -= 1; ps += (TWO_PI * f) / SR;
    const saw = 2 * p1 - 1 - polyblep(p1, d1) + 2 * p2 - 1 - polyblep(p2, d2);
    const env = Math.min(1, t / attack) * (t > durSec ? Math.exp(-(t - durSec) / (rel / 3)) : 1);
    x[i] = env * (0.5 * saw + 0.5 * Math.sin(ps));
  }
  return x;
}
function sub(midi, durSec) {
  const f = midiHz(midi);
  const x = voice(durSec + 0.3);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TWO_PI * f) / SR;
    const env = Math.min(1, t / 0.008) * (t > durSec ? Math.exp(-(t - durSec) / 0.12) : 1);
    x[i] = Math.tanh(1.8 * env * (Math.sin(ph) + 0.25 * Math.sin(2 * ph))) / Math.tanh(1.8);
  }
  return onePoleLP(x, 240);
}
function kick(seed) {
  const x = voice(0.45);
  const r = rng(seed);
  let ph = 0, nz = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TWO_PI * (43.65 + 70 * Math.exp(-t / 0.03))) / SR;
    nz += 0.25 * ((r() * 2 - 1) - nz);
    x[i] = Math.sin(ph) * Math.exp(-t / 0.16) + db(-18) * nz * Math.exp(-t / 0.0015);
  }
  return x;
}
function modal(modes, len, excite, seed) {
  const x = voice(len);
  const r = rng(seed);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [f, tau, g] of modes) v += g * Math.sin(TWO_PI * f * t) * Math.exp(-t / tau);
    if (t < excite) v += (r() * 2 - 1) * 0.5 * (1 - t / excite);
    x[i] = v;
  }
  return x;
}
const rim = (seed) => onePoleHP(modal([[1650, 0.005, 1], [820, 0.01, 0.6], [3300, 0.0025, 0.25]], 0.08, 0.0003, seed), 400);
function shaker(accent, seed) {
  const x = voice(0.12);
  const r = rng(seed);
  const tau = accent > 0.9 ? 0.045 : 0.03;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] = (r() * 2 - 1) * Math.min(1, t / 0.004) * Math.exp(-t / tau);
  }
  return biquad("hp", 3000, 0.7)(biquad("bp", 5500, 0.7)(x));
}
function clockTick(tock) {
  const f = tock ? 1046.5 : 1396.9;
  return modal([[f, tock ? 0.012 : 0.01, 1], [f * 2.76, 0.003, db(tock ? -16 : -10)], [f * 5.4, 0.0015, db(tock ? -24 : -18)]], 0.08, 0.0005, tock ? "tock" : "tick");
}

// ---------------------------------------------------------------- effects (sound.md section 3), each with its anchor sample
function fmNote(f, len, idx0, tauI, tau) {
  const x = voice(len);
  let pc = 0, pm = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    pc += (TWO_PI * f) / SR; pm += (TWO_PI * 2 * f) / SR;
    const att = t < 0.0015 ? 0.5 - 0.5 * Math.cos((Math.PI * t) / 0.0015) : 1;
    x[i] = att * Math.exp(-t / tau) * Math.sin(pc + (idx0 * Math.exp(-t / tauI) + 0.15) * Math.sin(pm)) + db(-24) * Math.sin(TWO_PI * 2.76 * f * t) * Math.exp(-t / 0.02);
  }
  return x;
}
function ping(semi = 0) {
  const k = 2 ** (semi / 12);
  const a = fmNote(1046.5 * k, 0.5, 1.2, 0.06, 0.14), c = fmNote(1396.9 * k, 0.5, 1.2, 0.06, 0.14);
  const x = voice(0.6);
  const o = Math.round(0.08 * SR);
  for (let i = 0; i < a.length; i++) x[i] += a[i];
  for (let i = 0; i < c.length && i + o < x.length; i++) x[i + o] += 0.9 * c[i];
  return { x: onePoleLP(biquad("hp", 400)(x), 7000), anchor: 0 };
}
function buzz(seed) {
  const r = rng(seed);
  const x = voice(0.62);
  let ph = 0;
  const pulses = [[0, 0.22], [0.34, 0.56]];
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const p = pulses.find(([s, e]) => t >= s && t < e);
    if (!p) continue;
    const tp = t - p[0], te = p[1] - t;
    const env = Math.min(1, tp / 0.012) * Math.min(1, te / 0.025);
    ph += (TWO_PI * (160 + 12 * (1 - Math.exp(-tp / 0.04)))) / SR;
    const motor = Math.tanh(3 * Math.sin(ph)) / Math.tanh(3);
    const rattle = Math.sin(ph) > 0.7 ? (r() * 2 - 1) * db(-18) : 0;
    x[i] = env * (motor + rattle);
  }
  return { x: onePoleLP(biquad("hp", 120)(x), 4000), anchor: 0 };
}
function key(seed, i) {
  const r = rng(seed);
  const fb = (760 + 180 * r()) * (1 + (r() - 0.5) * 0.024);
  const x = modal([[fb, 0.0026, 1], [2.03 * fb, 0.0012, 0.5], [270, 0.004, 0.6], [3.5 * fb, 0.0004, 0.3]], 0.05, 0.0004, `${seed}x`);
  if (r() < 0.5) { const o = Math.round((0.025 + r() * 0.01) * SR); const y = modal([[fb * 0.7, 0.0026 * 1.2, 1], [270, 0.004, 0.5]], 0.03, 0.0004, `${seed}b`); for (let k = 0; k < y.length && k + o < x.length; k++) x[k + o] += db(-13) * y[k]; }
  return { x: biquad("hp", 300)(x), anchor: 0, gain: db(i === 0 ? 2.5 : -0.3 * Math.min(i, 6)) };
}
function tick(pitchMul = 1) {
  const make = (m, g) => { const f = 2093 * m; const x = voice(0.03); for (let i = 0; i < x.length; i++) { const t = i / SR; const att = Math.min(1, t / 0.0003); x[i] = g * att * Math.exp(-t / 0.0028) * (Math.sin(TWO_PI * f * t) + db(-6) * Math.sin(TWO_PI * 1.5 * f * t) + db(-12) * Math.sin(TWO_PI * 2.2 * f * t)); } return x; };
  const press = make(pitchMul, 1), rel = make(pitchMul * 0.85, db(-9)); // the release is softer than the press, so the tap reads as one event
  const x = voice(0.13);
  for (let i = 0; i < press.length; i++) x[i] += press[i];
  const o = Math.round(0.085 * SR);
  for (let i = 0; i < rel.length; i++) x[i + o] += rel[i];
  const hp = biquad("hp", 600, 0.54), hp2 = biquad("hp", 600, 1.31);
  return { x: hp2(hp(x)), anchor: 0, lead: 480 };
}
function confirm() {
  const t1 = tick();
  const tone = (f) => { const x = voice(0.4); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = Math.min(1, t / 0.004) * Math.exp(-t / 0.09) * (Math.sin(TWO_PI * f * t) + db(-15) * Math.sin(TWO_PI * 2 * f * t)); } return x; };
  const x = voice(0.5);
  void t1; // the tap tick is its own cue on the press; the confirm is only the two tones
  const a = tone(698.5), c = tone(880), o = Math.round(0.06 * SR);
  for (let i = 0; i < a.length; i++) { x[i] += db(-4) * a[i]; if (i + o < x.length) x[i + o] += db(-4) * c[i]; }
  return { x, anchor: 0, lead: 0 };
}
function scanBeep() {
  const x = voice(0.09);
  for (let i = 0; i < x.length; i++) { const t = i / SR; const env = Math.min(1, t / 0.003) * (t > 0.063 ? Math.max(0, 1 - (t - 0.063) / 0.025) : 1); x[i] = env * (Math.sin(TWO_PI * 1760 * t) + db(-18) * Math.sin(TWO_PI * 5280 * t)); }
  return { x: onePoleLP(x, 6000), anchor: 0 };
}
function whoosh(durS, apexFrac, seed, pan0, pan1) {
  const r = rng(seed);
  const x = voice(durS), air = voice(durS);
  let b0 = 0, b1 = 0, b2 = 0, lp = 0;
  for (let i = 0; i < x.length; i++) { const w = r() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; const p = b0 + b1 + b2 + w * 0.1848; lp += 0.23 * (p - lp); x[i] = lp; air[i] = p; }
  // swept band pass (TPT SVF), 180 Hz to 900 Hz at the apex to 260 Hz
  let ic1 = 0, ic2 = 0;
  const tA = apexFrac * durS;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const fc = t < tA ? 180 * (900 / 180) ** (t / tA) : 900 * (260 / 900) ** ((t - tA) / (durS - tA));
    const g = Math.tan((Math.PI * fc) / SR), k = 1 / 0.9, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x[i] - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    const env = t < tA ? (t / tA) ** 2 : Math.exp(-(t - tA) / (0.35 * (1 - apexFrac) * durS));
    x[i] = env * v1;
    air[i] = env ** 3;
  }
  const a = biquad("hp", 3000)(air.map((e, i) => e * (r() * 2 - 1)));
  for (let i = 0; i < x.length; i++) x[i] += db(-20) * a[i];
  return { x, anchor: Math.round(tA * SR), pan: [pan0, pan1] };
}

// ---------------------------------------------------------------- reverbs (FDN) and the delay
function fdn(input, t60, damp = 6000) {
  const D = [1427, 1693, 1951, 2203, 2477, 2741, 3011, 3307];
  const pre = Math.round(0.018 * SR);
  const lines = D.map((d) => new Float64Array(d));
  const idx = new Array(8).fill(0);
  const g = D.map((d) => 10 ** ((-3 * d) / (SR * t60)));
  const a = 1 - Math.exp((-TWO_PI * damp) / SR);
  const lpS = new Array(8).fill(0);
  const out = stereo();
  const inp = onePoleHP(Float64Array.from(input.L, (v, i) => 0.5 * (v + input.R[i])), 250);
  const o = new Array(8);
  for (let n = 0; n < N; n++) {
    for (let k = 0; k < 8; k++) o[k] = lines[k][idx[k]];
    // Hadamard 8 (fast Walsh) mixing, normalised
    const h = o.slice();
    for (let s = 1; s < 8; s <<= 1) for (let i = 0; i < 8; i += s << 1) for (let j = i; j < i + s; j++) { const u = h[j], v = h[j + s]; h[j] = u + v; h[j + s] = u - v; }
    const x = n - pre >= 0 ? inp[n - pre] : 0;
    for (let k = 0; k < 8; k++) {
      lpS[k] += a * (h[k] / Math.sqrt(8) * g[k] - lpS[k]);
      lines[k][idx[k]] = x + lpS[k];
      idx[k] = (idx[k] + 1) % D[k];
    }
    out.L[n] = (o[0] + o[2] + o[4] + o[6]) * 0.25;
    out.R[n] = (o[1] + o[3] + o[5] + o[7]) * 0.25;
  }
  return out;
}
function pingPong(input, delay = 19200, fb = 0.32) {
  const out = stereo();
  const bl = new Float64Array(delay), br = new Float64Array(delay);
  let i = 0, ll = 0, lr = 0;
  const a = 1 - Math.exp((-TWO_PI * 3000) / SR);
  for (let n = 0; n < N; n++) {
    const yl = bl[i], yr = br[i];
    ll += a * (yr - ll); lr += a * (yl - lr);
    bl[i] = input.L[n] + 0.5 * input.R[n] + fb * ll;
    br[i] = fb * lr;
    out.L[n] = yl; out.R[n] = yr;
    i = (i + 1) % delay;
  }
  return out;
}

// ---------------------------------------------------------------- score
const rh = stereo(), pad = stereo(), subB = stereo(), drums = stereo(), sfx = stereo();
const TAPS = sfxCues().filter((c) => c.kind === "tick" || c.kind === "confirm").map((c) => c.frame);
const nearTap = (start) => TAPS.some((f) => Math.abs(start / SPF - f) <= 3.2);
const addDrum = (bus, start, x, g, pan) => { if (!nearTap(start)) add(bus, start, x, g, pan); };
const rhDelaySend = stereo();
const GAIN = { hook: 0.46, pain: 0.44, sol: 0.85, payoff: 0.95, sol3: 0.84, urgency: 0.84, cta: 0.6 };
const PADCUT = { hook: [500, 800], pain: [650, 650], sol: [1400, 1400], payoff: [1400, 2400], sol3: [2000, 2000], urgency: [1800, 3200], cta: [900, 900] };
const padCutAt = new Float64Array(N);
const secGain = new Float64Array(N).fill(0);

for (let bar = 1; bar <= 32; bar++) {
  const sec = sectionOf(bar);
  const kind = sec.kind;
  const g = GAIN[kind];
  const barStart = at(b(bar));
  const chords = CHORDS[bar];
  const half = chords.length === 2;
  for (let i = 0; i < 4 * BEAT_S; i++) {
    const j = barStart + i; if (j >= N) break;
    secGain[j] = g;
    const [c0, c1] = PADCUT[kind];
    const u = (bar - sec.from + i / (4 * BEAT_S)) / (sec.to - sec.from + 1);
    padCutAt[j] = c0 * (c1 / c0) ** u;
  }
  chords.forEach((name, ci) => {
    const v = V[name];
    const beat0 = half ? ci * 2 : 0;
    const beats = half ? 2 : 4;
    const start = at(b(bar, beat0));
    const durS = (beats * BEAT_S) / SR;
    const hold = b(bar, beat0) >= HOLD.from && b(bar, beat0) < HOLD.to;
    const vo = inVO(b(bar, beat0));
    // Rhodes
    const strum = (k) => Math.round((k === 0 ? 0 : 5 + 5 * (k - 1)) * SR / 1000);
    const vel = kind === "pain" || kind === "hook" ? 0.4 : kind === "cta" ? 0.4 : kind === "urgency" ? 0.35 : 0.52;
    if (kind === "urgency") {
      for (let e = 0; e < beats; e++) v.rh.forEach((m, k) => add(rh, at(b(bar, beat0 + e, 2)) + strum(k), rhodes(m, vel, 0.18, `u${bar}${e}${k}`), 0.18, k % 2 ? 0.2 : -0.2));
    } else {
      v.rh.forEach((m, k) => {
        add(rh, start + strum(k), rhodes(m, vel, durS * 0.95, `r${bar}${ci}${k}`), 0.13, -0.2);
        add(rh, start + strum(k) + 24, rhodes(m, vel * 0.96, durS * 0.95, `r${bar}${ci}${k}d`, 1, 3), 0.13, 0.2);
      });
      if ((kind === "sol" || kind === "payoff" || kind === "sol3") && !hold && !vo && !half) {
        // comp: a softer restrike of the top two notes on beat 2.5
        v.rh.slice(2).forEach((m, k) => add(rh, at(b(bar, 2, 2)) + strum(k), rhodes(m, 0.36, 0.5, `c${bar}${k}`), 0.18, k ? 0.2 : -0.2));
      }
      if (kind === "pain") v.rh.slice(2).forEach((m, k) => add(rh, at(b(bar, 2, 2)) + strum(k), rhodes(m, 0.3, 0.6, `p${bar}${k}`), 0.16, k ? 0.2 : -0.2));
    }
    // pad
    const attack = kind === "pain" ? 0.9 : 0.6;
    v.pad.forEach((m, k) => add(pad, start, padVoice(m, durS + 0.35, attack, `pad${bar}${ci}${k}`), 0.09, [-0.3, 0, 0.3][k]));
    // sub (enters at bar 3 in the hook; a held pedal in the pains)
    if (bar >= 3) add(subB, start, sub(v.root - 12 >= 28 ? v.root - 12 : v.root, durS * 0.98), 0.32);
  });
  // drums
  const beatsIn = [0, 1, 2, 3];
  const sayHold = (beat) => b(bar, beat) >= HOLD.from && b(bar, beat) < HOLD.to;
  if (kind === "payoff" || kind === "sol3" || kind === "urgency") {
    const kicks = kind === "payoff" ? [0, 2.5] : kind === "sol3" ? [0] : [0, 2];
    kicks.forEach((k) => add(drums, at(b(bar, Math.floor(k), (k % 1) * 4)), kick(`k${bar}${k}`), 0.42));
  }
  if (kind === "sol" || kind === "payoff" || kind === "sol3") {
    if (!sayHold(2)) addDrum(drums, at(b(bar, 2)), rim(`rim${bar}`), 0.22, 0.1);
    const sixteenths = kind === "sol" ? [0, 2] : [0, 1, 2, 3];
    const acc = [1.0, 0.42, 0.68, 0.5];
    beatsIn.forEach((bt) => sixteenths.forEach((s) => {
      const f = b(bar, bt, s);
      if (sayHold(bt) || (inVO(f) && s % 2)) return;
      const swing = s % 2 ? 1024 : 0;
      addDrum(drums, at(f) + swing, shaker(acc[s], `sh${bar}${bt}${s}`), (kind === "sol" ? db(-4) : 1) * 0.07 * acc[s], 0.2);
    }));
  }
  if (kind === "urgency") {
    [1, 3].forEach((bt) => addDrum(drums, at(b(bar, bt)), rim(`urim${bar}${bt}`), 0.2, 0.1));
    beatsIn.forEach((bt) => [0, 1, 2, 3].forEach((s) => add(drums, at(b(bar, bt, s)) + (s % 2 ? 1024 : 0), shaker([1, 0.42, 0.68, 0.5][s], `ush${bar}${bt}${s}`), 0.06 * [1, 0.42, 0.68, 0.5][s], 0.2)));
    beatsIn.forEach((bt) => add(drums, at(b(bar, bt)), clockTick(bt % 2 === 1), 0.12, -0.1));
  }
}
// the logo resolve: Fadd9 strummed, the 1 5 9 motif on the tine, a soft sub (sound.md 3.9)
[41, 48, 57, 67, 72].forEach((m, k) => add(rh, at(RESOLVE) + Math.round((8 * k * SR) / 1000), rhodes(m, 0.5, 2.0, `res${k}`), 0.22, [-0.25, -0.1, 0, 0.1, 0.25][k]));
[[77, 0], [84, 0.5], [91, 1.5]].forEach(([m, bt], k) => add(rh, at(RESOLVE) + Math.round(bt * BEAT_S), rhodes(m, 0.42, 0.8, `mot${k}`, 1.6), 0.13, k * 0.15 - 0.15));
add(subB, at(RESOLVE), (() => { const x = voice(2.6); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = Math.min(1, t / 0.03) * Math.exp(-t / 0.9) * Math.sin(TWO_PI * 43.65 * t); } return x; })(), 0.28);

// ---------------------------------------------------------------- buses, the lifts, the stop, sidechain
both(rh, biquad("hp", 110));
both(rh, (x) => onePoleLP(x, 5500));
both(rh, (x) => { for (let i = 0; i < x.length; i++) x[i] = Math.tanh(1.3 * x[i]) / Math.tanh(1.3); return x; });
// pad: time varying low pass (TPT state variable), slow movement, the reserved -2 dB at 2.5 kHz for a voice
for (const ch of [pad.L, pad.R]) {
  let ic1 = 0, ic2 = 0, g = 0, a1 = 0, a2 = 0, a3 = 0;
  for (let i = 0; i < N; i++) {
    if (i % 32 === 0) { const fc = Math.max(200, (padCutAt[i] || 700) * (1 + 0.06 * Math.sin(TWO_PI * 0.11 * (i / SR)))); g = Math.tan((Math.PI * fc) / SR); const k = 1 / 0.65; a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; }
    const v3 = ch[i] - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; ch[i] = v2;
  }
}
both(pad, biquad("hp", 170));
both(pad, biquad("peak", 2500, 0.8, -2));
// section level and envelopes
const env = new Float64Array(N).fill(1);
const rc = (u) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));
for (const bar of LIFTS) { // the breath: down to -30 dB over 40 ms from the last 8th of the pain, back on the downbeat
  const s = at(b(bar) - 8), e = at(b(bar));
  for (let i = s; i < e; i++) env[i] = Math.min(env[i], 1 - (1 - db(-30)) * rc((i - s) / (0.04 * SR)));
}
for (let i = at(STOP); i < at(b(31)); i++) env[i] = Math.min(env[i], 1 - rc((i - at(STOP)) / (0.03 * SR))); // dead stop, one 8th of air
for (let i = at(CTA_END) - Math.round(0.06 * SR); i < N; i++) env[i] = Math.min(env[i], 1 - rc((i - (at(CTA_END) - 0.06 * SR)) / (0.06 * SR))); // music out before the resolve
const side = new Float64Array(N).fill(1); // the kick breathes the Rhodes and pad by 2 dB
for (let i = 0; i < N; i++) {
  // reconstructed from the drum bus energy below 120 Hz would be costlier; use the kick times instead
}
const kickTimes = [];
for (let bar = 15; bar <= 30; bar++) { const k = sectionOf(bar).kind; (k === "payoff" ? [0, 2.5] : k === "sol3" ? [0] : k === "urgency" ? [0, 2] : []).forEach((x) => kickTimes.push(at(b(bar, Math.floor(x), (x % 1) * 4)))); }
for (const t0 of kickTimes) for (let i = t0; i < Math.min(N, t0 + 0.6 * SR); i++) { const u = (i - t0) / SR; const dip = u < 0.005 ? u / 0.005 : Math.exp(-(u - 0.005) / 0.12); side[i] = Math.min(side[i], 1 - (1 - db(-2)) * dip); }
const music = stereo();
for (let i = 0; i < N; i++) {
  const resolveOK = i >= at(RESOLVE) - 2;
  const g = resolveOK ? 1 : secGain[i] * env[i];
  music.L[i] = g * side[i] * (rh.L[i] + pad.L[i]) + g * (subB.L[i] + drums.L[i]);
  music.R[i] = g * side[i] * (rh.R[i] + pad.R[i]) + g * (subB.R[i] + drums.R[i]);
}
// sends: the Rhodes delay and the hall on the music
for (let i = 0; i < N; i++) { const kind = sectionOf(Math.min(32, Math.floor(i / (4 * BEAT_S)) + 1))?.kind; const s = db(kind === "pain" ? -12 : -16); rhDelaySend.L[i] = rh.L[i] * s * secGain[i] * env[i]; rhDelaySend.R[i] = rh.R[i] * s * secGain[i] * env[i]; }
const dly = pingPong(rhDelaySend);
const hallIn = stereo();
for (let i = 0; i < N; i++) { hallIn.L[i] = music.L[i] * db(-14) + dly.L[i] * db(-14); hallIn.R[i] = music.R[i] * db(-14) + dly.R[i] * db(-14); }
const hall = fdn(hallIn, 2.4);
for (let i = 0; i < N; i++) { music.L[i] += dly.L[i] + hall.L[i]; music.R[i] += dly.R[i] + hall.R[i]; }

// ---------------------------------------------------------------- effects, placed on exact samples
const manifest = [];
const place = (id, kind, f, v, gain, pan = 0) => {
  const lead = v.lead ?? 0;
  const start = at(f) - v.anchor - lead;
  if (v.pan) { // a travelling pan: render the two halves with the pan moving
    const [p0, p1] = v.pan;
    const [l0, r0] = panLR(p0), [l1, r1] = panLR(p1);
    for (let i = 0; i < v.x.length; i++) { const j = start + i; if (j < 0 || j >= N) continue; const u = i / v.x.length; sfx.L[j] += v.x[i] * gain * (l0 + (l1 - l0) * u); sfx.R[j] += v.x[i] * gain * (r0 + (r1 - r0) * u); }
  } else add(sfx, start, v.x, gain * (v.gain ?? 1), pan);
  manifest.push({ id, kind, f, expectedSample: at(f), anchor: v.anchor, lead, startSample: start, lengthSamples: v.x.length, gainDb: 20 * Math.log10(gain * (v.gain ?? 1)) });
};
const LEVEL = { ping: db(-9), buzz: db(-12), key: db(-13), tick: db(-10), roll: db(-21), confirm: db(-12), scan: db(-15), whoosh: db(-15) };
let keyIndex = 0, lastKeyF = -99, lastKept = -99;
const keyRuns = []; // [firstKeyFrame, lastKeyFrame] of each run of sounded keys, for the typing duck
const CUES = sfxCues().filter((c) => { if (c.kind !== "key") return true; if (c.frame - lastKept >= 3) { lastKept = c.frame; return true; } return false; });
for (const c of CUES) {
  const id = `${c.kind}@${c.frame}`;
  if (c.kind === "ping") place(id, c.kind, c.frame, ping(c.pitch ?? 0), LEVEL.ping * (c.gain ?? 1));
  else if (c.kind === "buzz") place(id, c.kind, c.frame, buzz(id), LEVEL.buzz);
  else if (c.kind === "key") { if (c.frame - lastKeyF > 8) keyRuns.push([c.frame, c.frame]); else keyRuns[keyRuns.length - 1][1] = c.frame; keyIndex = c.frame - lastKeyF > 8 ? 0 : keyIndex + 1; lastKeyF = c.frame; place(id, c.kind, c.frame, key(id, keyIndex), LEVEL.key, 0.05); }
  else if (c.kind === "tick") place(id, c.kind, c.frame, tick(), LEVEL.tick);
  else if (c.kind === "roll") place(id, c.kind, c.frame, tick(1.5), LEVEL.roll);
  else if (c.kind === "confirm") place(id, c.kind, c.frame, confirm(), LEVEL.confirm);
  else if (c.kind === "scan") place(id, c.kind, c.frame, scanBeep(), LEVEL.scan);
  // "resolve" is the music's own event (the Fadd9 at RESOLVE); "thud" is not used (no Stamp in this film)
}
place("whoosh@pull", "whoosh", WHOOSH_APEX.pull, whoosh(0.9, 0.45, "w1", 0.4, -0.2), LEVEL.whoosh);
place("whoosh@whip", "whoosh", WHOOSH_APEX.whip, whoosh(0.5, 0.7, "w2", -0.1, 0.1), LEVEL.whoosh);
{ // the music ducks 10 dB under a run of 3 or more sounded keys, 3 dB under the phone buzz (sound.md 3.2, 3.3)
  const d = new Float64Array(N).fill(1);
  const dip = (s, e, depth, rel) => { for (let i = Math.max(0, s - Math.round(0.03 * SR)); i < Math.min(N, e + rel * SR); i++) { const u = i < s ? 1 - (s - i) / (0.03 * SR) : i > e ? 1 - (i - e) / (rel * SR) : 1; d[i] = Math.min(d[i], 1 - (1 - db(depth)) * rc(u)); } };
  for (const [a, z] of keyRuns) if (CUES.filter((c) => c.kind === "key" && c.frame >= a && c.frame <= z).length >= 3) dip(at(a), at(z) + Math.round(0.05 * SR), -10, 0.25);
  for (const c of CUES.filter((c) => c.kind === "buzz")) dip(at(c.frame), at(c.frame) + Math.round(0.62 * SR), -3, 0.15);
  for (let i = 0; i < N; i++) { music.L[i] *= d[i]; music.R[i] *= d[i]; }
}
const roomIn = stereo();
for (let i = 0; i < N; i++) { roomIn.L[i] = sfx.L[i] * db(-20); roomIn.R[i] = sfx.R[i] * db(-20); }
const room = fdn(roomIn, 0.7);
for (let i = 0; i < N; i++) { sfx.L[i] += room.L[i]; sfx.R[i] += room.R[i]; }

// ---------------------------------------------------------------- voiceover reservation: the duck (applied only when a voice is present)
function duckEnvelope() {
  const d = new Float64Array(N).fill(0); // 0 = no duck, 1 = full duck
  const spans = [];
  for (const v of VO) {
    const s = at(v.from) - Math.round(0.15 * SR), e = at(v.to) + Math.round(0.12 * SR);
    if (spans.length && s - spans[spans.length - 1][1] < 0.9 * SR) spans[spans.length - 1][1] = e; else spans.push([s, e]);
  }
  for (const [s, e] of spans) {
    for (let i = Math.max(0, s); i < Math.min(N, e + 0.6 * SR); i++) {
      const up = rc((i - s) / (0.12 * SR));
      const down = i > e ? 1 - rc((i - e) / (0.6 * SR)) : 1;
      d[i] = Math.max(d[i], Math.min(up, down));
    }
  }
  return { d, spans };
}
function applyDuck(m, depthDb = -12, carveDb = -5) {
  const { d } = duckEnvelope();
  const carved = { L: biquad("peak", 2500, 0.8, carveDb)(Float64Array.from(m.L)), R: biquad("peak", 2500, 0.8, carveDb)(Float64Array.from(m.R)) };
  const out = stereo();
  for (let i = 0; i < N; i++) { const g = 1 - (1 - db(depthDb)) * d[i]; out.L[i] = g * (m.L[i] * (1 - d[i]) + carved.L[i] * d[i]); out.R[i] = g * (m.R[i] * (1 - d[i]) + carved.R[i] * d[i]); }
  return out;
}
function guideVO() { // a speech shaped placeholder for checking the duck (never shipped)
  const out = stereo();
  for (const v of VO) {
    const r = rng(v.id);
    const s = at(v.from), e = at(v.to);
    let b0 = 0, b1 = 0, b2 = 0, ph = r() * TWO_PI, nextJump = s + (0.35 + r() * 0.25) * SR;
    const x = new Float64Array(e - s);
    for (let i = s; i < e; i++) { const w = r() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; if (i > nextJump) { ph = r() * TWO_PI; nextJump = i + (0.35 + r() * 0.25) * SR; } x[i - s] = (b0 + b1 + b2 + w * 0.1848) * (0.5 + 0.5 * Math.sin(TWO_PI * 4.5 * (i / SR) + ph)); }
    biquad("hp", 300)(x); biquad("lp", 3400)(x); biquad("peak", 1500, 1, 4)(x);
    add(out, s, x, 0.25);
  }
  // the guide voice sits at -16 LUFS over its windows, the level a real read will be gained to (sound.md 5.4)
  const I = integrated(blocks(out, 0.4, 0.1));
  const g = db(-16 - I);
  for (let i = 0; i < N; i++) { out.L[i] *= g; out.R[i] *= g; }
  return out;
}

// ---------------------------------------------------------------- loudness (BS.1770 stereo), true peak, master
const K = (x) => biquad("hp", 38.13547087613982, 0.5003270373238773)(((y) => { // the standard K weighting at 48 kHz, as two fixed biquads
  const b = [1.53512485958697, -2.69169618940638, 1.19839281085285], a = [1, -1.69065929318241, 0.73248077421585];
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0; const o = new Float64Array(y.length);
  for (let i = 0; i < y.length; i++) { const v = b[0] * y[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2; x2 = x1; x1 = y[i]; y2 = y1; y1 = v; o[i] = v; }
  return o;
})(Float64Array.from(x)));
function kw(x) { // exact K weighting second stage at 48 kHz
  const s1 = (() => { const bb = [1.53512485958697, -2.69169618940638, 1.19839281085285], aa = [1, -1.69065929318241, 0.73248077421585]; let x1 = 0, x2 = 0, y1 = 0, y2 = 0; const o = new Float64Array(x.length); for (let i = 0; i < x.length; i++) { const v = bb[0] * x[i] + bb[1] * x1 + bb[2] * x2 - aa[1] * y1 - aa[2] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; o[i] = v; } return o; })();
  const bb = [1, -2, 1], aa = [1, -1.99004745483398, 0.99007225036621]; let x1 = 0, x2 = 0, y1 = 0, y2 = 0; const o = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) { const v = bb[0] * s1[i] + bb[1] * x1 + bb[2] * x2 - aa[1] * y1 - aa[2] * y2; x2 = x1; x1 = s1[i]; y2 = y1; y1 = v; o[i] = v; }
  return o;
}
function blocks(m, blkS, hopS) {
  const kL = kw(m.L), kR = kw(m.R);
  const blk = Math.round(blkS * SR), hop = Math.round(hopS * SR);
  const z = [];
  for (let s = 0; s + blk <= N; s += hop) { let a = 0, c = 0; for (let i = s; i < s + blk; i++) { a += kL[i] * kL[i]; c += kR[i] * kR[i]; } z.push({ t: s / SR, z: a / blk + c / blk }); }
  return z;
}
const LU = (z) => -0.691 + 10 * Math.log10(z);
function integrated(z400) { const abs = z400.filter((b) => LU(b.z) > -70); const rel = LU(abs.reduce((p, b) => p + b.z, 0) / abs.length) - 10; const g = abs.filter((b) => LU(b.z) > rel); return LU(g.reduce((p, b) => p + b.z, 0) / g.length); }
function lra(z3) { const abs = z3.filter((b) => LU(b.z) > -70); const rel = LU(abs.reduce((p, b) => p + b.z, 0) / abs.length) - 20; const st = abs.filter((b) => LU(b.z) > rel).map((b) => LU(b.z)).sort((p, q) => p - q); const pct = (p) => st[Math.min(st.length - 1, Math.floor(p * (st.length - 1)))]; return pct(0.95) - pct(0.1); }
// 4x oversampling true peak: polyphase windowed sinc, 4 phases x 16 taps
const TP_TAPS = (() => { const P = 4, T = 16, h = []; for (let p = 0; p < P; p++) { const row = []; for (let k = 0; k < T; k++) { const n = k - T / 2 + p / P; const sinc = n === 0 ? 1 : Math.sin(Math.PI * n) / (Math.PI * n); const w = 0.5 + 0.5 * Math.cos((Math.PI * n) / (T / 2)); row.push(sinc * w); } h.push(row); } return h; })();
function truePeak(x) { let m = 0; for (let i = 8; i < x.length - 8; i++) { const a = Math.abs(x[i]); if (a > m) m = a; if (a < 0.3 * m) continue; for (let p = 1; p < 4; p++) { let y = 0; for (let k = 0; k < 16; k++) y += x[i - 8 + k] * TP_TAPS[p][k]; if (Math.abs(y) > m) m = Math.abs(y); } } return m; }
function limiter(m, ceiling) { // lookahead peak limiter on the 4x estimate: gain = min(1, ceiling/peak) held over 4 ms, released over 80 ms
  const look = 192, rel = Math.exp(-1 / (0.08 * SR));
  const need = new Float64Array(N);
  for (let i = 0; i < N; i++) { const p = Math.max(Math.abs(m.L[i]), Math.abs(m.R[i])) * 1.04; /* a small margin for inter sample peaks; the 4x meter checks the result */ need[i] = p > ceiling ? ceiling / p : 1; }
  const gmin = new Float64Array(N); // sliding minimum over the lookahead window
  for (let i = 0; i < N; i++) { let v = 1; for (let k = 0; k < look && i + k < N; k += 8) v = Math.min(v, need[i + k]); gmin[i] = v; }
  let g = 1, maxGR = 0, at0 = 0;
  const out = stereo();
  for (let i = 0; i < N; i++) { const t = gmin[i]; g = t < g ? g + (t - g) * 0.2 : t + (g - t) * rel; out.L[i] = m.L[i] * g; out.R[i] = m.R[i] * g; const gr = -20 * Math.log10(g); if (gr > maxGR) { maxGR = gr; at0 = i / SR; } }
  return { out, maxGR, at: at0 };
}
function glue(m) { // bus glue: 2:1 above -16 dBFS RMS, 5 ms detector, 15 ms attack, 120 ms release, at most 2.5 dB
  const thr = db(-16), aA = Math.exp(-1 / (0.015 * SR)), aR = Math.exp(-1 / (0.12 * SR)), aD = Math.exp(-1 / (0.005 * SR));
  let ms = 0, gDb = 0;
  for (let i = 0; i < N; i++) { const v = 0.5 * (m.L[i] * m.L[i] + m.R[i] * m.R[i]); ms = aD * ms + (1 - aD) * v; const lvl = Math.sqrt(ms); const over = lvl > thr ? 20 * Math.log10(lvl / thr) : 0; const want = -Math.min(2.5, over / 2); gDb = want < gDb ? aA * gDb + (1 - aA) * want : aR * gDb + (1 - aR) * want; const g = db(gDb); m.L[i] *= g; m.R[i] *= g; }
  return m;
}
function master(m, target = -14, ceiling = 0.77) {
  both(m, (x) => onePoleHP(x, 20));
  glue(m);
  let gainDb = 0, res;
  for (let pass = 0; pass < 8; pass++) {
    const g = db(gainDb);
    const scaled = { L: Float64Array.from(m.L, (v) => v * g), R: Float64Array.from(m.R, (v) => v * g) };
    res = limiter(scaled, ceiling);
    const I = integrated(blocks(res.out, 0.4, 0.1));
    if (Math.abs(I - target) < 0.05) break;
    gainDb += target - I;
  }
  const o = res.out;
  const fadeIn = Math.round(0.003 * SR);
  for (let i = 0; i < fadeIn; i++) { const g = rc(i / fadeIn); o.L[i] *= g; o.R[i] *= g; }
  const fadeOut = Math.round(1.3 * SR);
  for (let i = N - fadeOut; i < N; i++) { const g = 1 - rc((i - (N - fadeOut)) / fadeOut); o.L[i] *= g; o.R[i] *= g; }
  for (let i = N - 480; i < N; i++) { o.L[i] = 0; o.R[i] = 0; }
  return { out: o, gainDb, maxGR: res.maxGR, grAt: res.at };
}
function wav24(path, m) {
  const data = Buffer.alloc(N * 6);
  for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) { const v = Math.max(-8388608, Math.min(8388607, Math.round((c ? m.R : m.L)[i] * 8388607))); data.writeIntLE(v, i * 6 + c * 3, 3); }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 6, 28); h.writeUInt16LE(6, 32); h.writeUInt16LE(24, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40);
  const buf = Buffer.concat([h, data]);
  writeFileSync(path, buf);
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------- self test of the meter (EBU Tech 3341 case 1), then the real mixes
{
  const saveN = N;
  const t = { L: new Float64Array(saveN), R: new Float64Array(saveN) };
  const amp = db(-23);
  for (let i = 0; i < 20 * SR && i < saveN; i++) { t.L[i] = amp * Math.sin((TWO_PI * 1000 * i) / SR); t.R[i] = t.L[i]; }
  const I = integrated(blocks(t, 0.4, 0.1));
  if (Math.abs(I - -23) > 0.15) throw new Error(`loudness self test failed: ${I.toFixed(2)} LUFS, expected -23`);
  console.log(`meter self test: 1 kHz at -23 dBFS reads ${I.toFixed(2)} LUFS (expected -23.0)`);
}
const premix = stereo();
for (let i = 0; i < N; i++) { premix.L[i] = music.L[i] + sfx.L[i]; premix.R[i] = music.R[i] + sfx.R[i]; }
const M = master(premix);
mkdirSync("remotion/public-promo4/audio", { recursive: true });
mkdirSync("out/v4/stems", { recursive: true });
mkdirSync("out/v4/qa", { recursive: true });
const hashes = {};
hashes.mix = wav24("remotion/public-promo4/audio/promo4-mix.wav", M.out);
const gM = db(M.gainDb);
const scaleBy = (m, g) => ({ L: Float64Array.from(m.L, (v) => v * g), R: Float64Array.from(m.R, (v) => v * g) });
hashes.music = wav24("out/v4/stems/music.wav", scaleBy(music, gM));
hashes.sfx = wav24("out/v4/stems/sfx.wav", scaleBy(sfx, gM));
hashes.vo = wav24("out/v4/stems/vo.wav", stereo());
// guide: the music ducked under a placeholder voice, to prove the reservation works
const ducked = applyDuck(music);
const gv = guideVO();
const guide = stereo();
for (let i = 0; i < N; i++) { guide.L[i] = ducked.L[i] + sfx.L[i] + gv.L[i]; guide.R[i] = ducked.R[i] + sfx.R[i] + gv.R[i]; }
const G = master(guide);
hashes.guide = wav24("out/v4/stems/mix-guide.wav", G.out);
// at the main master gain, so the audit compares like with like
hashes.musicDucked = wav24("out/v4/stems/music-ducked.wav", scaleBy(ducked, gM));
hashes.guideVo = wav24("out/v4/stems/vo-guide.wav", scaleBy(gv, gM));

// ---------------------------------------------------------------- report
const z400 = blocks(M.out, 0.4, 0.1), z3 = blocks(M.out, 3, 0.1);
const I = integrated(z400);
const tp = Math.max(truePeak(M.out.L), truePeak(M.out.R));
const mom = z400.map((b) => ({ t: b.t, l: LU(b.z) })).filter((b) => isFinite(b.l));
const peakM = mom.reduce((p, q) => (q.l > p.l ? q : p));
const secLoud = SECT.map((s) => { const t0 = b(s.from) / FPS, t1 = b(s.to + 1) / FPS; const zs = z3.filter((x) => x.t >= t0 && x.t + 3 <= t1 + 1.5); const v = zs.length ? LU(zs.reduce((p, q) => p + q.z, 0) / zs.length) : NaN; return `${s.id} ${v.toFixed(1)}`; });
const report = { integratedLUFS: +I.toFixed(2), truePeakDBTP: +(20 * Math.log10(tp)).toFixed(2), LRA: +lra(z3).toFixed(1), momentaryMax: { LUFS: +peakM.l.toFixed(1), at: +peakM.t.toFixed(2) }, limiterMaxGR: +M.maxGR.toFixed(2), limiterMaxGRat: +M.grAt.toFixed(2), masterGainDb: +M.gainDb.toFixed(2), sections: secLoud, hashes, voWindows: VO.length, guideIntegrated: +integrated(blocks(G.out, 0.4, 0.1)).toFixed(2) };
writeFileSync("out/v4/qa/sound-cues.json", JSON.stringify({ SR, FPS, SPF, TOTAL, cues: manifest, vo: VO, duckSpans: duckEnvelope().spans, report }, null, 1));
console.log(JSON.stringify(report, null, 1));
void K; void ACT;

// ---------------------------------------------------------------- the 30 s cutdown (timeline.ts CUT)
// The same music and effects, spliced at the cut frames before the master, with a 10 ms equal power crossfade
// ending 10 ms before each splice frame, then mastered on its own to the same target. Every cue inside a kept range moves with it.
{
  const FULL = N, XF = 480, PRE = 480; // a 10 ms crossfade that ends 10 ms before each splice frame: sound leads picture by the same 10 ms as every cue (the tap lead), so a tap on the cut frame is whole
  const src = { music, sfx };
  N = CUT_TOTAL * SPF;
  const cut = { music: stereo(), sfx: stereo() };
  for (const [k, bus] of Object.entries(cut)) {
    CUT.forEach((s, si) => {
      const a = s.from * SPF, e = s.to * SPF, d = s.at * SPF;
      const first = si === 0, last = si === CUT.length - 1;
      for (let j = a - (first ? 0 : XF + PRE); j < e - (last ? 0 : PRE); j++) {
        if (j < 0 || j >= FULL) continue;
        const o = d + (j - a); if (o < 0 || o >= N) continue;
        let w = 1;
        if (!first && j < a - PRE) w *= Math.sin((Math.PI / 2) * ((j - (a - XF - PRE)) / XF));
        if (!last && j >= e - XF - PRE) w *= Math.cos((Math.PI / 2) * ((j - (e - XF - PRE)) / XF));
        bus.L[o] += src[k].L[j] * w; bus.R[o] += src[k].R[j] * w;
      }
    });
  }
  const pre = stereo();
  for (let i = 0; i < N; i++) { pre.L[i] = cut.music.L[i] + cut.sfx.L[i]; pre.R[i] = cut.music.R[i] + cut.sfx.R[i]; }
  const MC = master(pre);
  mkdirSync("out/v4/stems/cut", { recursive: true });
  const ch = {};
  ch.mix = wav24("remotion/public-promo4/audio/promo4-cut-mix.wav", MC.out);
  const gC = db(MC.gainDb);
  ch.music = wav24("out/v4/stems/cut/music.wav", scaleBy(cut.music, gC));
  ch.sfx = wav24("out/v4/stems/cut/sfx.wav", scaleBy(cut.sfx, gC));
  const cues = [];
  for (const c of manifest) {
    const s = CUT.find((x) => c.f >= x.from && c.f < x.to);
    if (!s) continue;
    const sh = (s.at - s.from) * SPF;
    cues.push({ ...c, id: `${c.id}>${c.f - s.from + s.at}`, f: c.f - s.from + s.at, expectedSample: c.expectedSample + sh, startSample: c.startSample + sh });
  }
  const zc = blocks(MC.out, 0.4, 0.1), zc3 = blocks(MC.out, 3, 0.1);
  const rc2 = { integratedLUFS: +integrated(zc).toFixed(2), truePeakDBTP: +(20 * Math.log10(Math.max(truePeak(MC.out.L), truePeak(MC.out.R)))).toFixed(2), LRA: +lra(zc3).toFixed(1), limiterMaxGR: +MC.maxGR.toFixed(2), limiterMaxGRat: +MC.grAt.toFixed(2), masterGainDb: +MC.gainDb.toFixed(2), hashes: ch, cut: CUT };
  writeFileSync("out/v4/qa/sound-cues-cut.json", JSON.stringify({ SR, FPS, SPF, TOTAL: CUT_TOTAL, cues, vo: [], report: rc2 }, null, 1));
  console.log("cutdown", JSON.stringify(rc2));
  N = FULL;
}
