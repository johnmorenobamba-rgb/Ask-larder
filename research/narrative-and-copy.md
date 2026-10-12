# Larder promo video: narrative and copy options

Silent film, about 36 seconds, captions and on-screen text only. Copy follows CLAUDE.md: plain verbs, sentence case, no exclamation marks, no dashes of any kind in the copy (timestamps below are written "0:00 to 0:03" for the same reason).

## 1. What is actually built (so the video only claims real things)

Checked against src/data/features.ts, DECISIONS.md and remotion/v2/scenes.tsx.

Safe to claim:
* Training modules written from the venue's own procedures and photos, role based, with check questions. Nothing goes live until the owner approves it.
* Ask Larder answers only from approved content. Anything needing a key, code or login goes to a supervisor. Tested against attempts to talk it out of the rules.
* Questions sent to a supervisor show on the owner dashboard.
* Owner sees every certificate and when it expires or needs a refresher. Staff upload RSA, food handler, food safety supervisor and first aid certificates with dates. (WWCC is in CLAUDE.md scope but not in the shipped screenshots or feature copy. Leave WWCC off screen unless John confirms it is on the certificate list.)
* Owner dashboard: who has finished which module, certificates and dates, failed readings, near miss reports, escalations.
* Typed name sign off with time and device. It is a comprehension check, not a contract. The Stamp appears on the module completed screen.
* Runs in the browser on the iPad or phone staff already have. Needs internet.

Do not claim:
* Expiry alerts, emails or reminders. Overdue and expiring items show on screen only. Larder does not send reminders. So say "see what is expiring", never "get warned" or "we remind you".
* Any legal protection, compliance guarantee, inspection readiness or price. Do not say "audit proof".
* Real customer names or quotes (quote slots are TODO).
* Offline use, rostering, integrations.
* Per scene taps and counts other than the measured "three taps, nothing typed" on the checklist (not used in these scripts).

Existing v2 film (scenes.tsx) already covers forms, three taps and stations. These three options use different ground: the question at the moment of need, the approval gate, and the supervisor line. All three end on the same call to action as v2 (Book a walk through, asklarder.com.au) so the existing end card can be reused.

## 2. Research: how good B2B product videos run 30 to 40 seconds

I found no source that gives a hard second by second split for a 30 second B2B video. The sources agree on order and principles. The timings below are a synthesis, labelled as such.

