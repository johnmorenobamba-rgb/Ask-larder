// Sanity check: a genuinely thorough, explicit sample document should
// produce real "covered" results -- confirming detectSopGaps isn't just
// always returning gaps regardless of input.
import { config } from "dotenv";
config({ path: ".env.local" });

import { detectSopGaps } from "../src/lib/ai/detectSopGaps.ts";
import { getQuestionsForTopic } from "../src/lib/onboarding/sopQuestions.ts";

const SAMPLE_SOP = `
Crowd Control and Door Security -- Full Procedure

WHEN THIS APPLIES: Friday and Saturday nights, and Thursday nights whenever there's a
band playing. This does not cover general bar-service ID checks on other nights, which
are handled under our separate RSA procedure.

WHO DOES THIS: Our two contracted crowd controllers handle the door on those nights.
The Duty Manager or Bar Supervisor is the only other role authorised to step in at the
door if the crowd controllers need backup.

WHAT YOU NEED: The handheld ID scanner (kept in the office safe during the day), and
the incident log book kept behind the main bar.

STEP BY STEP: 1) Crowd controllers scan ID for every patron entering after 9pm.
2) On nights the venue is at over 80% capacity, crowd controllers also do a visual bag
check. 3) Any refused entry is logged in the incident book with a reason and time.

SAFETY CRITICAL: If a patron becomes physically aggressive, staff must NEVER
physically restrain them -- only the contracted crowd controllers are insured and
trained to do that. Bar staff should press the duress button under the till and wait.

HOW YOU KNOW IT'S DONE: The incident log is filled in for the night (even if nothing
happened, write "no incidents"), and the door area is locked at close.

ESCALATION: If a serious incident happens, call Dave Kowalski (Duty Manager) on his
mobile immediately, and also call 000 if there's any injury or weapon involved.

REAL EXAMPLE: Two weeks ago a group turned up already visibly drunk. The crowd
controller noticed one of them couldn't focus his eyes properly and was leaning on his
friend to stay upright before he even reached the door -- that's usually the giveaway,
well before anyone starts talking.
`.trim();

const questions = getQuestionsForTopic("crowd_control_and_door_security");
const results = await detectSopGaps("Crowd control and door security", SAMPLE_SOP, questions);

for (const r of results) {
  const q = questions.find((q) => q.key === r.questionKey);
  console.log(`[${r.covered ? "COVERED" : "GAP    "}] ${r.questionKey} (${q?.type})`);
  if (r.covered) console.log(`         -> "${r.extractedAnswer}"`);
}
