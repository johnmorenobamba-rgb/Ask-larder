import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Block O — Full Prototype Validation Pass demo venue. Dedicated NEW venue,
// not Metropolis Events (venue #1) and not a disposable test fixture — a
// realistic-but-fictional 50-seat Melbourne bar, seeded with compliance-
// grounded content (see docs/block-o-compliance-sources.md for citations).
// Idempotent: re-running removes any previous "two-fires" venue first.

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SLUG = "two-fires";
const OWNER_EMAIL = "two-fires-owner@example.com";
const OWNER_PASSWORD = "TwoFiresOwner2026!";
const OWNER_NAME = "Elena Bianchi";
const VENUE_MANAGER_NAME = "Aisha Farouk";
const VENUE_MANAGER_PIN = "5192";
const HEAD_CHEF_NAME = "Tomas Reyes";
const HEAD_CHEF_PIN = "8340";

// ---------------------------------------------------------------------------
// Module content. Every compliance-relevant fact below is grounded in a real
// cited source — see docs/block-o-compliance-sources.md. Voice matches the
// locked Module Content & Assessment Standard: plain verbs, sentence case,
// 3-6 sections/module, callouts reserved for safety-critical info only,
// check-questions multiple-choice, skipped only for pure context-setting
// sections.
// ---------------------------------------------------------------------------