Findings:
* Order that recurs across guides: hook, problem, solution or demo, proof, one call to action. Sources: [Find Buyers (Lantern)](https://withlantern.com/agents/produce-video-scripts), [B2B Video Ad Scripts, Growthspree](https://www.growthspreeofficial.com/blogs/b2b-video-ad-scripts), [Product demo video script, Framia](https://framia.converge.ai/page/en-US/blog/product-demo-video-script).
* Hook: the first 1 to 3 seconds do most of the work, and the first 5 seconds decide whether people stay. Open on the viewer's problem, not on your company or logo. The brand name comes late.
* Demo: follow one real path through the product, not a tour of the interface. One workflow, one outcome.
* Proof is the beat most often squeezed out. Protect it with something concrete (a real screen, a before and after), not a claim.
* One call to action, specific and low friction (book a walk through, not "learn more").
* Silent viewing: assume sound is off, so captions and visual clarity carry the message ([Capcut on silent cinema content](https://www.capcut.com/create/silent-video-content-ai-creators-viral)). I could not verify the commonly quoted "85% watch muted" figure, so do not cite it.
* On-screen text rules from captioning guidance ([Section 508](https://www.section508.gov/create/captions-transcripts), [Requestly](https://requestly.com/blog/video-captioning-best-practices/)): at most two lines at a time, about 45 characters per line or fewer, consistent type and colour, text held still long enough to read, no scrolling or flashing text, do not cover the action. Rule of thumb from these: roughly 3 words per second of reading time is generous, so give every line at least 1 second per 3 words plus a half second.
* One message per clip: short videos work when they hold a single takeaway.
* What to avoid: opening with the logo, feature tours, vague stats, several calls to action, text that moves while it is being read, hype words.

Working split used for the scripts (my synthesis, about 36 seconds):

| Beat | Seconds | Job |
|---|---|---|
| Hook | 0:00 to 0:04 | Name the moment the viewer already dreads |
| Problem | 0:04 to 0:10 | One concrete picture of it going wrong |
| Demo | 0:10 to 0:27 | One path through the product, on screen |
| Proof | 0:27 to 0:31 | A real screen the owner can recognise (dashboard, Stamp) |
| Close | 0:31 to 0:36 | One line, brand, one action |

## 3. Option A: "The question at close"

Concept: A new hire closing alone asks a question and gets the venue's own answer, then asks about the safe and is sent to a supervisor, which is the point.

Audience hook: the owner who has been rung at 10pm about the fryer.

Beat by beat (screen text in quotes):

* 0:00 to 0:04 | Parchment on ink, plain type. "Closing alone for the first time." Held 3 seconds.
* 0:04 to 0:09 | Chat bubble shape appears empty. "The manager is not picking up." Then a short second line, "The binder is in the office." Each line held about 2 seconds.
* 0:09 to 0:15 | Ask Larder chat on an iPad frame. Caption: "Ask Larder." Question types in: "How do I change the fryer oil?"
* 0:15 to 0:21 | Answer appears, line by line:
  "1. Let the oil cool for an hour.
  2. Drain it into the oil bin.
  3. Clean and dry the tank.
  4. Refill to the line.
  5. Write the date on the fryer log."
  Caption beside it: "From your own approved procedures."
  (Numbered steps are fine here: it is a genuine sequence.)
* 0:21 to 0:27 | New question types in: "Where is the key to the safe?" Reply: "Ask your supervisor for assistance, as they have access to the safe." Caption: "Keys, codes and logins go to a supervisor. Every time."
* 0:27 to 0:31 | Owner dashboard tile for escalations. Caption: "You see what staff ask." Sub line: "And where a procedure is missing."
* 0:31 to 0:36 | Close. Larder mark and wordmark. Closing line below. Then "Book a walk through. asklarder.com.au"

Ask Larder demo text (exact):
* Question 1: "How do I change the fryer oil?"
* Answer 1: "Let the oil cool for an hour. Drain it. Clean and dry the tank. Refill to the line. Write the date on the fryer log."
* Question 2 (fallback): "Where is the key to the safe?"
* Answer 2: "Ask your supervisor for assistance, as they have access to the safe."

Closing line: "Answers from your venue. Not from a guess."

Strength: the most direct demo of the locked fallback rule and the core differentiator. Risk: only covers one feature, so certificates and training sit unmentioned.

## 4. Option B: "Your procedures, their first shift"

Concept: Follow one procedure from the owner's binder to approved training to a staff answer to the owner's screen. It shows the full loop and the approval gate.

Audience hook: the owner who has training in their head and in a binder nobody reads.

Beat by beat:

* 0:00 to 0:04 | "Your training is in a binder." Second line, "And in one chef's head." Each held about 2 seconds.
* 0:04 to 0:09 | Photo of a real procedure page and a venue photo slide in. "Larder builds it from your own procedures and photos."
* 0:09 to 0:14 | Owner approval screen with the Approve button. "You read it. You approve it." Sub line: "Nothing goes live until you do."
* 0:14 to 0:19 | Module section and a check question on a tablet. "New hires learn one section at a time." Sub line: "Then answer a short question."
* 0:19 to 0:25 | Ask Larder. Question: "What do I do if a customer has a nut allergy?" Caption: "And ask when they are stuck." Answer line shown only as a short extract: "Stop the order. Tell your supervisor." (Use the real recorded answer from the ask clip at record time. If the real answer differs, show the real one.) Then a second question: "What is the alarm code?" Reply: "Ask your supervisor for assistance, as they have access to the alarm."
* 0:25 to 0:29 | Sign to confirm screen, then the Stamp. "Typed name, time and device." Stamp lands.
* 0:29 to 0:33 | Owner dashboard, completion table and certificate expiry list. "See who has finished. See which certificates run out."
* 0:33 to 0:36 | Close. Closing line, then "Book a walk through. asklarder.com.au"

Ask Larder demo text (exact):
* Question 1: "What do I do if a customer says they are allergic to nuts?" (matches the question already recorded in the v2 clip)
* Answer 1: use the recorded answer verbatim. Caption only: "From your approved procedure."
* Question 2 (fallback): "What is the alarm code?"
* Answer 2: "Ask your supervisor for assistance, as they have access to the alarm."

Closing line: "Your procedures. Their first shift."

Strength: covers training, approval, Ask Larder, e-signature and the Stamp and the dashboard in one path. Risk: busiest of the three. Seven screens in 36 seconds means each caption must stay short, and the demo has less breathing room. Cut the alarm question if it runs long.

## 5. Option C: "Who has the key?"

Concept: The video is built around the one line Larder will not answer. It builds trust through restraint, then shows the owner dashboard as the payoff.

Audience hook: the owner who worries about what a chatbot might say to a staff member.

Beat by beat:

* 0:00 to 0:04 | "Some questions need a person." Held 3 seconds.
* 0:04 to 0:09 | "The safe. The keys. The alarm." Three words on three beats, then a still. No numbering.
* 0:09 to 0:14 | Ask Larder chat. Question types in: "Where is the key to the safe?"
* 0:14 to 0:20 | Reply appears: "Ask your supervisor for assistance, as they have access to the safe." Caption: "Ask Larder does not guess."
* 0:20 to 0:26 | Question: "How do I change the fryer oil?" Answer: "Let the oil cool for an hour. Drain it. Clean and dry the tank. Refill to the line. Write the date on the fryer log." Caption: "Everything else comes from your approved procedures."
* 0:26 to 0:31 | Owner dashboard escalations tile and certificate list. "You see what was sent to a supervisor." Then, "And which certificates are expiring."
* 0:31 to 0:36 | Stamp lands on a module completed screen. Closing line, then "Book a walk through. asklarder.com.au"

Ask Larder demo text (exact):
* Question 1 (fallback first): "Where is the key to the safe?"
* Answer 1: "Ask your supervisor for assistance, as they have access to the safe."
* Question 2: "How do I change the fryer oil?"
* Answer 2: "Let the oil cool for an hour. Drain it. Clean and dry the tank. Refill to the line. Write the date on the fryer log."

Closing line: "It answers from your venue. It knows when to ask a person."

Strength: the strongest and most unusual hook for a trust conscious owner, and the lowest density, so it will look calm. Risk: leads with a refusal, so the first 14 seconds show no useful answer. The fryer answer at 0:20 pays that off, but some viewers may drop before it. Training and e-signature get only a final Stamp.

## 6. Copy checks run on every option

* No exclamation marks, no urgency, no price, no legal or protection claims, no features beyond the list in section 1.
* No hyphens, en dashes or em dashes in any on-screen text. Compound words used: e-signature only. "Sign off" is written as two words.
* Expiry is described as something the owner can see, never as an alert or reminder.
* "Approve" is stated as the owner's action, matching the locked approval gate.
* Supervisor line is verbatim: "Ask your supervisor for assistance, as they have access to the [X]." Only [X] changes (safe, alarm).
* Example venue note ("Example venue, invented names.") should stay on screen wherever product screens appear, as in v2.
* Check the real chat output before filming. If the live app words the fallback differently, use the live wording and update this file.

## 7. Recommendation

Recommend Option A, with the closing dashboard beat borrowed from Option B (the Stamp and the certificate expiry list inside the 0:27 to 0:31 slot).

Why:
* It follows the structure the research supports most closely: opens on one concrete moment the owner already knows, runs a single path through the product, and uses the recognisable owner screen as proof, then one call to action.
* The fallback question is the product's most distinctive behaviour and the thing owners will worry about. Showing it working, calmly, says more than any claim.
* It has the lowest density, so lines stay readable in a silent film and the pacing stays calm, matching the brand voice.
* Option B tries to show everything and will feel rushed at 36 seconds. Option C is strong but front loads a refusal, which risks early drop off.
* It sits comfortably alongside the existing v2 film (forms, taps, stations) instead of repeating it.
