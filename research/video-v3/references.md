# Video v3 references: calm launch film, three pain and solution pairs

Brief: 60 to 75 s Larder launch film. Pairs: (1) cannot reach the manager, questions repeat, then Ask Larder; (2) compliance forms every shift, then the quick forms flow; (3) new hire does not know a station, then station QR. Then a cost of waiting beat and a calm CTA. Register: calm, confident software launch film, no hype.

Method and honesty notes (read first):
- No video was watched. Everything comes from page text, prompt text, write-ups and roundups. Researched 15 Oct 2026.
- VERIFIED = stated on the cited page. ESTIMATE = my inference from stated facts (shown with working). UNVERIFIED = from general memory or a third-party roundup I could not cross-check. Treat it as a lead, not a fact.
- prompt-motion.com reality check: the gallery has 234 entries (Product UI 101, Kinetic type 97). The category chips do not change the URL, and entries are not tagged on the index, so I sampled the popular entries and read their tags on the entry pages. Most entries are one-line prompts ("make a dynamic 15-second motion graphics video ... go all out") with no direction, so they tell us little about craft. Two pages carry real, specific direction: the UI-states morph (twoclipping) and the rewritten showreel template. I weighted those.
- remotion.dev/showcase renders its cards client side, so a fetch gets none of them. Remotion entries below come from the Remotion README.

## References

### 1. Shape morphing through UI states (prompt-motion, @twoclipping)
- URL: https://prompt-motion.com/twoclipping-5cba86 · Category: Product UI, Charts, Music (VERIFIED)
- Runtime: about 14 s, ESTIMATE (7 bars at 120 BPM in 4/4 = 28 beats x 0.5 s)
- Pacing: zero cuts, one unbroken element. "Something happens on every beat", so about 20 state changes per 10 s (VERIFIED rule; the count is ESTIMATE)
- Camera: a zoom so each state fills the frame (VERIFIED). No whip, rack or parallax.
- Pain and solution: none. It is a continuous sequence of states.
- Type: the text swaps inside the morphing container with a short blur, and the prompt warns that the text needs its own enter and exit timing so swaps never overlap (VERIFIED)
- Motion: every change is caused by a cursor with real clicks and drags. Drags track the cursor, then spring back. Springs with at most a tiny overshoot. Bouncy easing and dead time are banned. 60 fps with 4 subframes for motion blur (VERIFIED)
- Ending: no end card. The last frame matches the first (cursor position and speed included) so it loops (VERIFIED)
- Steal: cursor causality, and the rule that text inside a morph gets its own timing.

### 2. The showreel prompt, rewritten (prompt-motion template)
- URL: https://prompt-motion.com/templates/showreel · Category: Kinetic type (the house template behind the site's most used prompt, used in 51 videos) (VERIFIED)
- Runtime: 15 s, about 7.5 bars at 120 BPM (VERIFIED)
- Pacing: bar 1 is the hook, then one technique per bar, with the strongest moment in the last full bar. Holds are capped at 0.5 s. That is about 3 to 4 scene changes per 10 s, all by morph (ESTIMATE)
- Camera: "one consistent camera language". No specific moves are named (VERIFIED)
- Transitions: every shot is built from the one before. Cuts, fades and crossfades are banned (VERIFIED)
- Type: one typeface. Blur follows speed and direction. Springs and exponential curves, no bounce (VERIFIED)
- Ending: the final half bar (about 1 s) holds the end title, and the last frame matches the first (VERIFIED)
- Banned: particle bursts, glows, lens flares, camera shake, RGB split, generic gradients, anything templated (VERIFIED)
- Sound: a kick on every beat, a riser into the last bar, a hit on each scene change, all synthesised in code (VERIFIED)
- Caution: this is a showreel register. A 0.5 s hold is far too fast for a calm 70 s film. Take the ban list and the transition grammar, not the tempo.

