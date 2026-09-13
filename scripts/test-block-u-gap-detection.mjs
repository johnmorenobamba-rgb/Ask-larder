// Block U2 -- headless test of detectSopGaps against a deliberately rough,
// incomplete sample SOP, before touching SopInterview.tsx's UI. Checks the
// AI pass only marks something "covered" when it's genuinely, specifically
// answered -- not on a vague or partial mention.
import { config } from "dotenv";
config({ path: ".env.local" });

import { detectSopGaps } from "../src/lib/ai/detectSopGaps.ts";
import { getQuestionsForTopic } from "../src/lib/onboarding/sopQuestions.ts";

// A real-feeling rough sample: covers who/when clearly, is vague on safety
// and materials, and never mentions escalation or definition of done at
// all -- the gaps a real half-finished venue document would actually have.
const SAMPLE_SOP = `
Crowd Control - Door Notes

We use security on Fri/Sat nights and sometimes Thursday if there's live music on.
The security guys check ID at the door and look in bags on busy nights.
Bar staff also check ID at the bar every night regardless of whether security is on.

If someone's causing trouble we just try to sort it out calmly.
`.trim();

const questions = getQuestionsForTopic("crowd_control_and_door_security");
const results = await detectSopGaps("Crowd control and door security", SAMPLE_SOP, questions);

console.log("Sample document:\n---\n" + SAMPLE_SOP + "\n---\n");
for (const r of results) {
  const q = questions.find((q) => q.key === r.questionKey);
  console.log(`[${r.covered ? "COVERED" : "GAP    "}] ${r.questionKey} (${q?.type})`);
  if (r.covered) console.log(`         -> "${r.extractedAnswer}"`);
}
