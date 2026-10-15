# Larder launch film v3: sound spec

Sound agent output for the 60 to 75 second Remotion launch film (hook, three pain and solution pairs, urgency, call to action). Calm, confident software launch, not a TV ad. No voiceover yet, but the score, the effects and the mix are laid out so a recorded voiceover drops in later without moving a single picture frame.

Everything is synthesised by one dependency free Node script from the same timeline file the picture imports, rendered deterministically (seeded, no `Math.random`, no clock), and measured by our own BS.1770 code, because the bundled ffmpeg (`node_modules/@remotion/compositor-win32-x64-msvc`) cannot run audio filters.

Inputs read: Cinetic `references/sound.md` and `references/timing-grid.md`, the starter's `audio/score.json`, `src/sync.ts` and `src/lib/sync.ts` (reference data), `scripts/make-promo2-sfx.mjs`, `remotion/promo3/timeline.ts`, `research/brief.md`. Web research on ducking and loudness is cited at the end.

**Personality row (Cinetic sound.md §5.5a):** between "calm, unhurried" and "warm, kind": felt keys (FM Rhodes), a warm pad, a soft sub, plucked percussion. Narrow, gentle dynamics; no sucks into booms, no risers, no braams, no cymbals. Signature hit: one soft chord with a long tail plus a three note motif on the wordmark.

---

