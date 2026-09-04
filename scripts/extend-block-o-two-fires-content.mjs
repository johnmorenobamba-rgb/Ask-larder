import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

// Fills real content gaps found by broad Ask Larder testing (2026-09-04):
// ~28 realistic questions asked, several correctly fell back to "ask your
// supervisor" for things that should have a real, written policy instead
// (staff meals, sick-day call-ins, delivery discrepancies, chemical
// storage, evacuation route, handling an altercation, standard pours,
// EFTPOS outage, tabs/tips, reservations, corkage/BYO, lost property).
// Extends existing modules with new sections (continuing section_order
// after each module's current max) and adds one new Venue Manager module.

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
  const { data: mod, error } = await admin
    .from("modules")
    .select("id")
    .eq("venue_id", VENUE_ID)
    .eq("title", moduleTitle)
    .single();
  if (error || !mod) throw new Error(`Module not found: ${moduleTitle}`);

  const { data: existing } = await admin
    .from("module_sections")
    .select("section_order")
    .eq("module_id", mod.id)
    .order("section_order", { ascending: false })
    .limit(1);
  let order = (existing?.[0]?.section_order ?? 0) + 1;

  for (const section of newSections) {
    const { error: sErr } = await admin.from("module_sections").insert({
      module_id: mod.id,
      section_order: order,
      content: fixHeadingSpacing(section.content),
    });
    if (sErr) throw sErr;
    if (!section.noQuestion && section.question) {
      const { error: qErr } = await admin.from("check_questions").insert({
        module_id: mod.id,
        question: section.question.q,
        options: section.question.options,
        correct_option_index: section.question.correct,
        expected_answer_context: section.question.corrective,
        section_order: order,
      });
      if (qErr) throw qErr;
    }
    order += 1;
  }
  console.log(`Extended "${moduleTitle}" with ${newSections.length} new section(s)`);
  return mod.id;
}

