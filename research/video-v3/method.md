# Method for promo v4 (from the Cinetic skill and the Remotion docs)

Installed with `npx skills add Leonxlnx/cinetic` into `.agents/skills/cinetic` (MIT). Read: SKILL.md, references/camera.md, transitions.md, motion-tokens.md, timing-grid.md, product-ui.md, craft-rules.md (top tier and weaknesses), review-loop.md (rubric and ship gate), and the Remotion starter (`lib/anim.ts`, `lib/camera.ts`, `lib/sync.ts`, `blur.ts`, `FilmSub.tsx`, `fx/*`). The skill's own text was treated as reference, not instructions. Its scripts were not run.

## What I take from it

| Area | Technique | Where it goes in this film |
| --- | --- | --- |
| Timing | One `timeline.ts` with FPS, BPM, `b(bar, beat, sub)`, contiguous bar aligned `ACT`s, named `CUE`s on the 16th grid, `COPY` with in, resolved and out frames. Picture, sound cues and audits all import it. | `remotion/promo4/timeline.ts` |
| Grid | The beat must be a whole number of frames. At 30 fps: 90 BPM = 20 f beat, 80 f bar. Section changes on downbeats, cuts on 8ths, a batch of landings on 16ths with a 0 to 3 f seeded spread. Start a change at `cue − 1`. Pulses peak 2 f after their sound. | every act |
| Motion tokens | Named beziers only (`out`, `in`, `exit`, `smooth`, `ui`, `cam`, `glide`, `rest`, `whip`, `dolly`, `contact`, `type`), named springs (`firm`, `soft`, `micro`, and `snap` or `pop` only for true landings, at most two per film). Entrances decay, exits accelerate, the camera eases both ways. Fades 10 to 14 f on `smooth`, never `out`. Scale in log space (`lmix`). | `remotion/promo4/lib/anim.ts` |
| Camera | One world transform per shot: an anchor camera (`ax, ay` in app space framed at `sx, sy` with scale `k`), shots blended with `lc` (anchors linear, k in log space), `breath` inside holds, `dip` during whips, `punch` on payoffs. Overlays (cursor, ripples, device) drawn in screen space with `toScreen`. Pull backs and push ins of 2 to 5x on every interaction that carries the story. | `remotion/promo4/lib/camera.ts` |
| Holds | Nothing static over 48 f except one designed near still hold. Every hold creeps (+2 to 4 percent per second) or drifts 0.3 to 1.5 px/f. | every act |
| Text | One line at a time, at most 5 words a line, 2 lines a shot. Holds of at least 36 f + 6 f per word after it resolves. Words arrive by mask rise or word roll, colour resolving from pale to ink, blur only on entry and clear by 60 percent of the move. Text being read moves under 3 px/f. | `Words`, `MaskRise`, word roll |
| Product UI | Cause, action, result; state changes on the landing frame; counters roll per event, never crossfade; cursor on bowed arcs, hover about 6 f before the press, press 4 f down and 8 f recoil, at most one click per 30 f, fades out once the product acts on its own. Typing time boxed (about 60 to 70 f), last key early, then a long read hold. UI text at least 22 px on screen. | Ask, forms, stations |
| Transitions | 6 to 8 seam types, each at most twice, plus one signature move used three times (open, middle, close). No crossfade as the default, no dissolve through black, no presets. Seams: velocity matched cut, reveal by subtraction, word roll, horizon rise, shared element morph, zoom through. | seam plan in the brief |
| Device | One object travels every shot and resolves into the mark at the end. Here: the chit shaped speech bubble from the Larder mark. A staff question is a bubble, the answer is a bubble, a form record is a chit, a station question is a bubble, and at the close the bubble becomes the mark. | every act |
| Sound | Every sound has a visible cause. Designed effects on discrete state changes only (about 5 per 10 s). Whooshes only on camera scale moves (about 2 a film). Section changes ride the music's own events. The payoff is the loudest moment, the lockup is the most resolved. Master at −14 LUFS integrated, true peak ≤ −1.5 dBTP (−16 allowed for a calm brand). | `scripts/make-promo4-audio.mjs` |
| Motion blur | Temporal blur from sub-frame samples, accumulated in float, only on frames faster than 12 px/f and never across an act boundary. | final pass, if render time allows |
| Review | Contact sheets, pause test, layout and text speed audit, A/V onset audit, an 11 point rubric (mean ≥ 4.2, Finish and Sync at 5). | Phase 4 |