const modules = [
  {
    title: "Welcome & How We Work",
    roles: [], // shared
    sections: [
      {
        content:
          "## Welcome to Two Fires\nA short welcome from Elena: Two Fires is a 50-seat neighbourhood bar built around two things that are always hot — the fryer and the pizza oven — plus a drinks list the whole team is proud to stand behind. Whatever your role, the same standard applies: good food and drinks, served safely, by people who know exactly what they're doing.",
        noQuestion: true,
      },
      {
        content:
          "## How this venue communicates\n- Kitchen runs through the Head Chef; the floor and bar run through the Venue Manager. Both report to Elena.\n- Shifts and rosters are communicated via the roster board in the office — changes go through your supervisor, not a swap arranged privately between staff.\n- If you're going to be late, contact your supervisor at least 30 minutes before your shift start time.\n- Raise a problem with your supervisor as soon as you notice it. Raise an idea any time — it doesn't need to wait for a problem.",
        question: {
          q: "If you know you're going to be late for a shift, what should you do?",
          options: [
            "Wait until you arrive to explain",
            "Contact your supervisor at least 30 minutes before your shift start time",
            "Message a co-worker to cover for you without telling a supervisor",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Presentation & basics\nUniform: black on the floor and bar, chef whites in the kitchen. Personal hygiene basics are covered in full in the Food Safety & Hygiene module. Phone use: no phones on the floor, at the bar, or on the pass during work hours, unless it's genuinely work-related — checking a recipe reference or calling a supervisor. Phones out in front of customers or over a hot fryer are both a bad look and a real safety risk.",
        question: {
          q: "When is it acceptable to use your phone during a shift?",
          options: [
            "Anytime it's quiet",
            "Only genuinely work-related uses, like calling a supervisor",
            "Only during your break, and never otherwise",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## How training works here\nModules are worked through on the venue iPad at your own pace. Each module ends with a short comprehension check — not a formal exam, just a way to catch anything that didn't land. Certificates (Food Handling, RSA, First Aid) get uploaded as part of the relevant module. Once you've finished onboarding, Ask Larder is always available — it only knows what's actually true for this kitchen and this bar, not general internet advice.",
        question: {
          q: "If you forget how to do something a few weeks from now, what should you try first?",
          options: [
            "Guess and hope for the best",
            "Ask Larder — it only knows what's actually true for this venue",
            "Wait until your next shift with your supervisor to ask in person",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Food Safety & Hygiene",
    roles: [],
    sections: [
      {
        content:
          "## Handwashing\nWash hands before starting work and after any break, after using the toilet, after touching raw meat or seafood, after touching your face or phone, after handling rubbish, and before putting on or after taking off gloves. Wet hands, lather with soap for at least 20 seconds covering palms, backs of hands, between fingers and under nails, rinse, then dry with a single-use paper towel — use that towel to turn off the tap if it isn't sensor-operated.",
        question: {
          q: "Why use a paper towel to turn off the tap instead of a freshly washed hand?",
          options: ["It's faster", "Touching the tap handle with a clean hand can re-contaminate it", "It saves water"],
          correct: 1,
        },
      },
      {
        content:
          "## Temperature control\nUnder the Food Standards Code, potentially hazardous food must be kept at 5°C or colder, or 60°C or hotter — between those two points is the \"danger zone\" where bacteria multiply fastest. If food needs to cool down, it must go from 60°C to 21°C within 2 hours, then from 21°C to 5°C within a further 4 hours. Walk-in and fridge temperatures get logged at every kitchen open and close (see Kitchen Opening & Closing Procedure).",
        question: {
          q: "Under the Food Standards Code, what's the safe holding temperature for potentially hazardous food?",
          options: ["5°C or colder, or 60°C or hotter", "Anywhere between 10°C and 50°C", "Room temperature is fine if served within an hour"],
          correct: 0,
        },
      },
      {
        content:
          "## Food Safety Supervisor at Two Fires\nUnder Standard 3.2.2A, a business that handles high-risk food (like Two Fires' fried food and dairy-based menu) must have a certified Food Safety Supervisor on-site. The Head Chef holds this certification, renewed every 5 years. Every food handler — not just the Head Chef — must complete food safety training covering safe handling, contamination, cleaning/sanitising and personal hygiene before working with high-risk food.",
        question: {
          q: "How often does a Food Safety Supervisor certification need to be renewed?",
          options: ["Every year", "Every 5 years", "It never expires once completed"],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Allergen Handling",
    roles: [],
    sections: [
      {
        content:
          "## Australia's declarable allergens\nUnder the Food Standards Code, these must be declared whenever they're an ingredient — no exception for \"only a small amount\": cereals containing gluten (wheat, rye, barley, oats, spelt), crustacean, egg, fish, milk, tree nuts, peanuts, sesame, soybeans, lupin, and added sulphites (over 10mg/kg). Since Feb 2026, allergen statements use the mandatory Plain English terms, in bold, in a separate allergen summary as well as the ingredient list.",
        question: {
          q: "Which of these is one of Australia's declarable allergens under the Food Standards Code?",
          options: ["Sesame", "Basil", "Onion"],
          correct: 0,
        },
      },
      {
        content:
          "## Two Fires' specific cross-contact risk\nFried Chicken, Salt & Pepper Squid, Chips, Fried Pickles and Panko Prawns all go through the same fryer oil — meaning a customer avoiding gluten or crustacean can still be exposed through shared oil, even if the dish they ordered doesn't list that allergen. Pizza dough contains gluten and touches shared prep surfaces and the same pizza peel used for other bases.",
        question: {
          q: "Why is Two Fires' fryer a genuine allergen risk even for a dish with a gluten-free batter?",
          options: [
            "Fryers run hotter than other equipment",
            "Oil shared with other fried items (like crumbed or battered food) can transfer allergens into an otherwise safe dish",
            "Fryers are harder to clean",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Handling an allergy order\n1. FOH flags the allergy clearly on the order — never relies on memory.\n2. Kitchen confirms back verbally or on the docket before starting.\n3. If the item normally goes through the shared fryer, the kitchen tells FOH honestly whether it can be made safely — it often can't, and that's the correct answer to give the customer rather than guessing.\n4. Whoever plates it does a final check against the ticket before it leaves the pass.",
        question: {
          q: "If a customer wants a fried item without an allergen that's in the shared fryer oil, what's the right response?",
          options: [
            "Make it anyway and hope the trace amount doesn't matter",
            "Tell the customer honestly it can't be made safely through the shared fryer",
            "Serve it without mentioning the shared oil",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## If something goes wrong\n**Callout: If an allergen order goes out incorrectly, or a customer shows signs of a reaction (swelling, difficulty breathing, hives), get your supervisor immediately. Speed matters more than paperwork in the moment.**",
        question: {
          q: "If a customer shows signs of an allergic reaction, what's the first thing you do?",
          options: ["Wait and see if it passes", "Get your supervisor immediately", "Finish serving your other tables first"],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Kitchen Opening & Closing Procedure",
    roles: ["Head Chef"],
    sections: [
      {
        content:
          "## Opening checks\n1. Check and log the walk-in and fridge temperatures — must read 5°C or colder.\n2. Glance over stock rotation — oldest dated items at the front.\n3. Check the dry store for anything out of date or damaged.\n4. Turn on the fryers and pizza oven early enough to reach temperature before service.",
        question: {
          q: "What temperature must the walk-in and fridges read at opening check?",
          options: ["5°C or colder", "10°C or colder", "Room temperature is fine if it's morning"],
          correct: 0,
        },
      },
      {
        content:
          "## Pre-service setup\nCheck fryer oil level (topped up to the fill line, not overfilled) and oil quality (not dark or smoking) before service starts. Confirm the pizza oven has reached working temperature. Set up the prep bench, including the induction cooktop and vacuum sealer if they're needed for that day's prep.",
        question: {
          q: "What should you check about the fryer oil before service, beyond just turning the fryer on?",
          options: ["Nothing — turning it on is enough", "Oil level and oil quality (not dark or smoking)", "Only the oil's brand"],
          correct: 1,
        },
      },
      {
        content:
          "## Closing shutdown\n1. Turn off both fryers, skim crumbs, let oil cool before covering.\n2. Turn off the pizza oven and griddle — do not start cleaning either while still hot (see Pizza Oven & Grill Safety).\n3. Wipe down all cooking surfaces once cool.\n4. Seal the walk-in door properly and log the closing temperature.",
        question: {
          q: "Why do you wait before cleaning the pizza oven or griddle at close?",
          options: [
            "To save water",
            "Cleaning a hot surface risks a burn",
            "There's no reason, it's just habit",
          ],
          correct: 1,
        },
      },
      {
        content:
          "**Callout: Report any equipment fault (fryer, pizza oven, walk-in, extraction) to the Venue Manager and Elena the same night — don't wait for the next shift to mention it.** Hand over any stock or cash-adjacent notes to the Venue Manager before you leave.",
        question: {
          q: "If you notice a fryer or walk-in fault at close, when should you report it?",
          options: ["Next time someone asks", "The same night, to the Venue Manager and Elena", "Only if it happens again"],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Deep Fryer Safety & Oil Management",
    roles: ["Head Chef"],
    sections: [
      {
        content:
          "## Oil temperature & fire risk\nFrying oil runs around 180°C. Never leave a fryer unattended while it's at frying temperature — overheated oil can ignite on its own well before it visibly smokes heavily. Keep oil below the fryer's marked maximum fill line; overfilling causes boil-over when food is added.",
        question: {
          q: "Why should a fryer never be left unattended at frying temperature?",
          options: [
            "It wastes gas or electricity",
            "Overheated oil can ignite on its own",
            "It makes the food taste worse",
          ],
          correct: 1,
        },
      },
      {
        content:
          "**Callout: Cooking oil and fat fires are Class F fires. Only use the wet chemical (Class F) extinguisher kept at the fryer station — never water. Water hitting oil above 200°C flash-boils into steam and atomises the burning oil into a fireball. If a fryer fire is beyond what the extinguisher can handle in seconds, get everyone clear and call 000 — don't keep trying.**",
        question: {
          q: "What must never be used on a fryer oil fire?",
          options: ["A wet chemical extinguisher", "Water", "A fire blanket over the fryer"],
          correct: 1,
        },
      },
      {
        content:
          "## Oil filtering & changeover\nSkim the oil daily during close-down. Filter or change the oil on the schedule set by the Head Chef based on how dark or how it smells — don't wait for it to smoke. Dispose of used oil into the designated waste-oil container for collection; never pour it down a drain.",
        question: {
          q: "How should used fryer oil be disposed of?",
          options: ["Down the kitchen drain", "Into the designated waste-oil container", "In the general rubbish bin"],
          correct: 1,
        },
      },
      {
        content:
          "## Allergen cross-contact reminder\nAll fried items at Two Fires share the same oil — see the Allergen Handling module for how this affects allergy orders. This isn't a fryer-cleanliness issue, it's a shared-ingredient issue that no amount of skimming fixes.",
        question: {
          q: "Does skimming and cleaning the fryer oil remove the allergen cross-contact risk?",
          options: ["Yes, if it's cleaned well", "No — shared oil is a shared-ingredient issue, not a cleanliness one", "Only if it's filtered twice"],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Pizza Oven & Grill Safety",
    roles: ["Head Chef"],
    sections: [
      {
        content:
          "## Surface temperatures\nThe pizza deck oven and the flat-top griddle run far hotter than a home oven. The cooking deck, oven interior, and any surface near the open front can cause a severe burn from even brief contact.",
        question: {
          q: "How do pizza deck oven surfaces compare to a home oven?",
          options: ["About the same temperature", "Much hotter — brief contact can cause a severe burn", "Cooler, since it's gas-fired"],
          correct: 1,
        },
      },
      {
        content:
          "**Callout: Only use dry peels and oven cloths near the pizza oven or griddle. A damp cloth on a hot surface flashes to steam and can burn you. Never touch the deck, the oven interior, or the griddle surface while hot.**",
        question: {
          q: "Why should oven cloths and peels always be dry near the pizza oven?",
          options: [
            "Damp cloths wear out faster",
            "A damp cloth on a hot surface flashes to steam and can burn you",
            "Dry cloths are easier to hold",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Gas & extraction\nDon't attempt any gas connection check or repair yourself — that's a licensed technician's job. The extraction hood and fire suppression system above the fryers, griddle and pizza oven must stay completely unobstructed — never hang cloths, tools or anything else from it or near its sensors.",
        question: {
          q: "What should you do if you think there's a gas issue with the pizza oven?",
          options: [
            "Check the connection yourself",
            "Leave it to a licensed technician",
            "Ignore it if the oven still lights",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Kitchen Cleaning & Sanitation",
    roles: ["Head Chef"],
    sections: [
      {
        content:
          "## Daily close-down clean\nEvery shift, once equipment has cooled: wipe down the fryer exterior and surrounds, clean the griddle surface, wipe the pizza oven's cool-to-touch exterior surfaces, clean all prep benches, and mop the kitchen floor.",
        question: {
          q: "When should the pizza oven's exterior surfaces be cleaned?",
          options: ["While still hot, for efficiency", "Once cooled", "Only once a week"],
          correct: 1,
        },
      },
      {
        content:
          "## Weekly deep clean rota\nDeep-clean tasks are spread across the week rather than all done on one day — extraction hood filters one day, walk-in shelving another, dry store organisation another. This means no single shift carries the whole workload, and nothing gets skipped because \"we'll get to it eventually.\"",
        question: {
          q: "Why are deep-clean tasks spread across different days instead of done all at once?",
          options: [
            "To save on cleaning product costs",
            "So no single shift carries the whole workload and nothing gets skipped",
            "Because it's required by law",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Stock hygiene in the walk-in\nEvery container in the walk-in must be labelled with contents and date. An unlabelled container isn't just untidy — it's the single most common cause of a stock or allergen mix-up, and gets thrown out if it can't be identified.",
        question: {
          q: "Why is an unlabelled container in the walk-in treated as a real problem?",
          options: [
            "It only matters during a health inspection",
            "It's the most common cause of a stock or allergen mix-up",
            "It slows down the stocktake",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Full Venue Open/Close",
    roles: ["Venue Manager"],
    sections: [
      {
        content:
          "## Opening the venue\nUnlock the front entrance, disarm the alarm, and count the starting float into the till against the previous night's closing count. Turn on POS terminals and check overnight deliveries against the dry store/cellar.",
        question: {
          q: "What should the opening float count be checked against?",
          options: ["Nothing — just count it in", "The previous night's closing count", "An estimate from memory"],
          correct: 1,
        },
      },
      {
        content:
          "**Callout: Alarm codes, keys, and the safe combination are Venue Manager/Owner information only. Ask Larder will never answer a question about these — if a staff member asks, the answer is always to check with the Venue Manager or Elena directly.**",
        noQuestion: true,
      },
      {
        content:
          "## Closing the venue\n1. Reconcile the float and takings against the POS end-of-day report.\n2. Deposit cash into the safe.\n3. Confirm the kitchen's closing checklist is complete before the Head Chef leaves.\n4. Set the alarm and lock up — the Venue Manager (or a nominated senior staff member) is always the last to leave.",
        question: {
          q: "Who is responsible for confirming the kitchen's closing checklist is complete before lock-up?",
          options: ["Whoever is rostered on cleaning", "The Venue Manager", "It isn't checked at close"],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Bar Service & RSA Compliance",
    roles: ["Venue Manager"],
    sections: [
      {
        content:
          "## RSA certificate requirement\nAnyone selling, supplying or serving alcohol at Two Fires must hold a current Responsible Service of Alcohol (RSA) certificate from a Liquor Control Victoria approved training provider. New starters have 28 days from their first shift to complete it. The certificate is valid for 3 years in Victoria.",
        question: {
          q: "In Victoria, how long is an RSA certificate valid for?",
          options: ["1 year", "3 years", "It never expires"],
          correct: 1,
        },
      },
      {
        content:
          "## Refusing service\nA patron is intoxicated if their speech, balance, coordination or behaviour is noticeably affected by alcohol. Once someone is intoxicated, they must not be served any more alcohol — but they can remain on the premises unless they become drunk or disorderly, in which case they must be removed.",
        question: {
          q: "Once a patron is assessed as intoxicated, what's the correct action?",
          options: [
            "Serve one more drink to wind them down gently",
            "Stop serving them alcohol — they can stay unless disorderly",
            "Ask them to leave immediately regardless of behaviour",
          ],
          correct: 1,
        },
      },
      {
        content:
          "**Callout: Never serve or supply alcohol to anyone under 18, and always ID-check if there's any doubt. Under the Liquor Control Reform Act 1998 (Vic), the licensee faces a penalty of 120 penalty units and the staff member who served them faces 20 penalty units — this is a real legal exposure, not just a house rule.**",
        question: {
          q: "Under Victorian law, what happens if a staff member serves alcohol to someone under 18?",
          options: [
            "Nothing, as long as it wasn't intentional",
            "The staff member personally faces a real legal penalty, separate from the licensee's",
            "Only the licensee is ever penalised",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Cash Handling & End-of-Day",
    roles: ["Venue Manager"],
    sections: [
      {
        content:
          "## Float & till procedure\nCount the float in at the start of shift and out at the end, against the recorded starting amount. Report any discrepancy to Elena the same day, however small — this isn't about blame, it's about catching a till error or a real issue early.",
        question: {
          q: "What should you do if the till count doesn't match at the end of a shift?",
          options: ["Ignore it if it's a small amount", "Report it to Elena the same day", "Fix the number in the system yourself"],
          correct: 1,
        },
      },
      {
        content:
          "## End-of-day reconciliation\nRun the POS end-of-day report and reconcile cash and card totals against it. Any discrepancy beyond normal rounding gets flagged in the handover notes and followed up before the next trading day.",
        question: {
          q: "What's reconciled against the POS end-of-day report?",
          options: ["Cash and card totals", "Only cash", "Nothing — the report is just filed"],
          correct: 0,
        },
      },
      {
        content:
          "**Callout: The safe combination is Venue Manager/Owner information only — Ask Larder will never provide it. If you need cash from the safe and aren't authorised, ask the Venue Manager directly.**",
        noQuestion: true,
      },
    ],
  },
  {
    title: "Beer Line & Cellar Hygiene",
    roles: ["Venue Manager"],
    sections: [
      {
        content:
          "## Why lines need cleaning\nBeer is a food product. Without regular cleaning, biofilm, yeast, mould and \"beer stone\" build up inside the lines, affecting both flavour and safety of what's poured.",
        question: {
          q: "Why do beer lines need regular cleaning, even though beer looks clean pouring out?",
          options: [
            "It doesn't matter, it's just for taste",
            "Biofilm, yeast, mould and beer stone build up inside the lines over time",
            "Only the kegs need attention, not the lines",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Cleaning schedule at Two Fires\nAll 8 tap lines get a full clean with food-grade line-cleaning chemical every fortnight, matching Australian industry standard. Tap nozzles get a daily rinse as part of close-down.",
        question: {
          q: "How often does Two Fires do a full beer line clean?",
          options: ["Once a year", "Every fortnight", "Only when the beer tastes off"],
          correct: 1,
        },
      },
      {
        content:
          "**Callout: The cellar holds CO2 for the beer system, which can displace breathable air in a small enclosed space. Ventilate before extended time in the cellar, and never attempt to repair a gas line or coupler yourself — call a technician.**",
        question: {
          q: "Why does the cellar need ventilating before spending extended time in it?",
          options: [
            "It gets too warm otherwise",
            "CO2 from the beer system can displace breathable air in a small space",
            "It's a house cleanliness rule, not a safety one",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Manual Handling & PPE",
    roles: [],
    sections: [
      {
        content:
          "## Lifting\nWhen lifting kegs, stock deliveries or anything heavy: bend at the knees not the back, keep the load close to your body, and get help or use a trolley for anything awkward or over a comfortable one-person weight. Never twist while carrying a load.",
        question: {
          q: "What's the correct way to lift something heavy, like a keg or a stock delivery?",
          options: ["Bend at the back to keep your knees fresh", "Bend at the knees, keep the load close, get help if needed", "Twist quickly to build momentum"],
          correct: 1,
        },
      },
      {
        content:
          "## PPE by task\nCut-resistant glove for kitchen prep work involving knives on repetitive cuts. Dry oven cloths only near the fryer, griddle and pizza oven — never damp. Non-slip shoes for everyone, kitchen and floor, given the fryer and dishwashing areas both create wet or greasy floor patches.",
        question: {
          q: "Why is non-slip footwear required for both kitchen and floor staff at Two Fires?",
          options: [
            "It's just a uniform choice",
            "The fryer and dishwashing areas both create wet or greasy floor patches",
            "It's only needed in the kitchen",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Emergencies & Incidents",
    roles: [],
    sections: [
      {
        content:
          "**Callout: The Class F wet chemical extinguisher at the fryer station is for cooking oil/fat fires only — never water. General ABE extinguishers are located at the bar and near the front entrance. If in doubt, get everyone clear and call 000 rather than trying to fight a fire beyond what one extinguisher handles quickly.**",
        question: {
          q: "What type of extinguisher is kept at the fryer station, and what is it for?",
          options: [
            "A general ABE extinguisher, for any fire",
            "A Class F wet chemical extinguisher, specifically for cooking oil/fat fires",
            "A water extinguisher, for any kitchen fire",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## First aid\nThe first aid kit is in the kitchen office. The Head Chef and Venue Manager are both nominated first aiders and hold current First Aid certificates. For anything beyond a minor cut or burn, get a nominated first aider immediately.",
        question: {
          q: "Who are the nominated first aiders at Two Fires?",
          options: ["Whoever is rostered that day", "The Head Chef and Venue Manager", "Only Elena"],
          correct: 1,
        },
      },
      {
        content:
          "**Callout: For anything serious — a bad burn, an allergic reaction, a fire beyond the extinguisher, or any injury you're unsure about — call 000 and get your supervisor immediately. Don't delay to fill out an incident report first; that happens after the situation is safe.**",
        question: {
          q: "If something serious happens, what comes first — calling for help or filling out the incident report?",
          options: ["The incident report, so nothing is forgotten", "Calling for help / your supervisor first, paperwork after", "Whichever is faster in the moment"],
          correct: 1,
        },
      },
    ],
  },
];

// module -> pending_approval instead of live, to exercise the owner
// approval-gate UI live during O5 QA (rather than seeding everything
// pre-approved).
const PENDING_APPROVAL_MODULE = "Beer Line & Cellar Hygiene";

async function main() {
  const { data: existingVenue } = await admin.from("venues").select("id").eq("slug", SLUG).maybeSingle();
  if (existingVenue) {
    await admin.from("venues").delete().eq("id", existingVenue.id);
    const { data: authList } = await admin.auth.admin.listUsers();
    const u = authList.users.find((x) => x.email === OWNER_EMAIL);
    if (u) await admin.auth.admin.deleteUser(u.id);
    console.log("Removed previous two-fires venue");
  }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
  });
  if (authErr) throw authErr;

  const { data: bootstrapData, error: bootstrapErr } = await admin.rpc("bootstrap_owner", {
    p_auth_id: authData.user.id,
    p_venue_name: "Two Fires",
    p_venue_slug: SLUG,
    p_owner_name: OWNER_NAME,
    p_owner_email: OWNER_EMAIL,
  });
  if (bootstrapErr) throw bootstrapErr;
  const venueId = bootstrapData.venue_id;
  console.log("Created venue", SLUG, venueId);

  // Roles: only Venue Manager (FOH) + Head Chef (BOH), per Decision Log
  // scope boundary ("only these three + owner", reusing venue #1's naming).
  const roleDefs = [
    { name: "Venue Manager", department: "FOH" },
    { name: "Head Chef", department: "BOH" },
  ];
  const roles = {};
  for (const r of roleDefs) {
    const { data, error } = await admin.from("staff_roles").insert({ venue_id: venueId, ...r }).select("id").single();
    if (error) throw error;
    roles[r.name] = data.id;
  }
  console.log("Seeded roles:", Object.keys(roles).join(", "));

  // Accounts: owner already created via bootstrap_owner above. Two staff
  // accounts, PIN-based per Tech Bible §6.
  //
  // Found live during Block O QA (O5): app_users.role = 'manager' exists in
  // the schema for RLS write-elevation (Tech Bible §15b), but the
  // `venue_roster` RPC that powers the staff PIN-login picker filters
  // `role = 'staff'` only, and there is no separate manager login route.
  // A 'manager'-role account is therefore invisible to every login path in
  // the current build -- a real gap, not a seeding mistake. Seeding
  // 'staff' here matches what the shipped product can actually do today;
  // see the Block O final report for the flagged gap.
  const vmPinHash = await bcrypt.hash(VENUE_MANAGER_PIN, 10);
  const { data: vmUser, error: vmErr } = await admin
    .from("app_users")
    .insert({
      venue_id: venueId,
      role: "staff",
      name: VENUE_MANAGER_NAME,
      staff_role_id: roles["Venue Manager"],
      pin_hash: vmPinHash,
    })
    .select("id")
    .single();
  if (vmErr) throw vmErr;

  const chefPinHash = await bcrypt.hash(HEAD_CHEF_PIN, 10);
  const { data: chefUser, error: chefErr } = await admin
    .from("app_users")
    .insert({
      venue_id: venueId,
      role: "staff",
      name: HEAD_CHEF_NAME,
      staff_role_id: roles["Head Chef"],
      pin_hash: chefPinHash,
    })
    .select("id")
    .single();
  if (chefErr) throw chefErr;
  console.log("Seeded accounts: owner, Venue Manager, Head Chef");

  // Certificate types + role mapping, mirroring venue #1's pattern
  // (Tech Bible §15c): Food Handling -> BOH, RSA -> FOH, First Aid -> both
  // (both are the senior/only roles here). No WWCC -- no programs involving
  // minors.
  const certDefs = ["Food Handling", "RSA", "First Aid"];
  const certTypeIds = {};
  for (const name of certDefs) {
    const { data, error } = await admin.from("certificate_types").insert({ venue_id: venueId, name }).select("id").single();
    if (error) throw error;
    certTypeIds[name] = data.id;
  }
  const certRoleMap = [
    ["Food Handling", "Head Chef"],
    ["RSA", "Venue Manager"],
    ["First Aid", "Head Chef"],
    ["First Aid", "Venue Manager"],
  ];
  for (const [certName, roleName] of certRoleMap) {
    const { error } = await admin
      .from("certificate_type_roles")
      .insert({ certificate_type_id: certTypeIds[certName], role_id: roles[roleName] });
    if (error) throw error;
  }
  console.log("Seeded certificate types + role mapping");

  // Modules + sections + check questions
  const moduleIds = {};
  for (const mod of modules) {
    const status = mod.title === PENDING_APPROVAL_MODULE ? "pending_approval" : "live";
    const { data: m, error: mErr } = await admin
      .from("modules")
      .insert({ venue_id: venueId, title: mod.title, status })
      .select("id")
      .single();
    if (mErr) throw mErr;
    moduleIds[mod.title] = m.id;

    for (const roleName of mod.roles) {
      const { error } = await admin.from("module_roles").insert({ module_id: m.id, role_id: roles[roleName] });
      if (error) throw error;
    }

    let order = 1;
    for (const section of mod.sections) {
      const { error: sErr } = await admin.from("module_sections").insert({
        module_id: m.id,
        section_order: order,
        content: section.content,
      });
      if (sErr) throw sErr;
      if (!section.noQuestion && section.question) {
        const { error: qErr } = await admin.from("check_questions").insert({
          module_id: m.id,
          question: section.question.q,
          options: section.question.options,
          correct_option_index: section.question.correct,
        });
        if (qErr) throw qErr;
      }
      order += 1;
    }
  }
  console.log(`Seeded ${modules.length} modules (1 pending_approval: "${PENDING_APPROVAL_MODULE}", rest live)`);

  // Stations, derived from equipment/layout (O1), with QR anchors linking
  // to the most relevant module.
  const stationDefs = [
    { name: "Fryer Station", module: "Deep Fryer Safety & Oil Management" },
    { name: "Pizza Station", module: "Pizza Oven & Grill Safety" },
    { name: "Bar", module: "Bar Service & RSA Compliance" },
    { name: "Cellar", module: "Beer Line & Cellar Hygiene" },
    { name: "Wash-up", module: "Kitchen Cleaning & Sanitation" },
  ];
  for (const s of stationDefs) {
    const slug = `${SLUG}-${s.name.toLowerCase().replace(/\s+/g, "-")}`;
    const { error } = await admin.from("stations").insert({
      venue_id: venueId,
      name: s.name,
      qr_code_slug: slug,
      primary_module_id: moduleIds[s.module],
    });
    if (error) throw error;
  }
  console.log(`Seeded ${stationDefs.length} stations`);

  console.log("\nDone. Two Fires demo venue ready:");
  console.log(`  Venue slug: ${SLUG}`);
  console.log(`  Owner login: http://localhost:3000/${SLUG}/owner/login`);
  console.log(`  Owner email/password: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  console.log(`  Staff login: http://localhost:3000/${SLUG}/login`);
  console.log(`  Venue Manager (Aisha Farouk) PIN: ${VENUE_MANAGER_PIN}`);
  console.log(`  Head Chef (Tomas Reyes) PIN: ${HEAD_CHEF_PIN}`);
  console.log(`\n  Live module IDs for ingestion:`);
  for (const [title, id] of Object.entries(moduleIds)) {
    if (title !== PENDING_APPROVAL_MODULE) console.log(`    ${id}  ${title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