async function main() {
  const touchedModuleIds = [];

  touchedModuleIds.push(
    await addSections("Welcome & How We Work", [
      {
        content:
          "## Staff meals and sick days\nOn a rostered shift over 5 hours, you get a staff meal from the kitchen, chosen by whoever's cooking that day, not an off-menu request. If you're too unwell to work a shift, call your supervisor as early as possible, ideally the night before or first thing that morning, so the roster can be covered. This is different to running late: a sick day is a full no-show, so don't wait until your start time to call.",
        question: {
          q: "What's the difference between reporting you're running late and calling in sick?",
          options: [
            "There's no real difference",
            "A sick day should be called in as early as possible, not at your start time",
            "Sick days don't need to be reported",
          ],
          correct: 1,
          corrective: "A sick day is a full no-show, so it needs to be called in as early as possible, not left until your start time like a lateness call.",
        },
      },
      {
        content:
          "## Staff discount\nStaff get a 20% discount on food and drinks when eating or drinking at Two Fires off the clock, shown to whoever's serving you before you order. It doesn't apply on shift, and it's not transferable to friends or family.",
        question: {
          q: "When does the staff discount apply?",
          options: ["Anytime, on or off shift", "Off the clock only, not while working", "Only for family and friends of staff"],
          correct: 1,
          corrective: "The staff discount only applies off the clock, not while you're actually working, and it's for staff only.",
        },
      },
    ]),
  );

  touchedModuleIds.push(
    await addSections("Kitchen Opening & Closing Procedure", [
      {
        content:
          "## Handling a delivery discrepancy\nIf a delivery arrives short, damaged, or wrong, check it against the delivery docket before the driver leaves if possible. Note the discrepancy on the docket, photograph it, and tell the Head Chef or Elena the same day so it can be sorted with the supplier before it affects service.",
        question: {
          q: "What's the first thing to do if a delivery arrives short?",
          options: [
            "Accept it and mention it later if it becomes a problem",
            "Check it against the docket before the driver leaves, if possible",
            "Send it back without checking",
          ],
          correct: 1,
          corrective: "Check the delivery against the docket before the driver leaves if you can, then note and photograph any discrepancy.",
        },
      },
    ]),
  );

  touchedModuleIds.push(
    await addSections("Kitchen Cleaning & Sanitation", [
      {
        content:
          "## Out-of-date stock and taking food home\nStock past its use-by date gets thrown out, not served, no exceptions, and gets logged so the Head Chef can see if a supplier or ordering pattern needs adjusting. Staff aren't able to take home food that's being thrown out. This is a food-safety and stock-control rule, not a judgement on the food itself.",
        question: {
          q: "Can staff take home food that's being thrown out?",
          options: [
            "Yes, if it would otherwise go to waste",
            "No, it gets thrown out and staff don't take it home",
            "Only with a manager's permission",
          ],
          correct: 1,
          corrective: "Food being thrown out doesn't go home with staff, even to avoid waste. It's a food-safety and stock-control rule.",
        },
      },
    ]),
  );

  touchedModuleIds.push(
    await addSections("Manual Handling & PPE", [
      {
        content:
          "## Cleaning chemical safety\nCleaning chemicals (degreaser, sanitiser, drain cleaner) are stored in their own labelled containers in the chemical store, never decanted into an unlabelled bottle. Never mix chemicals together, some combinations release dangerous fumes. Wear gloves when handling concentrated chemical, and check the safety data sheet in the office folder if you're ever unsure.",
        question: {
          q: "Why should cleaning chemicals never be mixed together?",
          options: ["It wastes product", "Some combinations release dangerous fumes", "It makes cleaning slower"],
          correct: 1,
          corrective: "Mixing certain cleaning chemicals releases dangerous fumes. Keep them separate, always in their own labelled containers.",
        },
      },
    ]),
  );

  touchedModuleIds.push(
    await addSections("Emergencies & Incidents", [
      {
        content:
          "## Fire alarm evacuation\nIf the fire alarm goes off, stop what you're doing, turn off any hot equipment if it's safe to do so in a few seconds, and leave by the nearest exit: front entrance for FOH and bar areas, the kitchen's own back door for BOH. The assembly point is the footpath across the street, clear of the building. Do a headcount once there and tell your supervisor if anyone is missing.",
        question: {
          q: "Where do staff meet after evacuating for a fire alarm?",
          options: ["Back inside once it stops", "The footpath across the street, clear of the building", "Wherever is closest at the time"],
          correct: 1,
          corrective: "The assembly point is the footpath across the street, clear of the building, not wherever happens to be closest.",
        },
      },
      {
        content:
          "## If a conflict turns physical\nIf a conflict between customers looks like it's about to turn physical, don't put yourself between them. Get the Venue Manager or the most senior person on shift immediately, and call 000 if it escalates before they arrive. Staff aren't expected to physically intervene.",
        question: {
          q: "What should you do if two customers look like they're about to fight?",
          options: ["Step between them to calm it down", "Get your supervisor immediately, don't physically intervene", "Ignore it unless it actually starts"],
          correct: 1,
          corrective: "Get your supervisor immediately rather than physically intervening. Staff safety comes first.",
        },
      },
    ]),
  );

  touchedModuleIds.push(
    await addSections("Bar Service & RSA Compliance", [
      {
        content:
          "## Standard pour sizes\nStandard pours at Two Fires: 30ml for a spirit nip, a middy or schooner for tap beer depending on what's ordered, and a standard 150ml glass for wine unless a customer asks for a smaller taster. Free-pouring above these without being asked isn't just a cost problem, it's a responsible-service problem too, since it makes it harder to track how much a patron has actually had.",
        question: {
          q: "Why do standard pour sizes matter for responsible service, not just cost?",
          options: [
            "They don't relate to RSA at all",
            "Free-pouring makes it harder to track how much a patron has actually had",
            "Larger pours are always fine if the customer asks",
          ],
          correct: 1,
          corrective: "Pouring more than the standard measure makes it harder to track a patron's real intake, which is a responsible-service issue, not just a cost one.",
        },
      },
    ]),
  );

  touchedModuleIds.push(
    await addSections("Cash Handling & End-of-Day", [
      {
        content:
          "## If EFTPOS goes down\nIf EFTPOS goes down, tell the Venue Manager immediately. Cash is still accepted as normal. For card-only customers, take their name and number and let them know a team member will call to sort payment once the terminal is back up, rather than turning them away.",
        question: {
          q: "If EFTPOS goes down and a customer can only pay by card, what do you do?",
          options: [
            "Turn them away until it's fixed",
            "Take their name and number so payment can be sorted once it's back up",
            "Let them leave without paying",
          ],
          correct: 1,
          corrective: "Take the customer's name and number so payment can be followed up once EFTPOS is back, rather than turning them away.",
        },
      },
      {
        content:
          "## Tabs and tips\nRegulars can run a tab only with the Venue Manager's approval, capped at a set amount, and settled before they leave that session, not carried over to another visit. Tips are pooled across the shift and split evenly among everyone rostered that day, not kept individually.",
        question: {
          q: "How are tips handled at Two Fires?",
          options: [
            "Kept individually by whoever served the table",
            "Pooled and split evenly among everyone rostered that shift",
            "Given entirely to the Venue Manager",
          ],
          correct: 1,
          corrective: "Tips are pooled and split evenly among everyone rostered that shift, not kept by whoever happened to serve the table.",
        },
      },
    ]),
  );

  // New module: customer-facing house policies that don't fit a safety or
  // compliance module, but real Ask Larder questions kept falling back on.
  const { data: existingModule } = await admin
    .from("modules")
    .select("id")
    .eq("venue_id", VENUE_ID)
    .eq("title", "Customer Service & House Policies")
    .maybeSingle();
  let newModuleId = existingModule?.id;
  if (!newModuleId) {
    const { data: created, error: cErr } = await admin
      .from("modules")
      .insert({ venue_id: VENUE_ID, title: "Customer Service & House Policies", status: "live" })
      .select("id")
      .single();
    if (cErr) throw cErr;
    newModuleId = created.id;

    const { data: vmRole } = await admin
      .from("staff_roles")
      .select("id")
      .eq("venue_id", VENUE_ID)
      .eq("name", "Venue Manager")
      .single();
    await admin.from("module_roles").insert({ module_id: newModuleId, role_id: vmRole.id });
  }

  const newModuleSections = [
    {
      content:
        "## Reservations\nTwo Fires doesn't take table bookings online or by phone for regular seating, it's walk-in only, which suits the bar's layout. For a genuinely large group (10 or more), the Venue Manager can informally note it in the day's shift handover, but there's no formal booking system to promise a table.",
      question: {
        q: "Does Two Fires take formal table reservations?",
        options: ["Yes, through an online booking system", "No, it's walk-in only, with informal notes for large groups", "Only for regulars"],
        correct: 1,
        corrective: "Two Fires is walk-in only. Large groups get an informal note in the shift handover, not a formal booking.",
      },
    },
    {
      content:
        "## Corkage and BYO\nTwo Fires doesn't allow BYO alcohol under its liquor licence, all drinks must be purchased on-site. This isn't negotiable and isn't a house-preference thing, it's a licensing requirement. Politely explain this if a customer asks about bringing their own bottle.",
      question: {
        q: "Can a customer bring their own bottle of wine to Two Fires?",
        options: ["Yes, with a corkage fee", "No, BYO alcohol isn't allowed under the venue's liquor licence", "Only on quiet weeknights"],
        correct: 1,
        corrective: "BYO alcohol isn't allowed under the venue's liquor licence. It's a legal requirement, not a house preference.",
      },
    },
    {
      content:
        "## Lost property\nLost property gets bagged, labelled with the date and where it was found, and kept in the office. If a customer calls or comes back asking, check the office first. Anything unclaimed after 30 days gets donated.",
      question: {
        q: "What happens to lost property after 30 days unclaimed?",
        options: ["It's thrown out immediately", "It's donated", "It's kept indefinitely"],
        correct: 1,
        corrective: "Unclaimed lost property is donated after 30 days, not thrown out or kept indefinitely.",
      },
    },
    {
      content:
        "## Special requests\nA customer bringing their own birthday cake is fine, there's no cakeage fee, just let the kitchen know so plates and forks are ready. Two Fires doesn't do table decorations or setups beyond that. Keep the expectation simple when a customer asks.",
      question: {
        q: "Is there a fee for a customer bringing their own birthday cake?",
        options: ["Yes, a cakeage fee applies", "No, but let the kitchen know so plates and forks are ready", "Only on weekends"],
        correct: 1,
        corrective: "No cakeage fee, just give the kitchen a heads-up so plates and forks are ready.",
      },
    },
  ];

  let order = 1;
  for (const section of newModuleSections) {
    await admin.from("module_sections").insert({
      module_id: newModuleId,
      section_order: order,
      content: fixHeadingSpacing(section.content),
    });
    await admin.from("check_questions").insert({
      module_id: newModuleId,
      question: section.question.q,
      options: section.question.options,
      correct_option_index: section.question.correct,
      expected_answer_context: section.question.corrective,
      section_order: order,
    });
    order += 1;
  }
  touchedModuleIds.push(newModuleId);
  console.log(`Created "Customer Service & House Policies" (${newModuleSections.length} sections)`);

  console.log("\nModule IDs to re-ingest:");
  for (const id of touchedModuleIds) console.log(" ", id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