## Contents
1. [Tempo, grid and bar map](#1-tempo-grid-and-bar-map)
2. [The music bed](#2-the-music-bed)
3. [Sound effects](#3-sound-effects)
4. [Scheduling from the shared timeline, and the sync audit](#4-scheduling-from-the-shared-timeline-and-the-sync-audit)
5. [Voiceover readiness](#5-voiceover-readiness)
6. [Loudness and verification](#6-loudness-and-verification)
7. [DSP building blocks (dependency free)](#7-dsp-building-blocks-dependency-free)
8. [Files, order of work, acceptance gate](#8-files-order-of-work-acceptance-gate)
9. [Findings about the current script](#9-findings-about-the-current-script)

---

## 1. Tempo, grid and bar map

### 1.1 Recommendation: 112.5 BPM, 4/4, felt half time in the pain sections

| Property | 30 fps (current promo pipeline) | 60 fps |
|---|---|---|
| Beat | **16 f** (0.5333 s) | 32 f |
| 8th | 8 f | 16 f |
| 16th | **4 f** (whole) | 8 f |
| 32nd | 2 f | 4 f |
| Bar | 64 f = 2.1333 s | 128 f |
| Samples at 48 kHz | beat 25 600, bar 102 400, frame 1 600 | frame 800 |

Why 112.5:
- **Every subdivision down to the 32nd is a whole frame at 30 fps and at 60 fps**, and every beat is a whole number of samples (25 600). 120 BPM, the Cinetic default, gives a fractional 8th at 30 fps (7.5 f), which forces rounding and up to a frame of drift on 16th-placed keys and taps. 100 BPM gives a fractional 16th (4.5 f). 90 BPM is whole too (beat 20 f) but reads as a slow walkthrough, and its 2.67 s bar makes a 2 bar pain section 5.3 s, too long for one line.
- It sits just under the measured launch film band (115 to 130 BPM). Solution sections play it straight (it feels confident and moving); pain sections play it half time (kick and rim absent, sub held), which the ear hears as about 56 BPM: calm, suspended, a room after hours.
- Dotted 8th delay = 12 f = 400 ms exactly; an 8th note autopan = 3.75 Hz exactly. Both tie the space of the mix to the grid.

Fallback if the picture team needs slower reading: 90 BPM (beat 20 f, 16th 5 f, bar 2.667 s); halve the bar counts of the solutions (2 bars = 5.3 s) and keep pains at 2 bars.

### 1.2 Bar map (30 fps, `b(bar, beat, sub) = ((bar-1)*4 + beat)*16 + sub*4`)

| Section | Bars | Frames | Time | Musical role |
|---|---|---|---|---|
| Hook | 1 to 4 | 0 to 255 | 0.00 to 8.53 s | pain colour, enters with intent on frame 0 |
| Pain 1 | 5 to 6 | 256 to 383 | 8.53 to 12.80 | suspended, half time |
| Solution 1 | 7 to 10 | 384 to 639 | 12.80 to 21.33 | first resolution, light groove |
| Pain 2 | 11 to 12 | 640 to 767 | 21.33 to 25.60 | suspended |
| **Solution 2 (payoff)** | 13 to 16 | 768 to 1023 | **25.60** to 34.13 | full groove; the loudest moment at its downbeat, 40.7% into the film |
| Pain 3 | 17 to 18 | 1024 to 1151 | 34.13 to 38.40 | suspended |
| Solution 3 | 19 to 22 | 1152 to 1407 | 38.40 to 46.93 | groove, one notch under the payoff |
| Urgency | 23 to 26 | 1408 to 1663 | 46.93 to 55.47 | harmonic rhythm doubles, bass climbs, clock |
| Call to action | 27 to 28 | 1664 to 1791 | 55.47 to 59.73 | subtracts: no drums, plagal cadence |
| Logo | 29 to 30 beat 2 | 1792 to 1887 | 59.73 to 62.93 | music stops on b(29), 1 beat of air, resolve at b(29,1) = 1808 |
| **TOTAL** | | **1888 f** | **62.93 s** | tail rings to digital zero by f 1887 |

- Put the hero capability (Ask Larder, the core differentiator) in pair 2, so the payoff lands 30 to 60% in. If the hero must be pair 3, the payoff moves to b(19) = 38.4 s (61%), still acceptable.
- **Stretch knobs** (keep 4 bar phrasing intact): give the hero solution 6 bars (+4.27 s, film 67.2 s) and/or the urgency 6 bars (+4.27 s, film 71.5 s). Never stretch a pain beyond 3 bars: the suspension stops feeling like a held breath and starts feeling like a loop.
- Pain (2) + solution (4) = a 6 bar phrase. It reads as intentional because the pain is a 2 bar cell that ends on a suspended dominant and the solution is a 4 bar cadence that ends on the same dominant, which then resolves deceptively (V to vi) into the next pain. The ear hears "it was answered, and then the next problem".
- Section changes, the gap before each solution, the urgency stop and the logo resolve are all music events on downbeats. The picture's matching cuts go on those downbeats (`b(n)`); ordinary cuts inside a section go on 8ths with no sound of their own.

---

## 2. The music bed

### 2.1 Key and progression

**Key: F major** (one key for the whole film). The tonic puts the kick on F1 = 43.65 Hz and every sub root between 41 and 82 Hz (Cinetic's E1 to E♭2 window); F major Rhodes voicings sit in A3 to C5, the warmest register of the instrument and below the 1 to 4 kHz band a voice will need.

Chords, one entry per bar (two names = the bar splits at beat 2):

```
Hook       1 Dm9        | 2 Dm9          | 3 Bbmaj7#11  | 4 Gm9  C9sus4  |
Pain 1     5 Dm9        | 6 Bbmaj7#11  C9sus4 |
Solution 1 7 Fmaj9      | 8 Am7          | 9 Bbmaj9     | 10 C9sus4      |
Pain 2    11 Dm9        | 12 Bbmaj7#11 C9sus4 |
Solution 2 13 Fmaj9     | 14 Am7         | 15 Bbmaj9    | 16 Gm9  C9sus4 |
Pain 3    17 Dm9        | 18 Bbmaj7#11 C9sus4 |
Solution 3 19 Fmaj9     | 20 Am7  Dm9    | 21 Bbmaj9    | 22 Gm9  C9sus4 |
Urgency   23 Dm9  C/E   | 24 Fmaj9  Gm9  | 25 Am7  Bbmaj9 | 26 C9sus4 (stops at b(26,3,2)) |
CTA       27 Fmaj9      | 28 Bbmaj9/F (stops at b(29)) |
Logo      29 N.C. on beat 0, Fadd9 from beat 1 | 30 ring |
```

Harmonic logic:
- **Pain** = vi9 to IVmaj7#11 to V9sus4: minor and lydian colours over a held D, ending on a suspended dominant that never resolves inside the pain. Unanswered, but not dramatic.
- **Solution** = I maj9 to iii7 to IV maj9 to V9sus4: the first chord is the resolution of the pain's dominant (the lift), then the progression walks and ends on the same dominant, which resolves deceptively into the next pain's vi.
- The three solutions differ in their last two bars (bar 16 and bar 20/22 split chords) so the loop never repeats exactly.
- **Urgency** = two chords a bar, the bass climbing stepwise D, E, F, G, A, B♭, C: pressure from harmonic rhythm and register, not from loudness.
- **CTA** = I to IV/I over an F pedal (a plagal "amen"), the most settled cadence there is; then silence, then the tonic add9 on the wordmark.

### 2.2 Voicings (MIDI, C4 = 60)

Rhodes (rootless, the sub owns the root). Each moves at most two voices into the next:

| Chord | Rhodes | Sub root (Hz) |
|---|---|---|
| Fmaj9 | A3 C4 E4 G4 (57 60 64 67) | F1 43.65 |
| Am7 | G3 C4 E4 A4 (55 60 64 69) | A1 55.00 |
| Bbmaj9 | A3 C4 D4 F4 (57 60 62 65) | B♭1 58.27 |
| C9sus4 | B♭3 C4 D4 F4 (58 60 62 65) | C2 65.41 |
| Dm9 | A3 C4 E4 F4 (57 60 64 65): the E/F rub is the pain's tension | D2 73.42 |
| Bbmaj7#11 | A3 D4 E4 F4 (57 62 64 65): only C moves to D, "stuck" | B♭1 58.27 |
| Gm9 | B♭3 D4 F4 A4 (58 62 65 69) | G1 49.00 |
| C/E | G3 C4 E4 G4 (55 60 64 67) | E2 82.41 |
| Bbmaj9/F | D4 F4 A4 C5 (62 65 69 72) | F1 43.65 (pedal) |
| Fadd9 (logo) | F2 C3 A3 G4 C5 (41 48 57 67 72), open, no close intervals below C4 | F1 43.65 |

Pad (3 voices): root, fifth, and the third an octave up, nearest the previous voicing, inside D3 to C5 (MIDI 50 to 72), root or fifth lowest. Examples: Fmaj9 F3 C4 A4; Dm9 D3 A3 F4; Bbmaj7#11 F3 B♭3 D4 (fifth lowest); C9sus4 G3 C4 F4. Rule from Cinetic: no seconds or thirds below C4 in the pad.

### 2.3 Instruments (exact recipes)

All voices run at 48 kHz in Float64, phase-accumulating oscillators (never `sin(2π f(t) t)`), seeded per note by `hash(sectionId, bar, beat, voiceIndex)`.

**A. FM electric piano ("Rhodes")**, two 2-operator pairs per note, after the DX7 E.PIANO structure (body pair 1:1, tine pair with a 14:1 modulator):

```
f    = 440 * 2^((midi-69)/12);  v = velocity 0..1;  t = seconds since note on
ks   = (261.63 / f) ** 0.5                      // key scaling: high notes less bright
Ib   = v * (1.1*exp(-t/0.35) + 0.35) * ks       // body index: bright attack, warm sustain
It   = v * 2.0 * exp(-t/0.030) * ks             // tine index: a 30 ms ping
body = sin(phC + Ib * sin(phM1))                // phM1 runs at 1.000 f (+0.15 Hz for slow beating)
tine = sin(phC2 + It * sin(phM14))              // phM14 runs at 14 f; sidebands 13 f and 15 f = the tine
amp  = (1 - exp(-t/0.0015)) * (0.65*exp(-t/(1.4*ks**0.7)) + 0.35*exp(-t/0.22))
out  = amp * v**1.4 * (body + 0.35*tine)
after note off (t_off): out *= exp(-(t - t_off)/0.16)
```

- Second body pair detuned +3 cents, the two body pairs panned −0.2 and +0.2: chorus without a chorus effect.
- "Bark": `y = y + 0.08*y*y` then a 20 Hz DC blocker (2nd harmonic grows with velocity, like a real tine hitting the pickup).
- Bus: high-pass 110 Hz (2nd order), one-pole low-pass 5.5 kHz, `tanh(1.3 y) / tanh(1.3)`, 8th-note autopan (3.75 Hz sine, depth 0.12 in pain sections, 0.25 in solutions), dotted 8th ping-pong delay (19 200 samples, feedback 0.32, one-pole low-pass 3 kHz in the loop, send −16 dB, −12 dB in pains), hall send −14 dB.
- Humanise: chords strum bottom up 0, 5, 10, 15 ms (seeded ±2 ms) except the first note, which sits exactly on the grid; velocity ±0.04 seeded; no timing jitter on downbeats that a cue shares.
- Velocities: pain 0.36 to 0.42, solution 0.45 to 0.58, CTA 0.40, logo 0.50.

**B. Warm pad**, per voice:

```
saws : 2 PolyBLEP saws at f * 2^(+-7/1200), panned 0.3 L / 0.3 R
sine : 1 sine at f, -6 dB, centre
env  : attack 0.6 s (0.9 s in pains), sustain 1, release 1.2 s; on a chord change old voices
       release while new voices attack over 0.35 s (legato crossfade)
filter: TPT state-variable low-pass, Q 0.65, cutoff from the section table, glided by a 50 ms
        one-pole, times (1 + 0.06*sin(2*pi*0.11*t)) for slow movement
bus  : high-pass 170 Hz (2nd order), peaking EQ -2 dB at 2.5 kHz Q 0.8 always (reserved for VO),
       hall send -10 dB
```

**C. Sub**: `sin(ph) + 0.25*sin(2*ph)`, attack 8 ms, sustain 1, release 120 ms, `tanh(1.8 y)/tanh(1.8)` (adds 3rd harmonic so phones hear the root at 130 to 250 Hz), one-pole low-pass 240 Hz, mono. Notes on the chord roots in §2.2.

**D. Soft kick (tuned to the tonic)**: `f(t) = 43.65 + 70*exp(-t/0.030)`, amp `exp(-t/0.16)`, length 0.45 s, plus a 2 ms click (seeded noise, one-pole low-pass 1.8 kHz, τ 1.5 ms, −18 dB). It sidechains the Rhodes and pad buses by 2 dB (gain dip with 5 ms attack, τ 120 ms release): breathing, not pumping.

**E. Rim (side stick)**: three modes, 1650 Hz τ 5 ms (1.0), 820 Hz τ 10 ms (0.6), 3300 Hz τ 2.5 ms (0.25), excited by a 0.3 ms high-passed (2 kHz) noise burst at 0.5; whole voice high-passed 400 Hz; per hit ±1.5% pitch and ±1 dB seeded; room send −16 dB; pan +0.1.

**F. Shaker**: white noise, state-variable band-pass 5.5 kHz Q 0.7, then high-pass 3 kHz; envelope linear attack 4 ms (accents 6 ms) then `exp(-t/0.030)` (accents τ 0.045); 16th accents `[1.0, 0.42, 0.68, 0.50]`; 2nd and 4th 16ths late by 0.04 beat (1 024 samples, about 21 ms) for swing; new noise seed per hit; pan +0.2. Muted in bars with typing sounded per key and reduced to 8th accents inside VO windows.

**G. Clock (urgency only)**: Cinetic's tuned tick. Tick F6 (1396.9 Hz) fundamental τ 10 ms, partials 2.76× (τ 3 ms, −10 dB) and 5.4× (τ 1.5 ms, −18 dB), a 0.5 ms low-passed transient; tock C6 (1046.5 Hz), partials 6 dB lower, τ 12 ms. Dry plus a 0.3 s room at −22 dB. Tick on beats 0 and 2, tock on 1 and 3.

### 2.4 Arrangement per section

Section level is the music bus gain before the master (the master then normalises the whole film).

| Section | Rhodes | Pad cutoff | Sub | Drums | Level | Notes |
|---|---|---|---|---|---|---|
| Hook (1 to 4) | whole note chords on beat 0, v 0.40; one tine note E5 at b(2,2,2) v 0.30 into the delay | 500 → 800 Hz over 4 bars | enters at b(3) | none | 0.62 | Dm9 Rhodes plus pad already at level on frame 0 (Rhodes attack is 1.5 ms; master fades the first 3 ms). Effects cluster here |
| Pain (2 bars) | chord on beat 0 (v 0.40), soft restrike on beat 2.5 (v 0.30, top two notes) | 650 Hz | D2 pedal held across both bars, then C2 for the sus chord | none (half time feel by absence) | 0.60 | delay send −12 dB: an empty room |
| Solution 1 | comp: beat 0 full (v 0.55), 1.5 top two (0.38), 2.5 full (0.42), 3.5 anticipation of the next chord on bar 4 only | 1400 Hz | roots on beat 0, pickup on beat 3.5 when the chord changes | rim on beat 2, shaker 8ths at −4 dB | 0.85 | |
| Solution 2 (payoff) | as solution 1, v +0.05 | 1400 → 2400 Hz over 4 bars | as solution 1 | kick on 0 and 2.5, rim on 2, shaker 16ths | **1.00** | the only section at full level |
| Solution 3 | as solution 1 | 2000 Hz | as solution 1 | kick on 0, rim on 2, shaker 16ths | 0.90 | stays one notch under the payoff |
| Urgency | 8th offbeat stabs (beats 0.5, 1.5, 2.5, 3.5), v 0.35, gate 0.18 s; chord changes every 2 beats | 1800 → 3200 Hz over 4 bars | quarter notes, root root fifth root, climbing | kick 0 and 2, rim 1 and 3, shaker 16ths with 8th accents, clock | 0.88 | everything stops dead at b(26,3,2) (30 ms fade): one 8th of air (267 ms) |
| CTA | whole notes, v 0.40 | 900 Hz | F1 pedal | none | 0.70 | music fades over 60 ms ending exactly at b(29) |
| Logo | resolve, §3.9 | off | soft F1 | none | n/a | 1 beat (533 ms) of near silence before it |

Contrast plan (what makes it a film, not a loop): the intro and pains run 4 to 6 LU under the solutions; the kick is held back until the payoff; the breath before each solution is a real gap; the end subtracts. Target LRA 5 to 8 LU.

### 2.5 The pain to solution lift (the moment the film is built around)

Applied identically at b(7), b(13) and b(19) (coverage is all or nothing):

1. **The breath.** From `b(lift) − 8 f` (the last 8th of the pain), the Rhodes and pad buses fall to −30 dB over 40 ms (raised cosine). Sub releases. Delay and reverb tails keep ringing (they are the room). Effects are not ducked. This is a 267 ms gap at about −30 dB: the measured "gap before an impact", without the impact.
2. **The downbeat.** At `b(lift)` exactly: the Fmaj9 Rhodes chord strummed 0, 6, 12, 18 ms at v 0.55; the sub enters on F1 with an 8 ms attack; the pad cutoff jumps 650 → 1400 Hz (150 ms glide) and its level returns over 80 ms; autopan depth goes 0.12 → 0.25; the rim and shaker start on this bar.
3. **At the payoff only (b(13))**: the soft kick enters on the downbeat. That is the film's biggest sonic event and it is still just a soft, tuned kick under a resolved chord.

Picture rule: the cut or reveal that answers the pain lands on `b(lift)`, and its first visible change is on that frame (start the change at `cue − 1`).

### 2.6 What keeps it from sounding cheap

- Moving harmony with voice leading (one or two voices per change), never a static loop.
- FM with decaying indices and key scaling, so every note changes colour as it decays; no static sines on top.
- Band-limited saws (PolyBLEP), so the pad has no aliasing fizz.
- Note-off releases and real tails through the delay and hall, so nothing stops dead except on purpose.
- Strum, velocity and swing variation, seeded; downbeats a cue shares stay exact.
- One material palette: felt (Rhodes), air (pad), wood (rim, Stamp), glass (ping). No sound from outside it.
- The arrangement has real holes: no drums in the hook, the pains and the CTA.

---

## 3. Sound effects

Levels are against the music's 250 ms RMS at the same moment (Cinetic method), after the master. Every effect is mono and within ±0.15 of centre except the whoosh. Every effect except the whoosh is dry or sent to the 0.7 s room only. Every voice is seeded by `hash(cue.id)`, so moving one cue never changes another's sound.

| # | Effect | Anchor (sample that lands on the cue) | Level | Centroid | Length |
|---|---|---|---|---|---|
| 3.1 | Message ping | onset | +6 dB | 1.3 to 1.8 kHz | 0.55 s |
| 3.2 | Notification buzz | onset of pulse 1 | +4 dB | 350 to 600 Hz | 0.62 s |
| 3.3 | Key click | onset | −4 dB vs ducked music | 0.9 to 1.3 kHz | under 12 ms (+ bottom out) |
| 3.4 | Tap tick | onset, placed 10 ms before the cue | −3 dB | 2.3 to 2.8 kHz | 6.5 ms to −20 dB, release 85 ms later |
| 3.5 | Whoosh | apex | +4 to +6 dB over bed at apex | 400 to 900 Hz | the move's length, min 0.3 s |
| 3.6 | Scan beep | onset | +4 dB | 1.76 kHz | 0.12 s |
| 3.7 | Form save confirm | click onset | click −3, tones −4 dB | 0.7 to 2.5 kHz | 0.35 s |
| 3.8 | Stamp thud | contact | +12 dB over bed, peak about −8 dBFS | 150 to 400 Hz | 0.45 s + room |
| 3.9 | Logo resolve | first chord note | end card 8 to 20 dB under the film's peak | 0.3 to 1.5 kHz | about 2.5 s to −60 dBFS |

### 3.1 Message ping (iOS-like in function, not a copy)

A two note glass/felt blip rising a perfect fourth in key, **C6 (1046.5 Hz) then F6 (1396.9 Hz), 80 ms apart**. It is neither of the iOS defaults (the tri-tone or the single "Note" chime), and because it is in F major it never clashes with the bed.

```
each note: FM, carrier f, modulator 2.0 f, index 1.2*exp(-t/0.060) + 0.15
           amp: attack 1.5 ms (raised cosine), then exp(-t/0.140); note 2 at 0.9 of note 1's gain
glass tap: sine at 2.76 f, exp(-t/0.020), -24 dB, on each note
bus      : high-pass 400 Hz, low-pass 7 kHz, room send -20 dB
```

Pitch rule: if the bar's chord lacks C or F (none in this progression does; C9sus4, Fmaj9, Dm9, Bbmaj9, Am7 all contain C or F), fall back to the chord's two tones nearest 1.2 kHz.

### 3.2 Notification buzz (a phone vibrating on a steel bench)

Two pulses, 220 ms on, 120 ms off, 220 ms on.

```
motor  : f(t) = 160 + 12*(1 - exp(-t_pulse/0.04))   (spin up 160 to 172 Hz)
         x = tanh(3*sin(ph)) / tanh(3)               (odd harmonics, the motor's buzz)
rattle : seeded white noise * (sin(ph) > 0.7 ? 1 : 0) (the bench chattering once per cycle),
         band-pass 1.5 to 4 kHz, -18 dB
pulse env: attack 12 ms, release 25 ms (raised cosine)
bus    : high-pass 120 Hz (keeps it off the sub), low-pass 4 kHz
```

The music ducks 3 dB for the buzz's length (it shares 150 to 500 Hz with the pad).

### 3.3 Key clicks with variation

Cinetic's dark modal "tock", which measured films use, not bright typewriter clicks:

```
26 fixed keys; key k has body fb = 760 + 180*h(k) Hz (h = seeded 0..1 per key letter)
modes : body fb τ 2.6 ms (1.0) | plate 2.03 fb τ 1.2 ms (0.5) | thud 270 Hz τ 4 ms (0.6)
        | tick 3.5 fb τ 0.4 ms (0.3)
excite: 0.4 ms low-passed (3 kHz) noise transient under a 0.7 ms raised-cosine onset
per press: pitch * (1 +- 0.012), new transient seed
bottom out: about half the letters (seeded), all spaces: a second, darker copy (fb * 0.7)
            25 to 35 ms later at -12 to -15 dB
space: fb * 0.82, decays * 1.4, +2 dB | return: fb * 0.75, decays * 1.6, +2.5 dB
```

- Dynamics: +2.5 dB on word starts, −0.3 dB per letter after, −1 dB before a space, σ 2.5 dB seeded, never more than 6 dB between neighbours.
- Timing: the character's fractional frame plus σ 3.5 ms seeded jitter, capped at 8 ms; never two keys within 60 ms; runs above 12 keys/s thinned to about 12/s keeping word starts, spaces and returns. Above 25 chars/s switch to one 48 ms word blip per word (sine gliding 2.5 semitones up into the chord tone nearest 700 Hz).
- The music ducks 10 dB under any run of 3+ sounded keys (30 ms down before the first key, 250 ms back after the last); shaker off in those bars.
- Under a VO window, keys switch to `muted`: 10 dB lower, no music duck.

### 3.4 Tap ticks (cursor presses)

One voice, one level for the whole film (coverage rule):

```
press  : sine at C7 (2093 Hz, F major pentatonic, near 2 kHz) + partials 1.5x (-6 dB) and
         2.2x (-12 dB), all exp(-t/0.0028) (-20 dB in about 6.5 ms), 0.3 ms attack
         4th order high-pass 600 Hz (two cascaded 2nd order, Q 0.54 and 1.31)
release: the same voice at 0.85 pitch, -1.5 dB, 85 ms after the press (finger lifts)
lead   : the press onset sits 480 samples (10 ms) before the cue frame (measured norm:
         clicks come 10 to 30 ms before the visible press)
```

### 3.5 Swipe or whoosh for whips (soft, not cheesy)

Only on camera-scale moves (a whip pan between scenes, a logo zoom): two or three in the film. Everything else rides the music.

```
source : pink noise (Paul Kellet filter) then one-pole low-pass 2 kHz (about 1/f^1.6 overall)
filter : state-variable band-pass, Q 0.9, centre swept log-linearly 180 Hz -> 900 Hz at the
         apex -> 260 Hz at the end
env    : u = t/dur; rise (u/apexFrac)^2 to the apex, then exp(-(t - tApex)/(0.35*(1-apexFrac)*dur))
air    : the same noise high-passed 3 kHz, envelope cubed (sharper), -20 dB
pan    : constant power, travelling from panStart to panEnd with the move (full width allowed)
length : the move's length, at least 0.3 s; apex = peak(a, b, ease) of the move
```

No pitch content, no Doppler swing, no reverse cymbal. Peak at most −18 dBFS after the master. Never place one on the pain to solution lift: the gap is the transition there.

### 3.6 Scan beep

A single device beep, in key: **A6 (1760 Hz)**, sine plus 3rd harmonic at −18 dB (a little "device" edge), 3 ms attack, flat 60 ms, 25 ms release, low-pass 6 kHz, dry. It sits on the frame the QR brackets lock. One beep, no second tone: a scanner confirms once.

### 3.7 Form save confirm

The tap tick (3.4) plus a soft rising two note confirm on chord tones, so it always agrees with the bed:

```
tones: the current chord's tone nearest 700 Hz, then the next chord tone up, 60 ms later
       (over Fmaj9: F5 698 Hz -> A5 880 Hz; over Bbmaj9: F5 -> A5; over C9sus4: F5 -> G5)
each : sine + 2nd harmonic at -15 dB, attack 4 ms, exp(-t/0.090), room send -22 dB
```

Used on "Save", "Form saved" and nothing else (a confirm tone only on a meaningful action).

### 3.8 Stamp thud (the trust moment)

A rubber stamp pressed into card on a timber pass, with the faint ring of a preserve-jar lid: Larder's signature element, same sound and level at every Stamp in the film.

```
body   : sine gliding 2x root -> root of the current chord, chosen in 55 to 90 Hz
         (F2 87.3 over Fmaj9, D2 73.4 over Dm9, B-flat1 58.3 over Bbmaj9), glide tau 25 ms,
         amp exp(-t/0.090), length 0.45 s
contact: seeded noise, one-pole low-pass 1.2 kHz, exp(-t/0.004), -6 dB
wood   : modes 220 Hz tau 30 ms and 540 Hz tau 15 ms, -12 dB
lid    : two faint inharmonic partials on the chord's 9th in octave 5 (G5 784 Hz over F):
         f and 2.76 f, exp(-t/0.180), -28 dB   <- the "jar lid" signature
paper  : 900 Hz sine tap exp(-t/0.006), -18 dB, 30 ms after contact
room   : 0.7 s room send -18 dB
```

- Anchor on the spring's contact frame: `hit(start, STAMP_SPR, 1)` from `lib/sync.ts`, not `stamp + 3` typed by hand.
- Hit duck: the music dips 3 dB for 150 ms around it. Kick and Stamp never share a frame (move the Stamp spring start so contact falls on an 8th with no kick).

### 3.9 Logo resolve

```
b(29) - 60 ms .. b(29)   music fades to silence (on the bar line)
b(29) .. b(29,1)         533 ms of near silence (reverb tails only, below -45 dBFS)
b(29,1) = f 1808         the wordmark becomes readable (its settleOf frame): 
  1. Rhodes Fadd9 (F2 C3 A3 G4 C5), v 0.50, strum 0 / 8 / 16 / 24 / 32 ms, hall send -8 dB
  2. motif 1-5-9 on the Rhodes tine voice (It * 1.6): F5, C6, G6 at beats 0, 0.5, 1.5
     after b(29,1) = frames 1808, 1816, 1832 (rhythm from Cinetic's signature)
  3. soft sub: sine F1, attack 30 ms, exp(-t/0.9), peak -14 dBFS
tail: everything decays through the hall (2.4 s) to below -60 dBFS by f 1880;
      master fade over the last 1.3 s; last 480 samples digital zero
```

Bookend: the film opens with the message ping's C6 to F6 fourth and closes with a motif built on the same notes (F5, C6, G6). The logo is the most resolved moment, not the loudest.

---

## 4. Scheduling from the shared timeline, and the sync audit

### 4.1 One timeline file, read by picture and sound

Create `remotion/<film>/timeline.ts` (name per the picture agent; promo3's pattern of a pure data module that Node 24 imports directly with type stripping). Rules: no React, no CSS, no enums or namespaces (type stripping cannot handle them), every frame computed from `b()` or from the same spring and ease constants the scenes animate with.

```ts
export const FPS = 30;
export const BPM = 112.5;
export const BEAT = (60 / BPM) * FPS;        // 16
export const BAR = BEAT * 4;                 // 64
export const SR = 48000;
export const SPF = SR / FPS;                 // 1600 samples per frame
/** bar 1-based, beat 0-3, sub = 16th 0-3. Always an integer at this tempo. */
export const b = (bar: number, beat = 0, sub = 0) => ((bar - 1) * 4 + beat) * BEAT + sub * (BEAT / 4);
export const TOTAL = b(30, 2);               // 1888

export const SECTIONS = [
  { id: "hook", bars: [1, 4], role: "hook", level: 0.62 },
  { id: "pain1", bars: [5, 6], role: "pain", level: 0.6 },
  { id: "sol1", bars: [7, 10], role: "solution", level: 0.85 },
  // ... pain2, sol2 (role "payoff", level 1.0), pain3, sol3, urgency, cta, logo
] as const;

export const CHORDS: string[] = ["Dm9", "Dm9", "Bbmaj7#11", "Gm9 C9sus4", /* one per bar */];

export type SfxKind = "ping" | "buzz" | "key" | "tap" | "whoosh" | "scan" | "save" | "stamp" | "logo";
export type Cue = {
  id: string;          // unique, also the seed
  f: number;           // absolute frame; fractional allowed for keys
  kind: SfxKind;
  weight?: number;     // 0..2, scales level by 20*log10(weight)
  variant?: "word" | "space" | "return";
  dur?: number;        // whoosh: frames
  apexFrac?: number;   // whoosh: where the apex sits in its length
  pan?: [number, number]; // whoosh travel
  offgrid?: string;    // reason, when a music-locked cue is off the 16th grid
};
export type VoLine = { id: string; from: number; to: number; text: string };
export const VO_LINES: VoLine[] = [/* §5.1 */];
export function cues(): Cue[] { /* built from scene constants, sorted by f */ }
```

Scenes export what the sound needs, computed by the same code that moves the picture (`STAMP_CONTACT = from + hit(start, SPR.stamp, 1)`, `WHIP_APEX = from + peak(a, b, E.whip)`, `KEY_FRAMES = charTimes(...)`), and `cues()` collects them.

### 4.2 Placing sounds on exact samples

```js
const at = (f) => Math.round(f * SPF);          // f 1808 -> sample 2 892 800, exact
// every voice returns { L, R, anchor }: anchor = index of the sample that belongs on the cue
// (onset for transients, apex for the whoosh, first note for the logo chord)
const LEAD = { tap: 480, save: 480 };            // clicks lead the visible press by 10 ms
function place(bus, voice, cue) {
  const start = at(cue.f) - voice.anchor - (LEAD[cue.kind] ?? 0);
  // add with a 6 ms cos^2 fade on the voice's last samples; never write outside [0, total)
}
```

- Music notes use the same integers: a note on bar n beat k starts at `((n-1)*4 + k) * 25600` samples. Cues placed with `b()` and notes therefore share sample positions exactly.
- Grid check (fails the script): every cue with a music relationship (lift, stops, logo, clock) satisfies `f % 4 === 0`, unless it carries `offgrid`. Picture-computed cues (`hit`, `peak`, `settleOf`, key frames) are exempt.
- Bounds check: every cue inside `[0, TOTAL − fadeFrames − 1]`; Stamp, ping and logo events never inside the master fade.
- Write a manifest `out/qa/film-sound-cues.json`: for each cue `{id, kind, f, expectedSample, anchor, startSample, lengthSamples, gainDb, seed, note}`. The audit reads it.

### 4.3 Stems (needed for the audit and for the VO swap)

The script writes, all stereo 48 kHz, exactly `TOTAL / FPS` seconds, summing to the pre-master mix: `music.wav` (Rhodes, pad, sub, drums, delay, hall, with every duck applied), `sfx.wav` (effects with their room), `vo.wav` (silence until a recording exists), plus `mix.wav` (mastered, the file the composition plays). Stems go to `out/stems/`; only the mastered mix goes to `remotion/public-<film>/audio/`.

### 4.4 The sync audit (`scripts/audit-film-sound.mjs`)

Three checks, each must pass:

1. **Scheduling identity (exact).** For every manifest entry, `startSample + anchor + lead === round(f * 1600)`. Tolerance 0 samples. This proves the frame to sample math, independent of DSP.
2. **Onset on the isolated voice (≤ 1 ms).** Re-synthesise each cue alone (deterministic, same seed) into a silent buffer, and find the onset: the first sample where `|x|` reaches −20 dB relative to that voice's peak, refined backwards to where a 1 ms RMS rises above −40 dB relative. Expected: the cue sample minus lead (±48 samples). For the whoosh: the 10 ms RMS maximum must be within ±45 ms (±2 160 samples) of the apex sample.
3. **Onset in the real mix (≤ 1 frame, target ≤ 10 ms).** On `sfx.wav` and on `mix.wav`, compute a band-limited onset function in the event's own band (keys and ticks 1.5 to 6 kHz, ping and scan 1 to 3 kHz, buzz 150 to 600 Hz, Stamp 60 to 400 Hz): biquad band-pass, 2 ms RMS frames at a 1 ms hop, positive first difference in dB. In the window `[cue − 3 f, cue + 3 f]` take the maximum. Pass: within ±1 frame (±1 600 samples); report the delta in ms. Also report the event's level over the local bed in that band (50 ms after onset in `sfx.wav` against the same window of `music.wav`): warn under +6 dB (except the whoosh, which is felt).

Output `out/qa/film-sound-audit.json` and a table on stdout: id, kind, frame, expected sample, measured delta (ms), band margin (dB), pass. Exit 1 on any failure.

Picture side (the sound agent cannot see): stills at `cue − 1`, `cue`, `cue + 1` for each lift, Stamp, scan lock and the logo (`npx remotion still <Comp> out/qa/f<n>.png --frame=<n>`): the change must be visible on the cue frame.

After render: if the bundled ffmpeg can decode the MP4's audio without a filter graph (`ffmpeg -i film.mp4 -vn -c:a pcm_f32le decoded.wav`; it may refuse the sample format conversion), cross-correlate `decoded.wav` against `mix.wav` over the first 5 s in our code: lag must be ≤ 48 samples (1 ms). If it cannot decode, rely on the WAV-side checks and the WAV true peak margin (§6).

### 4.5 Determinism

- PRNG: mulberry32, seeded from FNV-1a of `cue.id` (effects) or `section:bar:beat:voice` (music). No shared global seed: the current script's single running seed makes every sound depend on how many sounds came before it.
- Fixed iteration order (cues sorted by `f`, then `id`), Float64 throughout, no `Date`, no `Math.random`, no environment-dependent paths in the output.
- After writing, print the SHA-256 (`node:crypto`) of each WAV. Two consecutive runs must print identical hashes; the audit checks it.
- Output 24-bit PCM, no dither (dither would need noise; seeded TPDF is acceptable if added later).

---

## 5. Voiceover readiness

### 5.1 Plan the VO now, in the timeline

`VO_LINES` lists the planned lines with frame windows, even with no recording. Budget at a calm 2.4 words a second, plus 0.3 s:

| Section | Window | Max words |
|---|---|---|
| Hook | b(2) to b(4) | 10 |
| Each pain | b(p, 1) to b(p+1, 3) | 8 |
| Each solution | two lines: b(s, 1) to b(s+1, 3); b(s+2, 1) to b(s+3, 2) | 8 + 6 |
| Urgency | b(23, 1) to b(25, 2) | 10 |
| CTA | b(27, 1) to b(28, 3) | 8 |
| Logo | none: the resolve owns it | 0 |

Keep-outs: no VO line overlaps a lift gap (`b(lift) − 8 f` to `b(lift) + 8 f`), the urgency stop, or `b(29)` onwards. Pings, buzzes, scan beeps and Stamps are placed in the gaps between lines (at least 250 ms clear of a syllable); tap ticks may sit under VO at −2 dB; keys under VO switch to `muted`.

### 5.2 The room that is always reserved (with or without VO)

- The pad's static −2 dB at 2.5 kHz (§2.3 B).
- Inside every VO window, even before a recording exists: no Rhodes fills or tine notes, no anticipations, shaker reduced to 8th accents, the motif never plays. Rhodes chords only, which leaves 1 to 4 kHz mostly to the voice.
- With `voMode: "off"` (now) the music is **not** ducked: ducking a film with no voice just makes holes. The arrangement rules above are the reservation.

### 5.3 The duck envelope (keyed from the planned windows, deterministic)

Applied to the music bus only when `voMode` is `"guide"` or `"live"`:

| Parameter | Value |
|---|---|
| Broadband depth | −6 dB |
| Speech band carve | additional peaking EQ −4 dB at 2.5 kHz, Q 0.8 (covers about 1 to 4 kHz), applied with the same envelope (crossfade between the dry and the EQ'd music bus) |
| Effective dip in the speech band | about −10 dB |
| Timbral carve | Rhodes tine index × 0.6 and pad cutoff × 0.85 inside windows |
| Attack | starts 150 ms before the line, 120 ms raised cosine (fully down 30 ms before the first syllable) |
| Hold | to the line end + 120 ms |
| Release | 600 ms raised cosine |
| Bridging | gaps under 0.9 s between lines stay ducked |
| Live mode refinement | the window is the recording's real speech span (first and last sample above −45 dBFS), not the planned one |

Why these numbers: listening tests on commentary over music recommend at least 10 LU between voice and music; experts chose 11.5 to 17 LU. A shallow broadband duck (practitioners keep commercial ducking light so it does not pump) plus a band carve gets the voice band 10+ dB clear without the whole bed sinking audibly.

### 5.4 Levels with VO

| Element | Target |
|---|---|
| VO stem (before the master) | −16 LUFS integrated measured over the VO windows; sample peak ≤ −4 dBFS; short-term max ≤ −13 LUFS |
| Music under VO | short-term at least 10 LU, ideally 12 LU, under the VO's short-term loudness (the audit measures both in 3 s windows inside each VO line) |
| Effects under VO | none above −2 dB vs music; keys `muted` |
| Final mix | −14 LUFS integrated, the VO lands about −14.5 LUFS in the master |

VO chain, in code: high-pass 80 Hz (2nd order); RMS compressor 3:1 above −24 dBFS, 10 ms detector, 5 ms attack, 80 ms release; high shelf +2 dB at 4 kHz; then gain to −16 LUFS (BS.1770 over the windows).

### 5.5 Guide VO for auditioning (never shipped)

`voMode: "guide"` renders a speech-shaped placeholder into each window so the duck, the masking and the loudness can be checked now: seeded pink noise band-passed 300 Hz to 3.4 kHz with a +4 dB bump at 1.5 kHz, amplitude-modulated at 4.5 Hz (syllables, `0.5 + 0.5*sin`, seeded phase jumps every 0.35 to 0.6 s for word gaps), gained to −16 LUFS over its windows. Written to a separate `mix-guide.wav`; the shipped `mix.wav` stays VO free.

### 5.6 Swapping in a real recording (no picture change)

1. Record each line as its own file, `assets/vo/<line id>.wav`, 48 kHz mono, 24-bit, reading to the picture (or to a 112.5 BPM click). Use 48 kHz: the bundled ffmpeg may not resample, and the script should refuse other rates rather than resample silently (a windowed-sinc resampler can be added later if needed).
2. A dependency free WAV reader (RIFF chunks; PCM 16, 24 or 32-bit float) loads each file; leading silence is trimmed to the first sample above −45 dBFS minus 20 ms.
3. The take is placed at its line's `from` frame. If it overruns `to` by more than 0.25 s, the script fails and names the line: shorten the read or the copy, or nudge `from` by up to 4 frames inside the gap. The picture never moves.
4. Set `voMode: "live"`. The duck re-keys from the real speech span; the VO chain runs; the master re-normalises the whole film to −14 LUFS (the bed will come down by about 1.5 dB on its own).
5. Re-run the audit and the loudness gate (§6). Also check the VO keep-outs: the audit lists any effect within 250 ms of a syllable.

---

## 6. Loudness and verification

### 6.1 Target: −14 LUFS integrated, true peak −2.0 dBTP on the WAV (−1 dBTP after AAC)

**Recommendation: −14 LUFS integrated** for the full film and the cutdown, one master for every destination.

- YouTube, Instagram, TikTok and similar normalise loud uploads down to about −14 LUFS and do not turn quiet ones up. A −16 master plays 2 dB quieter than everything around it in a feed; a −14 master plays at the feed's level.
- The landing page `<video>` has no normalisation at all; −14 is the level people are used to from every other web video, so unmuting does not startle or disappoint.
- −16 is the right call only for a short sting (8 s or less) or podcast audio. The calm of this film lives in the arrangement (no drums in pains, soft kick, real gaps, LRA 5 to 8 LU), not in a lower master.
- With VO later the target stays −14; the master gain recomputes.

**True peak:** ceiling 0.77 linear (−2.27 dBFS) in the limiter, measured ≤ −2.0 dBTP on the WAV at 4× oversampling. AAC adds 0.5 to 1 dB of inter-sample peak, which keeps the encoded file at or under −1 dBTP (AES streaming guidance).

**Other gates:** LRA 5 to 8 LU; momentary maximum at the payoff (b(13) ± 2 s), 3 to 5 LU over integrated; limiter gain reduction ≤ 1.5 dB at the payoff and ≤ 3 dB anywhere; pains and hook 4 to 6 LU under the solutions (short-term); end card 8 to 20 dB under the film's momentary maximum; first 3 ms a raised-cosine fade from zero; the last 50 ms under −45 dBFS and the last 480 samples exactly zero.

### 6.2 The measurement code (extending the existing `lufs()`)

The current function is correct BS.1770 for one channel at 48 kHz (the K-weighting coefficients are the standard's 48 kHz values; they are wrong at any other rate). Extend it:

```js
// K-weight each channel with the existing two biquads, then:
// mean square per 400 ms block, 100 ms hop (75% overlap), SUMMED across L and R (weights 1.0)
const blockMS = (kL, kR, blk, hop) => { /* z[j] = mean(kL^2) + mean(kR^2) over block j */ };
const L = (z) => -0.691 + 10 * Math.log10(z);

function integrated(z400) {                       // ITU-R BS.1770-4
  const abs = z400.filter((z) => L(z) > -70);
  const rel = L(mean(abs)) - 10;
  return L(mean(abs.filter((z) => L(z) > rel)));
}
const momentary = (z400) => z400.map(L);          // max and its time: the payoff check
function lra(z3000) {                             // EBU Tech 3342: 3 s blocks, 100 ms hop
  const abs = z3000.filter((z) => L(z) > -70);
  const rel = L(mean(abs)) - 20;
  const st = abs.filter((z) => L(z) > rel).map(L).sort((a, b) => a - b);
  return pct(st, 0.95) - pct(st, 0.10);
}
function truePeak(x) {                            // 4x oversampling, BS.1770-4 Annex 2 style
  // polyphase FIR: 4 phases x 16 taps, windowed sinc (Hann), cutoff at the original Nyquist;
  // TP = max over all phases and samples of |y|, reported as 20*log10(TP) dBTP
}
```

Self-tests the script runs before trusting its own numbers (fail loudly):

| Test signal | Expected |
|---|---|
| 1 kHz sine, −23 dBFS peak, both channels, 20 s (EBU Tech 3341 case 1) | −23.0 LUFS ±0.1 |
| the same at −33 dBFS (case 2) | −33.0 LUFS ±0.1 |
| sine at 12 kHz, phase π/4, amplitude 1.0 (samples peak at 0.707) | sample peak −3.01 dBFS, true peak 0.0 dBTP ±0.2 |
| 20 s of 1 kHz at −23 dBFS followed by 20 s of silence | −23.0 LUFS (gating ignores the silence) |

### 6.3 Mastering procedure

1. Sum the stems; 20 Hz DC-blocking high-pass; mono-sum below 120 Hz (mid/side: high-pass the side at 120 Hz).
2. Bus glue: 2:1 above −14 dBFS, 5 ms RMS detector, 15 ms attack, 120 ms release, at most 2 dB of reduction.
3. Loop (at most 8 passes): apply gain g; run the true-peak limiter (4 ms lookahead = 192 samples, detection on the 4× oversampled signal, required gain = min(1, ceiling / |peak|), sliding-window minimum over the lookahead, raised-cosine ramp into it, one-pole release τ 80 ms); measure integrated; `g += target − measured` until within 0.05 LU.
4. Edge fades (3 ms in from zero, 1.3 s music fade, last 480 samples zero), write 24-bit stereo.
5. Re-measure the written file (after quantisation) and print: integrated, momentary max and its time, short-term per section, LRA, true peak, limiter max gain reduction and where, SHA-256. Exit 1 if any §6.1 gate fails.

Replace the current `soft()` tanh "limiter": it starts bending the signal at 55% of the ceiling, which at −14 LUFS would saturate the whole bed, not just the peaks.

---

## 7. DSP building blocks (dependency free)

| Block | Recipe |
|---|---|
| PRNG | mulberry32 (already in the script) seeded per voice with FNV-1a 32-bit of a string |
| Sine / FM | phase accumulators `ph += 2*pi*f/SR`, wrapped to [0, 2π) every sample |
| PolyBLEP saw | `y = 2*p - 1 - blep(p, dt)`, with `blep(t,dt) = t<dt ? (t/=dt, 2t - t*t - 1) : t>1-dt ? (t=(t-1)/dt, t*t + 2t + 1) : 0` |
| State-variable filter (TPT) | `g = tan(pi*fc/SR), k = 1/Q, a1 = 1/(1+g*(g+k)), a2 = g*a1, a3 = g*a2`; per sample `v3 = x - ic2; v1 = a1*ic1 + a2*v3; v2 = ic2 + a2*ic1 + a3*v3; ic1 = 2*v1 - ic1; ic2 = 2*v2 - ic2`; LP = v2, BP = v1, HP = x - k*v1 - v2. Stable under fast cutoff sweeps |
| Biquads | RBJ cookbook (peaking, shelf, HP, BP) for static EQ and the audit's band filters |
| Pink noise | Paul Kellet: `b0 = .99765*b0 + w*.0990460; b1 = .96300*b1 + w*.2965164; b2 = .57000*b2 + w*1.0526913; p = b0 + b1 + b2 + w*.1848` |
| Hall / room | 8-line feedback delay network, delays 1427, 1693, 1951, 2203, 2477, 2741, 3011, 3307 samples, Hadamard mixing, line gains `10^(-3*d/(SR*T60))`, one-pole damping 6 kHz in each loop, input high-pass 250 Hz, predelay 18 ms; L = even lines, R = odd lines. Hall T60 2.4 s (music), room 0.7 s (effects) |
| Ping-pong delay | two buffers of 19 200 samples cross-fed, feedback 0.32, one-pole low-pass 3 kHz in the loop |
| Envelopes | raised cosine ramps `0.5 - 0.5*cos(pi*u)` for every duck, fade and gate; exponentials `exp(-t/tau)` for decays (−20 dB at 2.3 τ, −60 dB at 6.9 τ) |
| Pan | constant power: `L = cos((p+1)*pi/4), R = sin((p+1)*pi/4)` |

Performance: about 63 s of stereo at 48 kHz is 6 million samples; the FDN, filters and FM run in well under a minute in Node 24. Render voices into their own short buffers and sum, so nothing runs per sample over the whole film except the buses.

---

## 8. Files, order of work, acceptance gate

Files (names are proposals; the picture agent owns the timeline's location):

| File | Purpose |
|---|---|
| `remotion/<film>/timeline.ts` | FPS, BPM, `b()`, `SECTIONS`, `CHORDS`, `cues()`, `VO_LINES` (shared with the picture) |
| `scripts/make-film-sound.mjs` | synthesis, mix, master, stems, manifest; `node scripts/make-film-sound.mjs [full|cut] [--vo off|guide|live]` |
| `scripts/lib/dsp.mjs`, `scripts/lib/loudness.mjs` | the §7 blocks and §6.2 meter, shared with the audit |
| `scripts/audit-film-sound.mjs` | §4.4 sync audit, §5 VO checks, determinism hash check |
| `out/stems/*.wav`, `out/qa/film-sound-cues.json`, `out/qa/film-sound-audit.json` | QA artefacts (not shipped) |
| `remotion/public-<film>/audio/film-mix.wav` | the one file the composition's `<Audio>` plays, at volume 1, starting at frame 0 |

Order of work:
1. Meter first: port `lufs()` to stereo, add momentary, LRA and true peak; pass the §6.2 self-tests.
2. Timeline: tempo constants, sections, chords, a skeleton `cues()`; grid check.
3. Music: Rhodes, pad, sub; then rim, shaker, kick, clock; arrangement table §2.4; the lift §2.5. Render music only and check the arc (short-term per section, LRA).
4. Effects §3, placed from the manifest; audit §4.4.
5. Master §6.3; full gate.
6. Guide VO pass (`--vo guide`): check the duck, the 10 LU margin and the keep-outs.
7. Cutdown: build its picture from whole bars at the same tempo (30 s is 14 bars = 29.87 s) and re-score it from its own sections; never splice the full film's music.

Acceptance gate (all must pass):
- Integrated −14.0 ±0.5 LUFS; true peak ≤ −2.0 dBTP (WAV); LRA 5 to 8 LU; momentary max within 2 s of b(13); limiter ≤ 1.5 dB at the payoff.
- Scheduling identity 0 samples; isolated onsets ±1 ms; in-mix onsets within ±1 frame, median ≤ 10 ms; every non-whoosh effect at least +6 dB over the bed in its band.
- Two runs produce identical SHA-256 hashes.
- Every Stamp, every tap and every key run sounds the same class at the same level (coverage).
- Guide VO: music at least 10 LU under the voice in every line; no effect within 250 ms of a syllable except taps and muted keys.

---

## 9. Findings about the current script

From `scripts/make-promo2-sfx.mjs` (the v2 and v3 promos), to fix in the new engine, not in that file:

1. **Mono output, measured as mono.** The WAV is mono and its −20 LUFS target is measured on one channel. Remotion's AAC output is stereo with the channel duplicated, and BS.1770 sums the two channels, so the shipped promo likely measures about 3 dB louder (around −17 LUFS) than the script reports. Render and measure stereo.
2. **The "soft limiter" is a saturator.** `soft()` bends everything above 0.55 of the ceiling; it is fine at −20 LUFS on sparse effects but would colour a −14 LUFS music bed. Use the lookahead true-peak limiter of §6.3.
3. **No true peak measurement.** Only sample peak is printed; inter-sample peaks after AAC can exceed it by 0.5 to 1 dB.
4. **One running seed.** Every sound's randomness depends on how many sounds came before it, so moving one cue changes every later key click. Seed per cue id.
5. **Hand-offset Stamp cue.** `CERT.stamp + 3` and `TRAIN.stamp + 3` are typed offsets; compute the contact frame with `hit()` from the Stamp's spring.
6. **Untuned effects.** The tick (1.2 kHz), beep (1.5/2.1 kHz) and thud (55 Hz) are not in any key; the bed is in A. Every pitched sound in v3 follows F major and the chord under it.
7. **One-pole filters only.** Adequate for v2; the bed needs the state-variable filter (resonance and clean sweeps) and RBJ biquads (EQ carve).

---

## Sources

- [Torcoli et al., preferred levels for background ducking with clear speech (FAU)](https://cris.fau.de/publications/234640600) and [Loudness differences for voice over voice in TV and streaming (Salford)](https://salford-repository.worktribe.com/output/1341554/loudness-differences-for-voice-over-voice-audio-in-tv-and-streaming): at least 10 LU commentary over music; experts 11.5 to 17 LU.
- [Gearspace: ducking (TV spot mixers keep ducking under about 3 dB of gain reduction, fast times)](https://gearspace.com/threads/ducking.124469/) and [Vindral sidechain ducking docs (attack and release behaviour)](https://composer-docs.vindral.com/operators/operators-sidechain-ducking.html).
- [OpenClip: LUFS targets by platform](https://openclip.app/learn/audio-normalization), [Opus: loudness normalisers for social video](https://opus.pro/blog/best-loudness-normalizers): about −14 LUFS for YouTube and short form, quieter content not turned up; −16 associated with podcasts.
- [baken: true-peak ceiling notes citing AES TD1008 (−1 dBTP at the codec input)](https://docs.rs/crate/baken/3.0.2/source/docs/true-peak-ceiling.md).
- [Attack Magazine: FM electric piano](https://www.attackmagazine.com/technique/tutorials/fm-electric-piano/) (high-ratio modulator for the tine, carrier envelope for the body, velocity to modulation level).
- Cinetic skill `references/sound.md` §5, §8, §9, §12, §13 and `references/timing-grid.md` §2, §7, §9 (measured norms of launch films, typing and click recipes, gates).
