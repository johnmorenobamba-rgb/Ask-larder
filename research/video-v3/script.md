# Larder launch film v3: script and voice

Two full scripts (A and B) for a 75 second launch film, with beat tables, on-screen text, spoken lines, word counts, timing at 140 words per minute, pauses and a pronunciation guide. Written 14 Oct 2026 from CLAUDE.md, research/features-forms-qr.md, research/narrative-and-copy.md, scratch/brochures/output/copy-dump-v2.txt and a check of the real strings in `src/`.

Times are written "0:13.8 to 0:16.8" (no dashes, same rule as the copy).

**Update 15 Oct 2026: the phone number is out of the promo.** John asked for it to be removed from both videos. Version B's CTA line is now "Book a walk through at ask larder dot com dot au." (10 words, about 4 s), and the end card shows only the URL and the email. Every phone number line below is superseded; it is kept only as the record of the original draft. The timeline's reserved window `vo13` is already retimed to the new line.

## 1. Ground rules applied to every line

Copy rules (CLAUDE.md):
* Plain verbs, sentence case, active voice, no filler, no hype, no exclamation marks.
* No hyphens, en dashes or em dashes in any on-screen or spoken line. Ranges written "9am to 5pm". Compound words such as e-signature are allowed but none were needed.
* Same vocabulary as the app. The film says "Mark the rest as pass", "Out of range", "Training", "FAQs", "Troubleshooting", "What do you need?" exactly as the app does.
* The supervisor line is verbatim from the app: "Ask your supervisor for assistance, as they have access to the safe." Confirmed in `src/components/staff/AskLarderExplainer.tsx` line 72 and the detector in `src/app/api/staff/ask-larder/route.ts` line 294.

Claims rules (research/features-forms-qr.md):
* The only speed claim is "three taps, nothing typed", always tied to "a checklist where everything passes" (claims ledger T1, recorded in `three-taps-s1.mp4`).
* No time saved claim, no legal or protection claim, no "audit proof", no alerts or reminders. Larder shows things on screen; it does not warn anyone. (Note: `src/lib/compliance/alerts.ts` builds an out of range message. The film makes no alert claim either way, so this does not change the script, but check it before anyone adds "you get alerted" to any later cut.)
* Scanning is not login free. No line says or implies "no login". The cut from scan to station page shows a signed in staff member.
* Ask Larder at a station is not limited to that machine. No line says it answers only about the station.
* The station page (hub) has no photo. "Your photos" is shown over the training module or the station gallery, where the venue's photos really appear, never composited onto the hub.
* No countdown, discount, welcome offer, limited time or scarcity. The brochure's welcome offer and its "Larder takes back half, $2,760" line are both excluded. The second is an unmeasured time saved claim.

Real app strings used on screen (checked in code):
* Forms hub groups: Every shift, Daily, Weekly, Monthly, When it happens.
* Checklist: "Mark the rest as pass", "Save record", "Record saved." (`GenericComplianceForm.tsx`).
* A failed check: "What did you do about it? (required)" (`GenericComplianceForm.tsx` line 282).
* Temperature log: "Keep at 5°C or colder" style limit line, "In range", "Out of range. Keep at 5°C or colder, this reading is 8°C.", "What did you do about it? (required)", quick notes such as "Moved food to another unit", and the disabled save reason "Write what you did about each out of range reading before you save." (`TemperatureLogForm.tsx`, `b2.ts`).
* Station hub: station name in mono caps, "What do you need?", Training "Work through your training for this station.", FAQs "2 quick answers for this station.", Troubleshooting "1 known issue and how to fix them." (counts from the demo pizza oven).
* Troubleshooting: "Try this", "Then", and where escalation is set, "If this doesn't fix it, stop and ask your supervisor for help."

## 2. Research notes behind the voice

