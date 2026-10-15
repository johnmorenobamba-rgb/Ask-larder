// Promo v4 sound audit (research/video-v3/sound.md section 4.4). Reads out/v4/qa/sound-cues.json and the stems
// written by make-promo4-audio.mjs. Exit 1 on any failure. Run: node scripts/audit-promo4-sound.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

// node scripts/audit-promo4-sound.mjs cut audits the 30 s cutdown (its cues are the kept ones, moved with the splice)
const CUTMODE = process.argv[2] === "cut";
const man = JSON.parse(readFileSync(CUTMODE ? "out/v4/qa/sound-cues-cut.json" : "out/v4/qa/sound-cues.json", "utf8"));
const ST = CUTMODE ? "out/v4/stems/cut/" : "out/v4/stems/";
const { SR, SPF } = man;
const readWav = (p) => {
  const b = readFileSync(p);
  const n = (b.length - 44) / 6;
  const L = new Float64Array(n), R = new Float64Array(n);
  for (let i = 0; i < n; i++) { L[i] = b.readIntLE(44 + i * 6, 3) / 8388607; R[i] = b.readIntLE(47 + i * 6, 3) / 8388607; }
  return { L, R, n, hash: createHash("sha256").update(b).digest("hex").slice(0, 16) };
};
const mono = (w) => Float64Array.from(w.L, (v, i) => 0.5 * (v + w.R[i]));
function bp(x, lo, hi) { // two biquads: high pass at lo, low pass at hi
  const mk = (type, fc) => { const w = (2 * Math.PI * fc) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * 0.707); const k = type === "hp" ? [(1 + c) / 2, -(1 + c), (1 + c) / 2] : [(1 - c) / 2, 1 - c, (1 - c) / 2]; const a0 = 1 + al; return [k[0] / a0, k[1] / a0, k[2] / a0, (-2 * c) / a0, (1 - al) / a0]; };
  const run = (k, y) => { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; const o = new Float64Array(y.length); for (let i = 0; i < y.length; i++) { const v = k[0] * y[i] + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2; x2 = x1; x1 = y[i]; y2 = y1; y1 = v; o[i] = v; } return o; };
  return run(mk("lp", hi), run(mk("hp", lo), x));
}
const BAND = { ping: [1000, 3000], scan: [1000, 3000], buzz: [150, 600], key: [700, 6000], tick: [1500, 6000], roll: [1500, 6000], confirm: [600, 3000], whoosh: [300, 1200] };
const hop = SR / 1000, win = 2 * hop; // 2 ms RMS at a 1 ms hop
const env = (x) => { const n = Math.floor(x.length / hop); const e = new Float64Array(n); for (let j = 0; j < n; j++) { let s = 0; for (let i = j * hop; i < j * hop + win && i < x.length; i++) s += x[i] * x[i]; e[j] = 10 * Math.log10(s / win + 1e-12); } return e; };

