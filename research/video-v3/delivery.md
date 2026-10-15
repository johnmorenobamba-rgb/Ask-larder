# Promo v4: delivery notes

Branch `video-v3`. Compositions `LarderPromo4` (full) and `LarderPromo4Cut` (30 s), registered in `remotion/Root.tsx`
beside v2 and v3. Nothing on main, nothing pushed, nothing deployed, landing page untouched.

## Revision 2 (16 Oct 2026): no phone, upbeat, explosive, trace glow

John asked for four changes after the first cut.

- **Phone number removed** from both videos: the end card now stages the URL then the email. The voiceover script's
  CTA line is now "Book a walk through at ask larder dot com dot au." (window vo13 retimed). `data.ts` and the copy
  audit both fail if a phone number reappears.
- **Upbeat music.** Same 112.5 BPM grid (every picture cue is locked to it), new arrangement: four on the floor,
  claps on 2 and 4, offbeat open hats, a plucked syncopated bass, supersaw chord stabs, the Rhodes kept underneath.
  The pains are filtered builds with a clap roll and a riser; each solution is a drop with an impact; the urgency
  drives into the dead stop; the close drops again and the resolve hits with the logo. The groove rests for 3 frames
  around every sound effect (and a stab rests if its delay echo would land on one), and the music dips 5 dB under
  each effect, so taps, keys and confirms stay crisp. Drops sit about 2 LU over the builds (LRA 4.4).
  If you want it faster, 120 BPM is the next tempo that lands on whole frames; it would shorten the film to about
  69 s and means retiming everything.
- **More dynamic, explosive motion**, from one energy layer (`fx/Energy.tsx`, timed only by `timeline.ts` PUNCH and
  DROPS, the same list the audio reads):
  - a camera punch on all four drops (8.5 % with a small roll), on every tap, word roll and kinetic line, and on the groove's
    downbeats inside the solutions; the still hold on the supervisor line stays still;
  - a Saffron shockwave ring with a Parchment echo and a warm flash at each drop, from the point the next scene opens out of;
  - every caption slams in (1.55x, motion blur, a small overshoot, words 2 frames apart) instead of rising;
  - snappier camera curves and springs film wide, and the irises open in 12 frames instead of 18.
- **Trace glow on the logo.** The end card's mark now runs the product's own `ChitMark` idle trace: a glowing Saffron
  segment, 22 % of the outline, lapping every 2.6 s, with the 3.5 % breathing scale. It ignites on the resolve: the whole
  outline draws in and flashes (ChitMark's hero beat), then shrinks into the travelling segment over the splash's ambient
  Saffron glow. Choice made: the mark keeps its solid Parchment fill under the trace, so the lockup stays legible. The
  product's splash shows the outline only; say if you want that ghosted version instead.
- **Audit change, disclosed.** The denser bed exposed a flaw in the sound audit's onset detector (the largest dB step,
  which tiny hat transients out of near silence could outvote). It now finds where the event's own rise crosses
  halfway from the bed to its peak. The pass rule is unchanged (within one frame); measured result: every cue within
  8.7 ms in the mix and 1.7 ms in the effects stem.

## Files

| File | Runtime | Notes |
| --- | --- | --- |
| `out/larder-promo-v4.mp4` | 73.5 s (2206 f) | 1920x1080, 30 fps, H.264 CRF 16, AAC 48 kHz stereo |
| `out/larder-promo-v4-30s.mp4` | 29.3 s (878 f) | same picture, three ranges cut on the beat, its own master |
| `remotion/public-promo4/audio/promo4-mix.wav` | 73.5 s | master, -14.0 LUFS, -2.3 dBTP |
| `remotion/public-promo4/audio/promo4-cut-mix.wav` | 29.3 s | master, -14.0 LUFS, -2.3 dBTP |
| `out/v4/stems/` | | music, sfx, an empty vo stem, music ducked under a guide voice, the guide voice, a guide mix |
| `out/v4/qa/` | | sound cue manifests, sound audits (full and cut), build log |
| `out/v4/final/` | | contact sheets and key frames used for the visual check |