### 3. Dub promo video (prompt-motion, @steventey)
- URL: https://prompt-motion.com/steventey-0d20e4 · Category: Product UI, Charts (VERIFIED)
- Runtime: 15 s (VERIFIED, from the prompt). Pacing, camera, type and ending: UNVERIFIED. The prompt gives none of them.
- Value: proves the gallery's Product UI category is dominated by 15 s one-shot showreels with no story structure. None of the sampled entries has a pain and solution structure.

### 4. Enxovaly baby app promo (prompt-motion, @gabrielbuzziv)
- URL: https://prompt-motion.com/gabrielbuzziv-4ff0c6 · Category: Product UI, Phone (VERIFIED)
- Runtime: 15 s (VERIFIED). Everything else UNVERIFIED (the generic showreel prompt).
- Value: the Phone category is relevant to station QR (a phone scanning a code). Its stills were not fetchable.

### 5. Lightspark social promo (prompt-motion, @davidmarcus)
- URL: https://prompt-motion.com/davidmarcus-a28a60 · Category: Kinetic type, Code (VERIFIED)
- Runtime: UNVERIFIED. The prompt asks only for "punchy and modern", "production grade with sound" (VERIFIED)
- Value: a negative example. "Punchy" is the register to avoid here.

### 6. Lago launch films, built to Linear's standard (getlago.com)
- URL: https://getlago.com/blog/we-killed-our-motion-design-job · Category: Product UI (VERIFIED)
- Runtime: 0:23 per film, target "twenty-second film" (VERIFIED)
- Pacing: one action per shot. One shot runs frames 310 to 480 with a reading hold from 400 to 480. The fps is not stated, so 80 frames is about 2.7 s at 30 fps or 1.3 s at 60 fps (ESTIMATE). Early feedback said to slow the transitions (VERIFIED). About 2 to 3 shot changes per 10 s (ESTIMATE)
- Camera: a virtual camera zooms into the action, whip-pans between screens and holds the payoff. Frames are locked on key states (VERIFIED). Push in and whip, no rack focus.
- Pain and solution: no pain beat. Cause, then reaction, then result: "because the user does X, Lago changes Y, producing Z" (VERIFIED)
- Type: design-system tokens. The feedback was "make text bigger" (VERIFIED)
- Transitions: mostly same screen, with the camera doing the work. An "Incomplete" state dissolves to "Active" and the chip pops. Screens bleed off the frame, never floating cards. No intro card (VERIFIED)
- Ending: an end card is one of the review frames. Its design is not described (UNVERIFIED)
- Sound: a silent master is required, and the story must work on mute (VERIFIED)
- Cheap list (VERIFIED): screens that almost match the app, invented icons, placeholder data, off-brand colours or radii, floating cards.

### 7. Linear launch films and Linear Initiatives walkthrough
- URL: https://linear.app/changelog (films); sources: Lago post above, https://www.moonb.io/blog/product-launch-video
- Category: Product UI · Runtime: Initiatives walkthrough 4:15 (UNVERIFIED, from the roundup). The short films are about 20 to 30 s (ESTIMATE, from Lago copying them)
- Camera: moves through the real product one action at a time (VERIFIED via Lago). Push ins on the acting element (ESTIMATE)
- Style: no voiceover, no stock footage, no abstract 3D (VERIFIED via Lago). In the walkthrough, the UI keeps the full frame and the presenter sits in a small corner bubble (UNVERIFIED)
- Type: sparse, set in the product's own type. End card: wordmark on dark with a short hold (UNVERIFIED, from memory)

### 8. New Raycast teaser (2025)
- Source: https://www.moonb.io/blog/product-launch-video · Category: Product UI, Kinetic type
- Runtime: 0:39 (UNVERIFIED). Cropped, dark fragments of the real UI, a glowing search bar, AI action names ticking through a list, no full reveal (UNVERIFIED)
- Camera: tight crops and slow drifts (ESTIMATE). Ending not described.
- Steal: a ticking list of real action names is a good model for "questions repeat" (a list of the same question asked again and again).