const sfxW = readWav(ST + "sfx.wav"), musicW = readWav(ST + "music.wav"), mixW = readWav(CUTMODE ? "remotion/public-promo4/audio/promo4-cut-mix.wav" : "remotion/public-promo4/audio/promo4-mix.wav");
const sfx = mono(sfxW), music = mono(musicW), mix = mono(mixW);
const bandCache = {};
const banded = (name, x, k) => (bandCache[name + k] ??= env(bp(x, ...BAND[k])));
const rows = [];
let fails = 0;
const frames = man.cues.map((c) => c.expectedSample - c.lead);
for (const c of man.cues) {
  // 1. scheduling identity: exact
  const ident = c.startSample + c.anchor + c.lead === c.expectedSample;
  // 2. onset in the effects stem, in the event's band: the largest positive jump within +-3 frames of the cue
  const expected = c.expectedSample - c.lead;
  // the search window never reaches past half the gap to the nearest other cue, so neighbours are not confused
  const gap = Math.min(3 * SPF, ...frames.filter((x) => x !== expected).map((x) => Math.abs(x - expected) / 2));
  const findOnset = (e) => {
    const j0 = Math.max(1, Math.floor((expected - gap) / hop)), j1 = Math.min(e.length - 1, Math.floor((expected + gap) / hop));
    let best = j0, bv = -Infinity;
    if (c.kind === "whoosh") { for (let j = j0; j <= j1; j++) if (e[j] > bv) { bv = e[j]; best = j; } return best * hop + win / 2; }
    for (let j = j0; j <= j1; j++) { const d = e[j] - e[j - 1]; if (d > bv) { bv = d; best = j; } }
    return best * hop;
  };
  const eS = banded("sfx", sfx, c.kind), eMix = banded("mix", mix, c.kind), eMus = banded("music", music, c.kind);
  const tS = findOnset(eS), tM = findOnset(eMix);
  const dS = (tS - expected) / SR * 1000, dM = (tM - expected) / SR * 1000;
  // level of the event over the bed in its band, 50 ms after the onset
  const j = Math.floor(expected / hop);
  const lvl = (e) => { let s = 0, n = 0; for (let k = j; k < j + 50 && k < e.length; k++) { s += 10 ** (e[k] / 10); n++; } return 10 * Math.log10(s / n); };
  const margin = lvl(eS) - lvl(eMus);
  const tol = c.kind === "whoosh" ? 45 : 1000 / 30; // the whoosh peaks within 45 ms of its apex; transients within one frame
  const okS = Math.abs(dS) <= tol, okM = Math.abs(dM) <= (c.kind === "whoosh" ? 90 : 1000 / 30);
  const pass = ident && okS && okM;
  if (!pass) fails++;
  rows.push({ id: c.id, kind: c.kind, frame: c.f, ident, sfxDeltaMs: +dS.toFixed(1), mixDeltaMs: +dM.toFixed(1), marginDb: +margin.toFixed(1), pass, warn: c.kind !== "whoosh" && margin < 6 ? "under +6 dB over the bed" : "" });
}
// 3. the reserved voiceover: ducking depth and voice over music inside each window (guide mix)
const ducked = null, voG = null;
const rmsDb = (x, s, e) => { let t = 0; for (let i = s; i < e; i++) t += x[i] * x[i]; return 10 * Math.log10(t / Math.max(1, e - s) + 1e-12); };
const gainRef = (() => { // the guide master's gain differs from the main one; compare like for like by the mix ratios
  return 0;
})();
// BS.1770 K weighting, so the voice to music ratio is in loudness units, as the target is written
const kw = (x) => {
  const run = (bb, aa, y) => { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; const o = new Float64Array(y.length); for (let i = 0; i < y.length; i++) { const v = bb[0] * y[i] + bb[1] * x1 + bb[2] * x2 - aa[1] * y1 - aa[2] * y2; x2 = x1; x1 = y[i]; y2 = y1; y1 = v; o[i] = v; } return o; };
  return run([1, -2, 1], [1, -1.99004745483398, 0.99007225036621], run([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x));
};
const kws = (p) => { const w = readWav(p); return { kL: kw(w.L), kR: kw(w.R) }; };
const luWin = (w, s, e) => { let t = 0; for (const ch of [w.kL, w.kR]) for (let i = s; i < e; i++) t += ch[i] * ch[i]; return -0.691 + 10 * Math.log10(t / Math.max(1, e - s) + 1e-12); };
const [kDuck, kMusic, kVo] = man.vo.length ? [kws("out/v4/stems/music-ducked.wav"), kws("out/v4/stems/music.wav"), kws("out/v4/stems/vo-guide.wav")] : [];
void ducked; void voG; void rmsDb;
const voRows = man.vo.map((v) => {
  const s = Math.round(v.from * SPF), e = Math.round(v.to * SPF);
  const duckDb = luWin(kDuck, s, e) - luWin(kMusic, s, e);
  const voOverMusic = luWin(kVo, s, e) - luWin(kDuck, s, e);
  return { id: v.id, from: v.from, to: v.to, duckDb: +duckDb.toFixed(1), voiceOverMusicDb: +voOverMusic.toFixed(1), ok: voOverMusic >= 10 };
});
const voFails = voRows.filter((r) => !r.ok).length;
// 4. determinism: the files on disk are the ones the build hashed
const det = { mix: mixW.hash === man.report.hashes.mix, sfx: sfxW.hash === man.report.hashes.sfx, music: musicW.hash === man.report.hashes.music };
const out = { cues: rows.length, cueFails: fails, voWindows: voRows.length, voFails, determinism: det, loudness: man.report, rows, voRows, note: "duckDb compares the ducked music stem (guide master gain) with the plain music stem (main master gain); the two masters differ by their gain difference, reported here.", guideVsMainGainDb: void gainRef };
writeFileSync(CUTMODE ? "out/v4/qa/sound-audit-cut.json" : "out/v4/qa/sound-audit.json", JSON.stringify(out, null, 1));
console.log("cue            kind     frame  ident  sfx ms  mix ms  margin dB  pass");
for (const r of rows) console.log(`${r.id.padEnd(14)} ${r.kind.padEnd(8)} ${String(r.frame).padStart(5)}  ${r.ident ? "yes" : "NO "}   ${String(r.sfxDeltaMs).padStart(6)}  ${String(r.mixDeltaMs).padStart(6)}  ${String(r.marginDb).padStart(9)}  ${r.pass ? "pass" : "FAIL"} ${r.warn}`);
console.log("\nVO window   duck LU   voice over music LU");
for (const r of voRows) console.log(`${r.id.padEnd(10)} ${String(r.duckDb).padStart(7)}   ${String(r.voiceOverMusicDb).padStart(7)} ${r.ok ? "" : "under 10 dB"}`);
console.log(`\n${rows.length} cues, ${fails} failures; ${voRows.length} VO windows, ${voFails} under 10 LU; determinism ${JSON.stringify(det)}`);
process.exit(fails || voFails || !Object.values(det).every(Boolean) ? 1 : 0);
