# Promo v4 brief (branch video-v3)

Spec: `LarderPromo4`, 1920x1080, 30 fps, 112.5 BPM, 34 bars + 30 f tail = 2206 f = 73.5 s. 30 s cutdown `LarderPromo4Cut`. Audio synthesised, mastered to −14 LUFS integrated, true peak ≤ −1.5 dBTP. No voiceover yet: the VO track, its windows and the bed ducking are reserved in the timeline. Inputs: `method.md`, `references.md`, `script.md` (Version B, "Three questions"), `sound.md`, `motion.md`, `picks-seed47.md`.

## Concept

The film is built from the questions staff ask. Three questions open the film as chit shaped bubbles (the Larder mark's own shape). Each pain brings one back, and the product answers it on a real screen. The bubble is the device: it is the question, it lands in Ask Larder, it opens the forms, it sits on the station, and at the end it becomes the Larder mark.

Logline: Three questions your staff ask, answered by your own venue.

Polarity carries the structure: pains on Ink (after hours, unanswered), solutions on Parchment (the product, answered). Each pain to solution change is a luminance flip hidden inside a move, landing on the downbeat where the music resolves.

## Grid

112.5 BPM at 30 fps: beat 16 f, 8th 8 f, 16th 4 f, bar 64 f (2.133 s). Every subdivision is a whole frame. `b(bar, beat, sub) = ((bar − 1)·4 + beat)·16 + sub·4`.

| Section | Bars | Frames | Time | Music (from `sound.md`) |
| --- | --- | --- | --- | --- |
| Hook | 1 to 3 | 0 to 191 | 0.0 to 6.4 | Dm9 pad and Rhodes on frame 0, no drums |
| Pain 1 | 4 to 6 | 192 to 383 | 6.4 to 12.8 | half time, D pedal, empty room delay |
| Solution 1, Ask Larder | 7 to 12 | 384 to 767 | 12.8 to 25.6 | the lift at b7: breath, Fmaj9, rim and shaker |
| Pain 2 | 13 to 14 | 768 to 895 | 25.6 to 29.9 | suspended |
| Solution 2, forms (payoff) | 15 to 20 | 896 to 1279 | 29.9 to 42.7 | the lift plus the soft kick at b15, loudest section (41 percent in) |
| Pain 3 | 21 to 22 | 1280 to 1407 | 42.7 to 46.9 | suspended |
| Solution 3, stations | 23 to 27 | 1408 to 1727 | 46.9 to 57.6 | groove one notch under the payoff |
| Urgency | 28 to 30 | 1728 to 1919 | 57.6 to 64.0 | harmonic rhythm doubles, bass climbs, clock; stops dead one 8th before b31 |
| Call to action and logo | 31 to 34 + tail | 1920 to 2205 | 64.0 to 73.5 | plagal cadence, music stops, Fadd9 resolve on the wordmark |

Why these lengths, against the brief's "about 5 s" for hook, urgency and CTA: the grid's bar is 2.133 s, so 5 s falls between 2 and 3 bars. The hook needs 3 bars for the three bubbles to land on beats and the pull back to finish. Urgency gets 3 bars so its two lines hold for their read time (36 f + 6 f a word). The CTA gets 4 bars because it carries four readable items (the line, phone, URL, email); the references put the end hold at 3 s or more, and a URL needs at least 1.7 s. Pain to solution sits near the references' 1:2 ratio (2 to 3 bars of pain, 5 to 6 of solution).

## Shot list

Camera moves are numbered (C1 to C10). Seams name their type (S1 to S9); no crossfade is used as a seam.

| # | Bars | Picture | Motion | Copy on screen | Sound |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 to 3 | Ink. Frame 0 already moving: bubble 1 "How do I change the fryer oil?" sliding in. Bubble 2 lands b(1,3), bubble 3 b(2,2), stacked like messages from different people. Caption at b(3). | Bubbles on `SPR.firm`, landing pops at 50 percent travel; C1 slow push (breath) through the stack. | Bubbles (diegetic). Caption: "Every shift, the same questions." | three soft pings, one per bubble, pitched up a step each |
| 2 | 4 | S1 pull back reveal: C2 a 6x pull back shows the bubbles were notifications on the owner's phone lock screen, lying on a dark bench (scale reversal). | `E.pull` in log space over 1.5 bars, drift easing in from rest. | Lock screen "10:42" and "Sunday 12 October". | whoosh apex on the move's velocity peak (one of two in the film) |
| 3 | 5 to 6 | A new notification lands b(5): "Felix Anand: Sorry to bother you on your day off". Phone buzzes 2 px. Unread count rolls 3 to 4. Typing dots. Caption b(5,2). C3 push in on the newest notification from b(6). | notification `SPR.firm` drop, buzz from `hitPulse`; rolling digit counter. | "Your day off. Their question." | notification buzz, message ping |
| 4 | 7 | S2 shared element lift and flood (signature move 1 of 3): the fryer bubble lifts off the phone, the stage floods Ink to Parchment from the bubble, and the bubble drops into the Ask Larder input. | flood radius on `E.out` from b(7) − 1; bubble path on `E.inOut`. | | the lift: breath, then Fmaj9 on b7 |
| 5 | 7 to 9 | Ask Larder panel (redrawn from `AskLarderChat.tsx`) over the real demo backdrop (`ask-larder-useful-3`), one huge centred subject. Cursor taps Ask b(7,3). The real fryer answer streams word by word in its green bordered box. C4 push in down the answer while it streams. Caption b(9). | cursor arc 16 f on `E.out`, press 4 f down 8 f up; answer words 3 f apart, layout fixed. | "From procedures you approved." | key clicks none (no typing), tap tick, soft select on answer |
| 6 | 10 to 12 | "Ask another question" tapped b(10). "Where is the key to the safe?" types into the input (keys on the grid). Ask b(11). The escalation answer (Clay border, as the app draws it) arrives. C5 push in 1.6x onto it. Caption b(11,2). Designed near still hold from b(11,3) to b(12,3) (the key claim; music thins). | typing time boxed to 44 f on `E.type`; answer `SPR.soft`. | "Keys and safes go to a supervisor." | key clicks per character, tap tick |
| 7 | 13 | S3 velocity handoff: the camera accelerates down off the panel on `E.exit` and cuts at peak speed into Ink, where bubble 2 arrives moving down and brakes. | C6 whip down, cut on b13, entry on `E.out` 48 f. | Bubble 2: "Have the fridges been checked?" | whoosh 2 of 2 |
| 8 | 13 to 14 | Word roll behind the bubble: "Every shift" to "Every day" to "Every week" on b(13,2), b(14), b(14,2). "Every" holds still as the anchor. | staggered word roll: out 6 f on `E.in`, in 12 f on `E.out`, 2 f overlap. | "Every shift. Every day. Every week." | a light tick on each roll |
| 9 | 15 | S4 flood from bubble 2 (signature move 2 of 3) to Parchment and the real forms hub capture, pulled back. | flood on the payoff downbeat. | | the payoff: lift plus kick |
| 10 | 15 to 17 | Checklist (redrawn from `GenericComplianceForm.tsx`, real strings) builds shell first. Three taps: open the form b(15,2), "Mark the rest as pass" b(16) with the eight Pass buttons filling green in a 2 f cascade, the counter rolling 0 to 8 of 8 checked, "Save record" b(16,3), "Record saved." C7 push onto the button, then C8 pull back to show all eight rows. Tap counter TAPS 1, 2, 3 rolls. | cascade on 16ths; counter roll 7 f per step. | "Three taps. Nothing typed." then "When everything passes." | tap ticks, one soft confirm on Record saved |
| 11 | 18 to 19 | S5 partial slide cut (left) to the temperature log card "Walk in cool room", "Keep at 5°C or colder". Cursor taps the field, types 8 b(18,1). "Out of range. Keep at 5°C or colder, this reading is 8°C." appears in red, then "What did you do about it? (required)" with the four quick notes. The sticky bar: "Write what you did about each out of range reading before you save." Save stays Clay. Caption b(18,2). Tap "Moved food to another unit" b(19), Save turns red, tap Save b(19,2): "1 reading saved. 1 was out of range and flagged for the owner." | C9 lateral track with the slide; the field press; text colour resolve. | "No note, no save." | key click, tap ticks, save confirm |
| 12 | 20 | S6 zoom out reveal: from the owner dashboard's Temperature log tile ("3 of 4 logged today", "1 out of range", real capture) out to the whole dashboard. | C10 pull back 3x on `E.cam`. | "Flagged on your dashboard." | |
| 13 | 21 to 22 | S7 rack focus to Ink: the dashboard defocuses and darkens behind the cellar photo (the demo venue's station photo), bubble 3 sharp in front. Caption b(21,2). | rack focus by crossfading a sharp and a constant blur copy (never animating blur). | Bubble 3: "Why is the beer pouring flat?" Caption: "First shift in the cellar." | |
| 14 | 23 | S8 scan and zoom through: viewfinder brackets lock onto a real, scannable QR sticker (opens asklarder.com.au) on the cellar wall b(23,1); the camera flies through the code into the station page. | brackets on `E.glide`, lock pulse `hitPulse`; zoom through 1 to 1.2 out, 0.75 to 1 in. | "Scan the station." | scan beep on the lock, the lift on b23 |
| 15 | 23 to 25 | Station page (redrawn from `station/[qrCodeSlug]/page.tsx`; real counts from the database: 5 FAQs, 5 issues): "CELLAR", "What do you need?", Training, FAQs, Troubleshooting, built shell first. Cursor taps Troubleshooting b(25). | cards stagger 4 f; press. | | tap tick |
| 16 | 25 to 27 | Troubleshooting (redrawn from `troubleshooting/page.tsx`, the real approved issue): "Pours are flat or weak", "Try this", "Then", and the supervisor line in its red bordered panel. Push in on Try this, then down to the escalation line. Caption b(26). | camera follows the read at under 3 px/f. | "Its own fixes, at the station." | |
| 17 | 28 to 30 | S9 horizon rise: a huge Ink disc rises from the bottom edge, its 1.5 px Saffron rim washing over the troubleshooting page, until the Ink core fills the frame on b28. Line 1 at b(28,2), line 2 at b(29,2). Bubble 1 returns, empty, with typing dots. | disc 56 f on `E.dolly`; lines by mask rise with ink resolve. | "Tonight, someone closes without you." then "Who do they call?" | clock enters; everything stops one 8th before b31 |
| 18 | 31 to 34 | Bookend: the empty bubble from the hook fills with "Book a walk through", then shrinks and morphs into the Larder mark (signature move 3 of 3) beside the wordmark. Contact lines stage in one per beat: 0477 120 624, asklarder.com.au, hello@asklarder.com.au. Dolly creep 10 percent over the hold. | morph on `E.inOut` 40 f; lines mask rise 6 f apart. | "Book a walk through" · 0477 120 624 · asklarder.com.au · hello@asklarder.com.au | music stops on b31 beat 0; one beat of air; Fadd9 resolve when the wordmark is readable |

Camera moves: C1 to C10 (ten, against a minimum of six). Seam types: pull back reveal, shared element lift and flood (signature, three times), velocity handoff, word roll, partial slide, zoom out reveal, rack focus, zoom through, horizon rise. Each non signature type is used once.

## Copy (on screen)

Captions: "Every shift, the same questions." · "Your day off. Their question." · "From procedures you approved." · "Keys and safes go to a supervisor." · "Every shift. Every day. Every week." · "Three taps. Nothing typed." · "When everything passes." · "No note, no save." · "Flagged on your dashboard." · "First shift in the cellar." · "Scan the station." · "Its own fixes, at the station." · "Tonight, someone closes without you." · "Who do they call?" · "Book a walk through" plus the three contact lines.

Diegetic text (inside bubbles and app screens) is the app's real wording or the demo venue's real data; see `remotion/promo4/data.ts`. A small mono line on every product shot says which screens are redrawn: "Example venues. Screens redrawn from the app." or "Example venue. Real screen."

No dashes, no exclamation marks, no countdown, no discount or welcome offer, no price, no estimate. The brochure's $5,520 estimate is left out (see `script.md` section 5: its required label cannot be read in the time a 5 s beat gives it, so it would read as a claim). The Stamp does not appear: none of its trust moments (completion, certificate verification, e-signature) is in this story.

## Sound plan

`scripts/make-promo4-audio.mjs` reads `remotion/promo4/timeline.ts` and builds the bed and effects from `sound.md`: FM Rhodes, warm pad, sub, soft tuned kick (payoff only), rim and shaker in solutions, clock in urgency, F major. Effects on visible causes only: bubble pings, a notification buzz, key clicks on typed characters, tap ticks on cursor presses, two whooshes (the C2 pull back and the C6 whip), the scan beep, a save confirm, the logo resolve. Stems are written for the sync audit. Master: −14 LUFS integrated, true peak ≤ −1.5 dBTP (WAV), checked in our own BS.1770 code because the bundled ffmpeg cannot run audio filters.

## Voice plan

No voiceover now. `timeline.ts` exports `VO` windows from Version B, retimed to the bars above, and the mix ducks the music bus by 4 dB inside each window (40 ms attack, 250 ms release) and carves 2 to 4 kHz in the pad, so the film already sounds the way it will under a voice. A recording drops in as `audio/vo.wav` aligned to frame 0 without moving any picture; when it arrives, check each line against its window and adjust the windows, not the picture, unless a line runs over.

## Verification

Render `out/larder-promo-v4.mp4` and `out/larder-promo-v4-30s.mp4`. Contact sheets every 1 s plus every beat cue, camera peak, typing mid word, QR lock and form fill. Audio: integrated loudness, true peak (4x oversampled), the duck depth inside VO windows, and an onset audit of every effect against its cue frame from the stems. Copy audit of every on-screen string. State what cannot be verified (motion feel, how a voice will sit).