Rebuild everything: `node scripts/make-promo4-audio.mjs`, then `node scripts/audit-promo4-sound.mjs`,
`node scripts/audit-promo4-sound.mjs cut`, `node scripts/audit-promo4-copy.mjs`, then the two renders
(commands at the top of `remotion/promo4/Film.tsx`).

## Beat table, full film (112.5 BPM, 1 bar = 2.13 s)

| Time | Bar | Shows |
| --- | --- | --- |
| 0:00 | 1 | Ink. Three staff questions arrive one by one in a dark message thread: fryer oil, fridges, flat beer |
| 0:03.7 | 2 | "Every shift, the same questions." |
| 0:06.1 | 3 to 4 | Pull back: the thread is on the owner's phone |
| 0:09.1 | 5 | A new message: "Sorry to bother you on your day off". "Your day off. Their question." |
| 0:10.7 | 6 | Push into the phone |
| 0:12.8 | 7 | Iris out of the fryer question; the chit drops into the Ask Larder input |
| 0:14.4 | 7 | Tap Ask; the real fryer answer streams in |
| 0:16.0 | 8 | "From procedures you approved." |
| 0:19.2 | 10 | "Where is the key to the safe?" typed in |
| 0:20.8 | 10 | Fallback answer: "Ask your supervisor for assistance, as they have access to the safe." / "Keys and safes go to a supervisor." Held still for two bars |
| 0:25.1 | 12 | Whip down off the panel (motion blur) into Ink |
| 0:25.6 | 13 to 14 | "Have the fridges been checked?" / "Every shift. Every day. Every week." (word roll) |
| 0:29.9 | 15 | Iris into the forms hub; tap the cleaning checklist; it grows out of its card |
| 0:32.0 | 16 | "Mark the rest as pass": 11 rows pass in a cascade. "Three taps. Nothing typed." |
| 0:33.6 | 16 | Save record. "When everything passes." TAPS counter reads 3 |
| 0:36.3 | 18 | Slide to the walk in cool room temperature log; type 8 |
| 0:37.3 | 18 | Out of range, a note is required. "No note, no save." |
| 0:38.4 | 19 | Tap a quick note; Save reading; "1 reading saved. 1 was out of range and flagged for the owner." |
| 0:41.1 | 20 | Match cut into the owner dashboard tile, pull back. "Flagged on your dashboard." |
| 0:44.8 | 22 | Rack focus to the cellar photo. "Why is the beer pouring flat?" / "First shift in the cellar." |
| 0:46.9 | 23 | Viewfinder brackets lock on the station QR. "Scan the station." Scan beep |
| 0:49.1 | 24 | Zoom through the code into the Cellar station page; the chit docks into Ask |
| 0:51.2 | 25 | Tap Troubleshooting; the real issues build in |
| 0:52.8 | 25 to 26 | "Its own fixes, at the station." Push down to "If this doesn't fix it, stop and ask your supervisor for help." |
| 0:56.5 | 27 | An Ink disc rises over the page |
| 0:57.6 | 28 | "Tonight, someone closes without you." |
| 0:59.7 | 29 | An empty question bubble with typing dots. "Who do they call?" |
| 1:03.7 | 30 | Music stops for one 8th |
| 1:04.0 | 31 | The bubble answers: "Book a walk through" |
| 1:05.1 | 31 to 32 | asklarder.com.au, then hello@asklarder.com.au (no phone number since revision 2) |
| 1:08.3 | 33 | The bubble morphs into the Larder mark; the wordmark slides out |
| 1:09.3 to 1:13.5 | 33 to 34 + tail | Lockup hold, slow dolly, logo resolve chord, 1.3 s fade |

## Beat table, 30 s cutdown

| Time | Source | Shows |
| --- | --- | --- |
| 0:00 | 0:08.5 to 0:23.5 | The day off message, Ask Larder, the fryer answer, the safe question, the supervisor fallback |
| 0:14.9 | 0:32.0 to 0:35.7 | The checklist cascade, Save record, "Three taps. Nothing typed." |
| 0:18.7 | 1:02.9 to 1:13.5 | The empty bubble, the music stop, "Book a walk through", contacts, lockup |

