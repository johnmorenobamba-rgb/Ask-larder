# Larder promo v2: creative brief

Composition id `LarderPromo2`, 1920x1080, 30fps, 1150 frames (38.3 s). Silent film, no voiceover. Output `out/larder-promo-v2.mp4`. The existing `ExplainerV2` is untouched.

## Decisions

| Decision | Choice | Source |
| --- | --- | --- |
| Structure | One path through one idea: a new hire closing alone asks, gets the venue's own answer, then hits the supervisor fallback. Then training with the Stamp, then the owner view, then close. | Narrative agent Option A with the Stamp and dashboard borrowed from Option B. References agree: real product in the first seconds, one idea per scene, no offer. |
| Voiceover | None. Captions and on screen text only, with synthesised, very quiet sound design (bed, key clicks, UI ticks, one stamp thud). | Brief default. Flagged to John. |
| Look | Parchment is the working surface (about 80 percent). Ink only for the open and the close. Flat colour, soft Ink tinted shadows, no grain, halftone, duotone, stock b-roll, red screens or tilts. | Visual agent. |
| Red and Saffron | Accents only, under 2 percent of any frame. Red for the Stamp and the one click that leads to it. Saffron for one short rule per headline and click ripples. | Visual agent, CLAUDE.md. |
| Type | Space Grotesk 700 headline 96px, Inter 36px subhead, IBM Plex Mono 22 to 26px labels. Left edge x=160. | CLAUDE.md says Space Grotesk replaced Fraunces (Decision Log 31 Aug 2026), so the brief's Fraunces is not used. |
| Motion | Springs only. Text: no overshoot {26,170,0.8}. Surfaces {28,140,0.9}. Camera overdamped. Stamp {15,260,0.7} with one small overshoot. Hard edged wipe for Ink to Parchment, soft fade for Parchment to Parchment. | Motion agent, visual agent. |
| Existing tap-through | Kept and upgraded: real screenshots, now with smooth arced cursor, press and Saffron or Red click ripple, selection state. | Brief. |
| Claims | Only built features: Ask Larder answers from approved content, fallback goes to a supervisor, owner approves modules, questions sent to a supervisor show on the owner dashboard. No expiry alerts, no legal protection, no price. WWCC left off screen. | Narrative agent, DECISIONS.md. |

## Shot list

| # | Time | Scene | Background | Camera and motion | Copy (no dashes) |
| --- | --- | --- | --- | --- | --- |
| 1 | 0:00 to 0:05.7 | Hook | Ink | Typed headline with blinking caret, then subline blurs in, Saffron rule grows. | "Closing alone for the first time." then "The manager is not picking up." |
| 2 | 0:05 to 0:11 | Staff home | Parchment, hard wipe in | **Zoom out reveal**: starts tight on the greeting, pulls back to show the full home screen. Cursor arcs to the "Ask something." tile and taps (Saffron ripple). Slow push toward the tile as the exit. | "Staff open one screen." / "On the iPad your venue already has." |
| 3 | 0:10.5 to 0:24 | Ask Larder | Parchment, fade in | Typed question with caret, streamed answer word by word, then a second typed question. **Push in** on the fallback answer. Re-created UI in the app's own styling, example text. | Q1 "How do I change the fryer oil?" A1 fryer steps. Q2 "Where is the key to the safe?" A2 "Ask your supervisor for assistance, as they have access to the safe." Captions "Answers from your approved procedures." then "Keys, codes and logins go to a supervisor." |
| 4 | 0:23.9 to 0:30 | Training and Stamp | Parchment | Tap through: cursor selects an answer on the real check question screenshot (Red ripple), cross fade to completion, **Stamp** lands with thud and 6px camera press. Only Stamp in the film. | "Built from your procedures." / "You approve every module first." / "Food safety basics completed" |
| 5 | 0:29.4 to 0:35 | Owner dashboard | Parchment | **Zoom out reveal** from the Escalations tile to the full dashboard, one Saffron outline on that tile. | "You see what staff ask." / "Every question sent to a supervisor shows here." |
| 6 | 0:34.3 to 0:38.3 | Close | Ink, hard wipe in | Mark and wordmark spring in, one line, small URL. No offer, no price, no countdown. | "Answers from your venue. Not from a guess." / asklarder.com.au |

## Sound

`scripts/make-promo2-sfx.mjs` synthesises one mixed WAV from the same timeline file the video uses (so audio and visuals share frame numbers): ambient bed at about -24 dBFS, soft key clicks on every typed character, a tick on each tap, a low whisper on wipes, one stamp thud (loudest cue, about -8 dBFS). No music track, no whooshes, no chimes. All meaning survives with sound off.

## Verification plan

Render, then extract stills every 2 seconds plus key moments (zoom out peak, mid typing, Stamp frames, fallback answer, close), inspect for overflow, clipping, off brand colour, dashes, red overlay or salesy copy. Fix and re-render. Check loudness with the bundled ffmpeg.
