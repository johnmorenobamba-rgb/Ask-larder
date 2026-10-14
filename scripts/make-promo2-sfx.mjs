// Synthesises the promo v2 sound design as ONE mixed 48kHz mono WAV, from the same cue list the video uses.
// No dependencies, no licensed audio. Run: node scripts/make-promo2-sfx.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { buildCues, FPS, TOTAL_FRAMES } from "../remotion/promo2/timeline.ts";

const SR = 48000;
const total = Math.round((TOTAL_FRAMES / FPS) * SR);
const mix = new Float32Array(total);

let seed = 1234;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const db = (d) => Math.pow(10, d / 20);

const add = (startSample, buf, gain) => {
  for (let i = 0; i < buf.length && startSample + i < total; i++) if (startSample + i >= 0) mix[startSample + i] += buf[i] * gain;
};

// one pole filters
const lowpass = (buf, fc) => {
  const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
  let y = 0;
  return buf.map((x) => (y += a * (x - y)));
};
const highpass = (buf, fc) => {
  const lp = lowpass(buf, fc);
  return buf.map((x, i) => x - lp[i]);
};
const tone = (ms, fn) => Float32Array.from({ length: Math.round((ms / 1000) * SR) }, (_, i) => fn(i / SR));

// UI tick: 1.2kHz sine, 12ms decay, plus a 3ms highpassed noise transient
const tick = () => {
  const body = tone(60, (t) => Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t / 0.012));
  const click = highpass(tone(6, (t) => noise() * Math.exp(-t / 0.003)), 2000);
  return body.map((x, i) => x + (click[i] ?? 0) * 0.6);
};
// key click: short band of noise plus a low thump, pitch and gain vary per instance
const key = () => {
  const f = 180 * (0.92 + rnd() * 0.16);
  const body = tone(40, (t) => Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.015));
  const n = lowpass(highpass(tone(8, (t) => noise() * Math.exp(-t / 0.004)), 1800), 3500);
  const g = db(-2 + rnd() * 4);
  return body.map((x, i) => (x * 0.7 + (n[i] ?? 0) * 0.9) * g);
};
// stamp thud: 90Hz falling to 55Hz, contact click, a tiny paper tap 30ms later
const thud = () => {
  let phase = 0;
  const body = tone(350, (t) => {
    const f = 55 + 35 * Math.exp(-t / 0.04);
    phase += (2 * Math.PI * f) / SR;
    return Math.sin(phase) * Math.exp(-t / 0.09);
  });
  const contact = lowpass(tone(8, (t) => noise() * Math.exp(-t / 0.003)), 1500);
  contact.forEach((x, i) => (body[i] += x * 0.9));
  const tap = tone(20, (t) => Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t / 0.006));
  const off = Math.round(0.03 * SR);
  tap.forEach((x, i) => (body[off + i] += x * db(-18)));
  return body;
};
// wipe: filtered noise swept 300Hz to 2.5kHz, up and down
const wipe = () => {
  const n = Math.round(0.5 * SR);
  const raw = Float32Array.from({ length: n }, () => noise());
  const out = new Float32Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const fc = 300 + 2200 * p;
    const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
    y += a * (raw[i] - y);
    out[i] = y * Math.sin(Math.PI * p);
  }
  return out;
};

// ambient bed: A2, E3, A3 with slow LFO, low passed, plus a hint of noise
{
  let ph = [0, 0, 0];
  const freqs = [110, 164.8, 220];
  const lfo = [0.05, 0.08, 0.12];
  const bed = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    let s = 0;
    for (let k = 0; k < 3; k++) {
      ph[k] += (2 * Math.PI * freqs[k]) / SR;
      s += Math.sin(ph[k]) * (0.75 + 0.25 * Math.sin(2 * Math.PI * lfo[k] * t + k)) * (k === 0 ? 1 : 0.6);
    }
    bed[i] = s / 2.2 + noise() * 0.008;
  }
  const lp = lowpass(bed, 900);
  const fade = SR * 2;
  for (let i = 0; i < total; i++) {
    const env = Math.min(1, i / fade, (total - i) / fade);
    mix[i] += lp[i] * env * db(-24);
  }
}

const levels = { tick: db(-14), key: db(-20), thud: db(-8), wipe: db(-22) };
const make = { tick, key, thud, wipe };
for (const cue of buildCues()) {
  add(Math.round((cue.frame / FPS) * SR), make[cue.kind](), levels[cue.kind]);
}

// peak guard and 16 bit write
let peak = 0;
for (const x of mix) peak = Math.max(peak, Math.abs(x));
const norm = peak > db(-3) ? db(-3) / peak : 1;
const pcm = Buffer.alloc(total * 2);
for (let i = 0; i < total; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(mix[i] * norm * 32767))), i * 2);
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVEfmt ", 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);
mkdirSync("remotion/public-promo2/audio", { recursive: true });
writeFileSync("remotion/public-promo2/audio/promo2-mix.wav", Buffer.concat([header, pcm]));
console.log(`wrote promo2-mix.wav, ${(total / SR).toFixed(1)}s, ${buildCues().length} cues, peak ${(20 * Math.log10(peak * norm)).toFixed(1)} dBFS`);