The urgency lines are hidden in the cut, because two lines need their own two bars to be read. Each splice keeps
the beat phase, and the audio is the same mix spliced at the same frames, then remastered.

## Rebuilt screens (all labelled on screen "Example venue. Screens redrawn from the app.")

- Ask Larder sheet: redrawn from `src/components/staff/AskLarderChat.tsx`. Sits over the real capture `ask-larder-useful-3.png`
- Cleaning checklist: redrawn from the generic compliance form, with real strings
- Temperature log card: redrawn from the real app, with real strings and the real out of range copy
- Station hub (Cellar): redrawn from `station/[qrCodeSlug]/page.tsx`, with real counts read from the database
- Troubleshooting page: redrawn from `station/[qrCodeSlug]/troubleshooting/page.tsx`, with the real approved issue text
- Phone message thread (hook): invented names and messages, labelled "Example venues. Invented names."
- QR sticker: a real code that decodes to `https://asklarder.com.au/` (checked on a rendered frame)

Real captures used as they are: the forms hub, the owner dashboard (labelled "Real screen"), the Ask Larder backdrop.
The cellar photo is a stock photo, labelled "Stock photo".

## Assumptions and deviations

- **Timeline location.** It lives at `remotion/promo4/timeline.ts`, not `src/timeline.ts`, because `src/` is the product app. Picture, audio build and audits all import it.
- **No new captures.** The brief asked for high resolution recaptures, but logging in to the demo needs a PIN, and I don't enter credentials. I used the existing 2x capture library (2048x1536) and rebuilt screens from the real components.
- **The cellar station** comes from the second demo venue (The Coachman's Arms Hotel). Saltbush Corner Kitchen has no cellar station.
- **Frame rate.** 30 fps, as the brief says. Cinetic prefers 60 fps.
- **Brand exceptions.** Cinetic bans cream and amber. Parchment and Saffron are brand colours, so I kept them.
- **No Stamp.** The film has no completion, certificate or e-signature moment. Per CLAUDE.md the Stamp only appears at those, so it does not appear.
- **No savings estimate.** The brochure's $5,520 figure needs its estimate label to be read, and 5 s is too short for that. I used cost of waiting only. No countdown, discount or scarcity.
- **Timings changed from the brief.** Hook 6.4 s (three questions need three bars), urgency 6.4 s, close 8.5 s with a 3 s hold, after the reference research found an end hold of at least 3 s. Forms gets 7 bars as the payoff.
- **Voiceover.** None. The full script is in `script.md`, and Version B is recommended. 13 windows are reserved in the timeline. The build ducks the music by 12 dB with a 5 dB carve at 2.5 kHz, but only when a voice file exists. Against a speech shaped guide at -16 LUFS, every window clears 10 LU of voice over music.
- **A sanctioned exception to the design hook.** The troubleshooting replica keeps the app's red left border on the escalation line, because the real page has it (`troubleshooting/page.tsx:49`). The rule is ignored for `remotion/promo4/ui.tsx` only.

## Checks run

- Sound cue timing: 34 of 34 cues (full) and 18 of 18 (cut) land within 1 frame in both the effects stem and the mix. Most land within 2 ms. Some key clicks sit under +6 dB over the bed, by design. These are warnings, not failures.
- Loudness (revision 2): full -14.03 LUFS, true peak -2.31 dBTP, LRA 4.4 LU, limiter at most 2.8 dB. Cut -14.02 LUFS, -2.33 dBTP, limiter 2.3 dB. Measured with our own BS.1770 meter, because the bundled ffmpeg has no filters. The meter self test reads -23.03 for a -23 dBFS tone.
- Copy: 124 on screen strings. No dashes, no exclamation marks, no countdown, discount or scarcity words. Email, URL and CTA match the brief exactly, and no phone number appears anywhere (the audit fails if one does). Text inside the real app captures can't be checked by script.
- Visual: stills every second, plus each beat moment, typing mid sentence, QR scan, form fill, the whip and the lockup.

## Not verified

- Motion feel: whether the punches and slams read as energetic rather than busy. Contact sheets show positions, not motion.
- How the music and effects actually sound. They are measured, not listened to.
- Any real voiceover. When one arrives, the beat timing needs re-checking against it.