### 9. Figma Motion reveal (2026)
- Source: moonb roundup · Category: Product UI · Runtime: 1:09 (UNVERIFIED)
- A cursor moves among flat animated designs, shown beside the "Motion Tokens" panel that produces them, and a pixel-type poster (UNVERIFIED)
- Steal: show the setting next to its effect. For Larder, that means the question next to the venue SOP section it was answered from.

### 10. Google Pixel 9 Pro teaser (2024)
- Source: moonb roundup · Category: Kinetic type, Product UI · Runtime: 0:30 (UNVERIFIED)
- A Gemini prompt is typed over a dark screen and the phone appears afterward. The featured AI writes the teaser's joke. The CTA lives in the description, not on screen (UNVERIFIED)
- Steal: typed text on a plain ground as the turn into the solution. It suits Ask Larder: the staff question is typed and the answer arrives.

### 11. Oura Ring 4 hero film (2024) plus its separate spec film
- Source: moonb roundup · Category: Kinetic type (minimal) · Runtime: 0:31 hero, 46 s spec film released the same day (UNVERIFIED)
- Soft, warm shots and small lines of copy with no specs on screen (UNVERIFIED)
- Steal: a calm register means few words on screen, and the detail goes to a separate cutdown or the landing page.

### 12. Dyson WashG1 technical reveal (2024)
- Source: moonb roundup · Category: 3D reveal · Runtime: 0:36 (UNVERIFIED)
- Camera: a close-up push on the mechanism, then a pull back to the full machine as the ending (UNVERIFIED)
- Separation: the mechanism is colour coded (UNVERIFIED)
- Steal: end on a pull back. Push into the QR scan, then pull back to the whole kitchen line.

### 13. Vercel Ship 2025 opener (basement.studio)
- URL: https://basement.studio/post/behind-the-ship · Category: animated short · Runtime: UNVERIFIED
- Animated on twos (12 fps poses over a 24 fps camera), warm grade in Resolve, black silhouette shader, prerenders used to trim shots (VERIFIED)
- Value: the opposite register (a hype event opener). The useful lesson is the process: prerender in motion before locking the edit.

### 14. Things 3 launch video (Cultured Code, 2017)
- Sources: https://9to5mac.com/2017/05/19/friday-5-things-3-video-top-features/, https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/
- Runtime: about 1:30 to 2:00 (UNVERIFIED). Real UI on light grounds, gentle music, no VO, one feature per section (UNVERIFIED, from memory)
- Camera: slow push ins on the device, cross-device continuity (UNVERIFIED). Ending: logo plus platforms on white, held about 3 s (UNVERIFIED)
- Steal: the closest tonal match. Quiet confidence, the product carries every beat, and delight comes from the UI's own motion.

### 15. GitHub Unwrapped (Remotion)
- URL: https://githubunwrapped.com, source https://github.com/remotion-dev/github-unwrapped · Category: Kinetic type, data (VERIFIED as Remotion's featured project)
- A personalised year in review rendered per user from real data (VERIFIED). Pacing and camera: UNVERIFIED
- Steal: drive every number and name on screen from one data module, so the "cost of waiting" figures are real venue numbers, not decoration.

## Eight steal-able rules for this film