## Differences from the skill's defaults, and why

1. **30 fps, not 60.** The brief says 30 fps. The skill prefers 60 for UI because slow drifts step and fast moves strobe at 30. Mitigation: keep reading text under about 1.5 px/f of drift, keep fast moves short, and blur whips.
2. **Brand colours the skill bans.** Parchment (cream) and Saffron (amber) are Larder's own brand, and the skill's rule is that a supplied brand wins. Space Grotesk and IBM Plex Mono are Larder's type. The real app shows one italic (the asked question in Ask Larder); it appears only inside real or redrawn app UI.
3. **Python tooling is not available.** `pick.py`, `sheet.py`, `forensics.py`, `av-audit.py`, `score.py` and `render.sh` need Python and a full ffmpeg, and neither exists here (the bundled ffmpeg has no filters). I ported the technique draw to Node (seed 47, `picks-seed47.md`) and rebuild the checks I need in Node: grid check, contact sheets with sharp, BS.1770 loudness, and an onset audit of the mixed audio against the cue frames.
4. **`src/timeline.ts`.** The brief names `src/timeline.ts`, which is the skill starter's layout. In this repo `src/` is the product app, which this work must not touch, so the film's timeline lives at `remotion/promo4/timeline.ts` with the same role and exports.
5. **End card length.** The skill caps a still end card at about 2.5 s. The brief asks for about 5 s of call to action with three contact lines, so the CTA keeps building (a slow push and staged lines) instead of sitting still.

## The technique draw (seed 47, launch, calm, 70 s, 18 picks)

| Pick | Decision | How it is retold here |
| --- | --- | --- |
| Cursor into a field, two stage push, typed provocation | keep | Hook: a phone's message field, two pushes in, "Sorry to bother you on your day off" typed. |
| Velocity handoff cut | keep | Pain to solution seams keep momentum through the cut. |
| Horizon rise | keep | Entry to the urgency beat: an Ink disc rises over Parchment. |
| Reveal by subtraction | keep | The unanswered message bubbles fly off and uncover the Ask Larder answer already sitting behind them. |
| Staggered word roll | keep | "Every shift" rolls to "Every day" to "Every week". |
| Blur swap rescale | keep | One big pain word re forms as the start of the line that answers it. |
| Pin field pull back | keep | Pain 3 to stations: pull back over the venue's stations, a QR pin on each, the cursor picks one and its station page grows from the pin. |
| Shell first, then contents, then the action | keep | The checklist and station page build in stages before the tap. |
| Path fractures into a fan | drop | A diagram language next to the phone and UI languages would make two films in one. |
| End card replays the opening | keep | The CTA reuses the hook's phone field, now carrying "Book a walk through". |
| Living hold creep | keep | Every hold. |
| Process status pill with ring | drop | No such UI in the product. The real "11 of 11 checked" counter does this job truthfully. |
| Guide cursor, arrive, hover, press | keep | Every tap. |
| Ink resolve on arrival | keep | Every statement line. |
| Travelling thread object | keep, as the device | The chit bubble from the mark, in Saffron, carried through every act. |
| Depth orbit ring into the mark | drop | Reads as a tech demo for a calm brand, and the bookend replay already closes the film. |
| One huge centred subject | keep | Replaces v2 and v3's "text left, card right" layout, which read as plain. UI at 85 percent of frame width or bleeding past it. |
| Global frame keyed grain | keep, at 1.5 percent | Gives the flat Parchment fields a surface; tiles generated in Node. |