* Pace. Explainer narration sits around 125 to 150 words per minute; calm, explanatory content goes to the slower end, and pacing slows further when viewers are also reading on-screen text ([Voicebros explainer voice over guide](https://voicebros.com/en/blog/explainer-video-voice-over-guide), [Breadnbeyond on 60 second word counts](https://breadnbeyond.com/how-many-words-does-a-60-seconds-explainer-video-needs/), [Teleprompter.com on timing a script](https://teleprompter.com/blog/how-to-time-your-script)). A 60 second explainer is usually 125 to 150 words. Both scripts here are spoken at 140 but carry only 114 and 122 words over 75 seconds, so roughly a third of the film is silence. That space is deliberate: the viewer is reading real UI, and the film has to work silent.
* Pauses. Put a pause straight after a key point so it lands and the picture has room ([Voicebros](https://voicebros.com/en/blog/explainer-video-voice-over-guide), [Stimme24 scriptwriting guide](https://www.stimme24.com/en/guide/explainer-video-script/)). In both scripts the longest silence sits under the supervisor line, the product's most important behaviour.
* Sentences. One idea per sentence, about 15 words at most, read aloud and rewrite anything stiff ([Capcut on natural explainer voiceovers](https://www.capcut.com/create/ai-voiceovers-natural-explainer-videos)). Do not put the full narration on screen; reduce screen text to the key words ([Truscribe on explainer scripts](https://truscribe.com/blog/explainer-video-script)). Here the screen text is shorter than the voice but carries the same story on its own.
* Australian plain English. The Australian Government Style Manual: average about 15 words a sentence, no more than 25, active voice, everyday words, short paragraphs, and it is fine to start a sentence with "and" or "but" sparingly ([Style Manual quick guide: plain language](https://www.stylemanual.gov.au/style-manual-resources/quick-guides/quick-guide-plain-language), [Clear language and writing style](https://www.stylemanual.gov.au/format-writing-and-structure/clear-language-and-writing-style)). Every spoken sentence below is 13 words or fewer.
* Silent first. From the earlier copy research: at most two lines of screen text at a time, about 45 characters a line, held still, at least 1 second per 3 words plus half a second. Every on-screen hold below was checked against that rule.

## 3. Version A: "The one who knows"

**Concept.** The owner is the one person who knows how everything works, so the venue leans on them even on their day off. Larder holds what they know, at the moment staff need it. Three pains, each answered by a real screen.

**Tone.** Warm, second person, spoken to the owner like a peer who has worked a pass. Unhurried. A small smile in the voice on the hook, flat and steady on the supervisor line.

**Totals.** 75.0 seconds. 122 spoken words. 52.3 seconds of speech at 140 wpm. About 22.7 seconds without voice.

### Beat table

| # | Beat | Start to end | Spoken line (VO in and out) | On-screen text (carries the story with no voice) | Words | VO at 140 wpm |
|---|---|---|---|---|---|---|
| 1 | Hook | 0:00 to 0:06 | 0:00.4 to 0:05.1. "Every venue has one person who knows everything. Usually, it's you." | 0:00.3 "Every venue has one person who knows everything." 0:03.5 second line "Usually, it's you." Both hold to 0:06. Ink on parchment, Space Grotesk. | 11 | 4.7 s |
| 2 | Pain 1 | 0:06 to 0:13 | 0:06.8 to 0:12.4. "On your day off, the phone still goes. Same questions, again and again." | 0:06.5 a phone message lands: "Sorry to bother you on your day off." 0:09.5 caption below: "The same questions, again and again." Hold to 0:13. | 13 | 5.6 s |
| 3a | Ask Larder, in scope | 0:13 to 0:21.5 | 0:13.8 to 0:16.8. "Ask Larder answers from your own approved procedures." | Ask Larder on an iPad. 0:13.3 to 0:15.0 the question types in: "How do I change the fryer oil?" 0:15.3 the answer builds (real recorded answer). 0:16.5 caption: "From your own approved procedures." Hold to 0:21.5. | 7 | 3.0 s |
| 3b | Ask Larder, supervisor line | 0:21.5 to 0:29.5 | 0:21.5 to 0:24.5. "Some things, it hands to a supervisor." Then silence to 0:29.6. | 0:21.5 caption replaces the last one: "Some things go to a supervisor." 0:22.0 to 0:23.4 the question types in: "Where is the key to the safe?" 0:23.8 reply: "Ask your supervisor for assistance, as they have access to the safe." Hold still to 0:29.5. | 7 | 3.0 s |
| 4 | Pain 2 | 0:29.5 to 0:34.5 | 0:29.7 to 0:34.4. "Then there are the forms. Every shift, every day, every week." | The forms hub with its real group headings (Every shift, Daily, Weekly) and Due by times. 0:30.0 caption: "Every shift. Every day. Every week." Hold to 0:34.5. | 11 | 4.7 s |
| 5 | Forms flow | 0:34.5 to 0:47.5 | 0:35.0 to 0:39.3. "A checklist where everything passes takes three taps, nothing typed." 0:40.3 to 0:43.7. "A failed reading won't save without a note." 0:44.6 to 0:46.7. "Every record, in one place." | 0:34.5 to 0:39.5 the recorded clip: hub, Mark the rest as pass, Save record, Record saved. Caption "Three taps. Nothing typed." with the line under it "A checklist where everything passes." 0:39.5 to 0:44.0 temperature log: 8 typed, "Out of range. Keep at 5°C or colder, this reading is 8°C.", then "What did you do about it? (required)", a quick note tapped, save. Caption "A failed reading needs a note before it saves." 0:44.0 to 0:47.5 owner forms records. Caption "Every record in one place." | 23 | 9.8 s |
| 6 | Pain 3 | 0:47.5 to 0:52.5 | 0:47.8 to 0:52.1. "And new staff stand at a station they've never used." | A new hire in front of the pizza oven (demo venue photo). 0:47.8 caption: "First shift. A station they've never used." Hold to 0:52.5. | 10 | 4.3 s |
| 7 | Station flow | 0:52.5 to 1:04 | 0:53.0 to 0:56.0. "They scan the code on the station." 0:56.8 to 1:02.4. "Training, quick answers and troubleshooting, with your own photos and your own steps." | 0:52.5 to 0:55.0 phone camera finds the QR label ("Scan for training"). Caption "Scan the station." 0:55.0 to 0:58.5 station page as built: "PIZZA OVEN", "What do you need?", Training, FAQs, Troubleshooting. 0:58.5 to 1:01.0 training module section with the venue's own oven photo. Caption "Your photos." 1:01.0 to 1:04.0 Troubleshooting: "Try this", "Then". Caption "Your steps." | 20 | 8.6 s |
| 8 | Urgency | 1:04 to 1:09.5 | 1:04.5 to 1:08.8. "Next time they close without you, who do they call?" | Ink screen, no UI. 1:04.3 "Next time they close without you," 1:05.8 second line "who do they call?" Hold to 1:09.5. | 10 | 4.3 s |
| 9 | CTA | 1:09.5 to 1:15 | 1:09.9 to 1:14.2. "Book a walk through. Ask larder dot com dot au." | Logo icon and Larder wordmark. "Book a walk through" (Preserve Red). Under it in Plex Mono: "asklarder.com.au", "0477 120 624", "hello@asklarder.com.au". Hold to 1:15. | 10 | 4.3 s |
| | **Total** | **0:00 to 1:15** | | | **122** | **52.3 s** |

"Example venue, invented names." sits small in a corner on every product screen (beats 3 to 7), as in v2.

### Where the pauses fall (Version A)

* 0:05.1 to 0:06.8 (1.7 s). After the hook. Lets "Usually, it's you." land before the phone appears.
* Inside the hook, a short catch (about 0.3 s) after "everything."
* 0:12.4 to 0:13.8 (1.4 s). Section turn from pain to product.
* 0:16.8 to 0:21.5 (4.7 s). The fryer answer builds and is read in silence. The screen does the work.
* 0:24.5 to 0:29.7 (5.2 s). The longest silence in the film, under the verbatim supervisor line. Do not fill it with music swells; hold the bed low and still.
* 0:39.3 to 0:40.3 and 0:43.7 to 0:44.6 (about 1 s each). Breaths between the three forms points.
* 0:46.7 to 0:47.8 (1.1 s). Section turn into the station pain.
* 0:56.0 to 0:56.8 (0.8 s). After "They scan the code on the station."
* 1:02.4 to 1:04.5 (2.1 s). Section turn into urgency. Let the troubleshooting screen settle.
* 1:08.8 to 1:09.9 (1.1 s). After the urgency question. Let it sit before the answer (the end card).
* 1:14.2 to 1:15.0 (0.8 s). End card holds silent.

## 4. Version B: "Three questions"

**Concept.** The film is built from the questions staff ask. The hook stacks three of them as chit shaped speech bubbles (the logo's own shape). Each pain section brings one question back and the product answers it. The staff's own words carry the story on screen, which makes this the stronger silent cut.

**Tone.** Quieter and more observational. Fewer words, shorter sentences, drier delivery, like a documentary narrator who is on the staff's side. No smile in the voice until the end card.

**Totals.** 75.0 seconds. 114 spoken words. 48.9 seconds of speech at 140 wpm. About 26.1 seconds without voice.

### Beat table

| # | Beat | Start to end | Spoken line (VO in and out) | On-screen text (carries the story with no voice) | Words | VO at 140 wpm |
|---|---|---|---|---|---|---|
| 1 | Hook | 0:00 to 0:07 | Silent open to 0:04.0. Then 0:04.0 to 0:07.0. "Every shift starts with the same questions." | Three chit bubbles stack, one per beat: 0:00.3 "How do I change the fryer oil?" 0:01.8 "Have the fridges been checked?" 0:03.2 "How does this oven work?" 0:04.5 caption: "Every shift, the same questions." Hold to 0:07. | 7 | 3.0 s |
| 2 | Pain 1 | 0:07 to 0:13 | 0:08.0 to 0:12.3. "And when you're not there, they still come to you." | 0:07.2 a phone notification lands: "Sorry to bother you on your day off." 0:09.5 caption: "Your day off. Their question." Hold to 0:13. | 10 | 4.3 s |
| 3a | Ask Larder, in scope | 0:13 to 0:21.5 | 0:13.5 to 0:18.6. "Ask Larder answers them from your own procedures, the ones you approved." | 0:13.3 the first hook bubble, "How do I change the fryer oil?", drops into the Ask Larder chat on an iPad (match cut). 0:15.0 the real recorded answer builds. 0:16.5 caption: "From procedures you approved." Hold to 0:21.5. | 12 | 5.1 s |
| 3b | Ask Larder, supervisor line | 0:21.5 to 0:28.5 | 0:21.3 to 0:24.7. "Keys and safes, it hands to a supervisor." Then silence to 0:28.8. | 0:21.5 caption: "Keys and safes go to a supervisor." 0:21.8 to 0:23.2 question types in: "Where is the key to the safe?" 0:23.5 reply: "Ask your supervisor for assistance, as they have access to the safe." Hold still to 0:28.5. | 8 | 3.4 s |
| 4 | Pain 2 | 0:28.5 to 0:33 | 0:28.8 to 0:32.7. "Then the forms. Every shift. Every day. Every week." | 0:28.6 the second hook bubble returns: "Have the fridges been checked?" 0:30.0 the forms hub fills in behind it, its own group headings lighting in turn: "Every shift", "Daily", "Weekly". Hold to 0:33. | 9 | 3.9 s |
| 5 | Forms flow | 0:33 to 0:45.5 | 0:33.6 to 0:36.6. "Three taps, nothing typed, when everything passes." 0:38.0 to 0:42.7. "An out of range reading needs a note before it saves." 0:43.2 to 0:45.3. "And you see every record." | 0:33.0 to 0:38.0 the recorded clip: hub, Mark the rest as pass, Save record, Record saved. Caption "Three taps. Nothing typed." with "When everything passes." under it. 0:38.0 to 0:43.0 temperature log: 8 typed, "Out of range. Keep at 5°C or colder, this reading is 8°C.", "What did you do about it? (required)". Caption "No note, no save." 0:43.0 to 0:45.5 owner forms records. Caption "You see every record." | 23 | 9.8 s |
| 6 | Pain 3 | 0:45.5 to 0:50.5 | 0:46.0 to 0:49.9. "And new staff, at a station they've never used." | 0:45.7 the third hook bubble returns: "How does this oven work?" over the demo venue's pizza oven. 0:47.0 caption: "First time on this station." Hold to 0:50.5. | 9 | 3.9 s |
| 7 | Station flow | 0:50.5 to 1:01 | 0:51.0 to 0:56.1. "They scan the station. Its training, answers and troubleshooting, with your own photos." | 0:50.5 to 0:53.0 camera finds the QR label. Caption "Scan the station." 0:53.0 to 0:56.5 station page as built: "PIZZA OVEN", "What do you need?", Training, FAQs, Troubleshooting. 0:56.5 to 0:58.5 training module section with the venue's own oven photo. Caption "Your photos." 0:58.5 to 1:01.0 Troubleshooting: "Try this", "Then". Caption "Your steps." | 12 | 5.1 s |
| 8 | Urgency | 1:01 to 1:07 | 1:01.5 to 1:03.6. "Tonight, someone closes without you." 1:04.6 to 1:06.3. "Who do they call?" | Ink screen. 1:01.3 "Tonight, someone closes without you." 1:03.8 second line "Who do they call?" Hold to 1:07. | 9 | 3.9 s |
| 9 | CTA | 1:07 to 1:15 | 1:07.6 to 1:14.0. "Book a walk through. Call oh four seven seven, one two oh, six two four." | Logo icon and Larder wordmark. "Book a walk through". "0477 120 624" set large in Plex Mono, then "asklarder.com.au" and "hello@asklarder.com.au". Hold to 1:15. | 15 | 6.4 s |
| | **Total** | **0:00 to 1:15** | | | **114** | **48.9 s** |

"Example venue, invented names." sits small in a corner on every product screen (beats 2 to 7, including the phone notification).

### Where the pauses fall (Version B)

* 0:00 to 0:04.0 (4 s). Silent open. The three bubbles are the hook.
* 0:07.0 to 0:08.0 (1 s). Notification lands in silence.
* 0:12.3 to 0:13.5 (1.2 s). Section turn into Ask Larder.
* 0:18.6 to 0:21.3 (2.7 s). The fryer answer is read in silence.
* 0:24.7 to 0:28.8 (4.1 s). Silence under the verbatim supervisor line.
* "Then the forms. Every shift. Every day. Every week." Read each full stop as a short beat (about 0.3 s). The line is a list of weight, not a rush.
* 0:36.6 to 0:38.0 (1.4 s) and 0:42.7 to 0:43.2 (0.5 s). Breaths between the forms points.
* 0:45.3 to 0:46.0 (0.7 s). Turn into the third question.
* 0:56.1 to 1:01.5 (5.4 s). The photo and troubleshooting steps play without voice, then the cut to ink.
* 1:03.6 to 1:04.6 (1 s). Between "Tonight, someone closes without you." and "Who do they call?" The most important pause in Version B.
* 1:06.3 to 1:07.6 (1.3 s). Let the question sit before the end card.
* 1:14.0 to 1:15.0 (1 s). End card holds silent.

## 5. Optional estimate beat (not recommended)

If John wants the brochure estimate in the film, it replaces the urgency beat and needs about 8 seconds, not 5, because the label must be readable.

* On screen, line 1: "About $5,520 a year in management time." Line 2, smaller, Plex Mono: "Our estimate for a 20 person venue. 138 hours at $40 an hour. Our assumptions."
* Spoken: "By our estimate, that's about five and a half thousand dollars a year in management time." (15 words, 6.4 s.)
* The brochure's second half ("Larder takes back half", $2,760) must not appear. It is an unmeasured time saved claim.

**Recommendation: leave it out of the film.** Reasons:
* The label is 22 words of fine print. A viewer cannot read it in the time a 75 second film can give it, so on most viewings the number reads as a claim, not an estimate.
* It is built on assumptions (5 questions a shift, 2 minutes each, 300 shifts, 8 hires at 8 hours, 2 hours a month on certificates). That works in a brochure where the maths sits beside it, and in a walk through where John can explain it. It does not survive a scroll past.
* It shifts the film from calm to sales right before the call to action, and costs the one true urgency line.
* Keep it in the brochure and the walk through deck.

## 6. Pronunciation and delivery notes

| Item | How to say it | Notes |
|---|---|---|
| Larder | LAH duh | Australian, non rhotic. Stress on the first syllable. |
| Ask Larder | ARSK LAH duh | Two words, even weight, said as a name, not as an instruction. |
| asklarder.com.au | "ask larder dot com dot ay you" | Never "dot com dot oh". Spoken in Version A only. |
| 0477 120 624 | "oh four seven seven, one two oh, six two four" | Australian 4, 3, 3 grouping with a small pause at each comma. Say "oh", not "zero", and "seven seven", not "double seven". Spoken in Version B only. |
| hello@asklarder.com.au | "hello at ask larder dot com dot ay you" | On screen only in both versions. |
| walk through | "walk through" | Two words, even stress. Matches the site button. |
| FAQs | "eff ay queues" | On screen only. The voice says "quick answers" (A) or "answers" (B). |
| 8°C, 5°C | "eight degrees", "five degrees" | On screen only. |
| WWCC | Say "Working with Children Check" in full, never the letters | Not used in either script. If a later cut mentions it, remember the name and the card differ by state (for example Queensland's blue card), so never imply Victoria's version is national. |
| RSA | "R S A", letters | Not used in either script. |
| SOP | Avoid. Say "procedures" | The audience says "procedures" more than "SOPs" out loud. |

Delivery:
* An Australian voice that sounds like someone who has run a pass or a floor. Mid to low pitch. Not a radio announcer, not a sales read.
* 140 words per minute inside each line, give or take 5. The calm comes from the gaps, not from slowing every word.
* Statements end down. No upward inflection, except the urgency question, and even that should land, not lift.
* Read the supervisor line section with no warmth added and no drama. It is a rule, said plainly.
* Record a wild take of each line with a 2 second room tone tail, so the editor can move lines within the windows above.

## 7. Recommendation

**Use Version B, "Three questions".**

Why:
* The film ships silent of voice first. B's story is carried by the staff's own questions on screen, so a viewer with the sound off still gets the full arc: three questions, each answered by a real screen, then "Who do they call?"
* The hook works in the first second without words. Three questions stacking is the viewer's own shift, before any brand appears.
* The three callbacks give the film one structure instead of three features in a row, which keeps it from reading as a feature tour.
* It is the sparser read (114 words), which fits the calm brief and leaves more silence under the supervisor line.
* "Sorry to bother you on your day off" sits naturally as one of the questions that come to the owner, matching the brochure.

Borrow from A if needed:
* If the film runs mostly on social or LinkedIn rather than on the site, swap B's spoken phone number for A's spoken URL ("Book a walk through. Ask larder dot com dot au."). It is shorter, so it fits the same 8 second CTA with more tail. On the landing page itself the viewer is already at the address, so the phone number is the more useful thing to say.
* If John prefers speaking to the owner more warmly, A's hook ("Every venue has one person who knows everything. Usually, it's you.") can replace B's VO line under the bubbles without changing any timing beyond 1.7 seconds.

## 8. Lines that need John's sign off

Numbers:
1. "Three taps, nothing typed" (both). Measured claim T1. Must always appear with "a checklist where everything passes" or "when everything passes" on screen.
2. "0477 120 624", "hello@asklarder.com.au", "asklarder.com.au" (both). Confirm all three are live and answered.
3. Temperature example: a typed 8, limit "Keep at 5°C or colder" (both). Confirm the demo unit's limit and how `formatTemp` prints the reading (8°C or 8.0°C), then show exactly that.
4. Station counts "2 quick answers for this station." and "1 known issue and how to fix them." (both). Real demo counts. Note the app's own grammar slip: one issue still reads "how to fix them". Either show it as the app does, or fix the app string first as a separate task. This script does not change the app.
5. Estimate beat, if used against advice: "$5,520", "138 hours", "$40 an hour", "20 person venue", spoken as "about five and a half thousand dollars".

Claims:
6. "Every venue has one person who knows everything. Usually, it's you." (A). A generalisation about the viewer.
7. "Every shift starts with the same questions." / "Every shift, the same questions." (B). A generalisation.
8. "Sorry to bother you on your day off." (both). A staged message from an invented staff member. Keep "Example venue, invented names." on screen.
9. "Ask Larder answers from your own approved procedures." (A) / "answers them from your own procedures, the ones you approved" (B). The core claim. True by design; confirm John is happy to state it flat.
10. The fryer oil answer (both). Must be the real recorded Ask Larder output from the demo venue, not the summary in the earlier research. If the real answer differs, show the real one.
11. "Some things, it hands to a supervisor." / "Some things go to a supervisor." (A) and "Keys and safes, it hands to a supervisor." / "Keys and safes go to a supervisor." (B). Routing claim. Backed by the locked fallback rule and the Block P evals.
12. "A failed reading won't save without a note." / "A failed reading needs a note before it saves." (A) and "An out of range reading needs a note before it saves." / "No note, no save." (B). True for the temperature log (Save is disabled) and for a failed checklist check (note required). Confirm the label on the temperature save button before the edit.
13. "Every record, in one place." (A) / "And you see every record." / "You see every record." (B). Owners see, print and download records at `/owner/forms`.
14. "Your photos." and "Your steps." (both). The photo must be the venue's own, shown in the training module or station gallery, not on the station page. The troubleshooting "Try this" and "Then" text must be the demo station's real approved issue.
15. Urgency: "Next time they close without you, who do they call?" (A) / "Tonight, someone closes without you. Who do they call?" (B). Adapted from the brief's "The next time you close alone, who do they call?" because the owner is not the one closing alone, the staff member is. Confirm the wording.
16. The cut from scan to station page (both). No line claims scanning skips login, but the edit shows a signed in staff member. Confirm John is comfortable that this does not imply login free scanning.