1. Every solution beat is cause, then action, then result, with one acting element per shot. A finger tap or cursor causes it, the UI reacts, and the result holds at least 2 s, readable on an iPad sized frame (Lago, twoclipping). Never cut away from an unsettled state.
2. Pain is short and solution is long, at roughly 1:2. Pain is shown, not narrated: the same question bubble stacking up three times, a paper form pile per shift, a new hire hovering at an unlabelled station. The viewer must recognise it in 3 s.
3. Separate pain and solution with a ground change plus a sound change, not a wipe. Pain: Ink or a desaturated ground, room tone, a little clutter in the mix. Solution: Parchment ground, the room tone drops out and a single clean tone enters. One turn line per pair, typed, sentence case, no dashes ("Ask Larder." / "Done before service." / "Scan the station."). The turn line is the only kinetic type in the pair.
4. Transitions are built from the previous frame: a morph, or the camera moving through the same screen (showreel template, Lago). No crossfades between pairs. The one allowed hard cut is pain to turn, because the contrast is the point.
5. Camera grammar is push in and pull back only. Push into the acting element, hold, then pull back to context. Allow at most one whip per film, and only between screens of the same app. No rack focus on flat UI (it reads as fake depth) and no parallax on UI cards (floating cards read as cheap). Save the single biggest pull back for the QR pair, from the code to the whole station (Dyson).
6. Use real UI, real chrome and real venue data from one data module: real role names, real SOP section titles, real cert names (RSA, food handling). The feature name appears once, where the product shows it (GitHub Unwrapped, Lago cheap list).
7. Ease with springs with a tiny overshoot at most and exponential curves, and use motion blur on fast moves. Bounce, shake, glow and particles are banned. The Stamp appears only at true trust moments (a form signed, a module completed), never as a transition flourish.
8. End calm: the wordmark, one line and one plain action ("Book a walkthrough" or the URL) on Parchment, held still for at least 3 s with sound resolving to silence (Things 3, Oura). The film must work on mute (Lago silent master), so every claim is on screen and not only in the VO or music.

## Recommended split (target 70 s; compress to 62 s by trimming solutions first)

| Section | Seconds | Running | Notes |
|---|---|---|---|
| Cold open | 2 | 0 to 2 | The venue at service, no logo, no title card (Lago: no intro card) |
| Pair 1 pain: cannot reach the manager | 5 | 2 to 7 | The same question three times, the phone unanswered |
| Pair 1 turn and solution: Ask Larder | 12 | 7 to 19 | Typed question, answer grounded in the venue SOP, plus one fallback-rule moment ("ask your supervisor") if it fits |
| Pair 2 pain: forms every shift | 4 | 19 to 23 | Shorter, because the viewer has learned the pattern |
| Pair 2 turn and solution: quick forms | 11 | 23 to 34 | Tap through, sign, Stamp |
| Pair 3 pain: new hire at a station | 4 | 34 to 38 | Hesitation, no words needed |
| Pair 3 turn and solution: station QR | 13 | 38 to 51 | Scan, the station module opens, pull back to the line |
| Cost of waiting | 8 | 51 to 59 | Two or three real figures, set plainly, no ticking clock |
| Call to action | 11 | 59 to 70 | Wordmark, one line, one action, a still hold of 3 s or more, sound out |

Pacing target: about 2 to 3 shot or state changes per 10 s in the solutions, 1 to 2 in the pains and the CTA (ESTIMATE, scaled down from Lago's 23 s films and well below the showreel's 0.5 s holds).

## What reads as cheap

- 90s TV ad tells: a VO that says "Introducing", "Say goodbye to", "But wait"; a countdown or red flashing urgency in the cost of waiting beat; a price slammed onto the screen.
- The showreel ban list: particle bursts, glows, lens flares, camera shake, RGB split, generic gradients, logo spins (prompt-motion template).
- Bouncy or elastic easing, dead holds with nothing settling, and crossfades used as glue between every shot.
- Fake product: screens that almost match the app, invented icons, lorem or placeholder data, off-brand radii, and UI cards floating in empty space with parallax (Lago).
- An actual-size cursor or finger that vanishes at video scale. Use an oversized cursor or a visible tap ripple (HyperFrames oversized-cursor skill, title only; the skill page has no SKILL.md).
- Stock kitchen footage and abstract 3D shapes (Linear via Lago; the Larder Branding Kit also bans stock pantry imagery).
- Generic checkmarks or confetti on completion (Branding Kit: use the Stamp), and numbered 01/02/03 markers on the three pairs (Branding Kit anti-pattern, since the pairs are not a sequence).
- Too many words: a feature name as a headline, a paragraph on screen, captions that compete with the UI (Oura, Lago).
- Reading holds shorter than the text needs, and any on-screen copy with hyphens, en dashes or em dashes (Larder copy rule: "9am to 5pm", not a dash range).
