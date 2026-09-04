import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const VENUE_ID = "b379e33f-b0d8-47bf-810e-450635b29b6b";

function fixHeadingSpacing(content) {
  if (!content.startsWith("## ")) return content;
  const firstBreak = content.indexOf("\n");
  if (firstBreak === -1) return content;
  return content.slice(0, firstBreak) + "\n" + content.slice(firstBreak);
}

async function addSections(moduleTitle, newSections) {
  const { data: mod, error } = await admin.from("modules").select("id").eq("venue_id", VENUE_ID).eq("title", moduleTitle).single();
  if (error || !mod) throw new Error(`Module not found: ${moduleTitle}`);
  const { data: existing } = await admin.from("module_sections").select("section_order").eq("module_id", mod.id).order("section_order", { ascending: false }).limit(1);
  let order = (existing?.[0]?.section_order ?? 0) + 1;
  for (const section of newSections) {
    await admin.from("module_sections").insert({ module_id: mod.id, section_order: order, content: fixHeadingSpacing(section.content) });
    if (!section.noQuestion && section.question) {
      await admin.from("check_questions").insert({
        module_id: mod.id, question: section.question.q, options: section.question.options,
        correct_option_index: section.question.correct, expected_answer_context: section.question.corrective, section_order: order,
      });
    }
    order += 1;
  }
  console.log(`Extended "${moduleTitle}" with ${newSections.length} new section(s)`);
  return mod.id;
}

async function main() {
  const ids = [];
  ids.push(await addSections("Welcome & How We Work", [
    {
      content:
        "## Opening hours\nTwo Fires is open 11am to 11pm Sunday through Thursday, and 11am to midnight Friday and Saturday. Kitchen orders stop 30 minutes before close each night so the fryer and pizza oven can be shut down properly; the bar keeps serving until the venue's actual close.",
      question: {
        q: "On which nights is Two Fires open until midnight?",
        options: ["Every night", "Friday and Saturday", "Sunday and Monday only"],
        correct: 1,
        corrective: "Two Fires stays open until midnight on Friday and Saturday. Sunday through Thursday it closes at 11pm.",
      },
    },
  ]));

  ids.push(await addSections("Full Venue Open/Close", [
    {
      content:
        "## Noise complaints\nIf a neighbour complains about noise, whether in person, by phone, or left as a note, take it seriously and note the time and what was said. Check the music volume and, if it's a warm night, whether outdoor seating is getting loud. Tell Elena about any complaint the same day, even if it's already been resolved, since repeat complaints can affect the venue's licence.",
      question: {
        q: "Why does a noise complaint get reported to Elena even after it's already resolved?",
        options: [
          "It doesn't need to be reported if it's resolved",
          "Repeat complaints can affect the venue's licence",
          "Only unresolved complaints matter",
        ],
        correct: 1,
        corrective: "Every complaint gets reported, even resolved ones, because a pattern of repeat complaints can put the venue's licence at risk.",
      },
    },
  ]));

  console.log("\nModule IDs to re-ingest:");
  for (const id of ids) console.log(" ", id);
}
main().catch((err) => { console.error(err); process.exit(1); });
