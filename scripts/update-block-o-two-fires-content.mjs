import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

// Rewrites Two Fires' module content in place (same module IDs, so
// module_roles/stations/certs links are untouched). Fixes, all found live
// during Block O roleplay QA (2026-09-04):
//   - em-dashes removed from every sentence (a real, if minor, "reads as
//     AI-written" tell -- rewritten as plain punctuation instead)
//   - "**Callout: ...**" -> "[CALLOUT] ..." (no literal asterisks; paired
//     with ModuleContentBlock.tsx, which now renders headings/callouts as
//     real elements instead of raw text)
//   - every check-question now carries section_order, so it displays right
//     after the section it tests (ModuleRunner.tsx no longer dumps every
//     question into one block at the end)
//   - every check-question now has real corrective text (expected_answer_
//     context was never populated originally -- wrong answers showed a
//     blank "Not quite -- here's the actual step:" with nothing after it)

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const VENUE_ID = "b379e33f-b0d8-47bf-810e-450635b29b6b";

const modules = [
  {
    title: "Welcome & How We Work",
    sections: [
      {
        content:
          "## Welcome to Two Fires\nHi, I'm Elena, and this place is mine. Two Fires is a 50 seat neighbourhood bar built around two things that are always hot: the fryer and the pizza oven, plus a drinks list the whole team is proud to stand behind. I didn't open this place to run a normal bar. I opened it because I wanted a spot where the fries are as good as the cocktails, and where staff actually know what they're doing instead of guessing their way through a shift.\nWhoever you are and whatever you're here to do, the standard is the same: good food and drinks, served safely, by people who take it seriously without taking themselves too seriously. Welcome aboard.",
        noQuestion: true,
      },
      {
        content:
          "## How this venue communicates\nThe kitchen runs through the Head Chef. The floor and bar run through the Venue Manager. Both report to me. Shifts and rosters go up on the board in the office; changes go through your supervisor, not a swap arranged privately between staff. If you're going to be late, contact your supervisor at least 30 minutes before your shift start time. Raise a problem with your supervisor as soon as you notice it. Raise an idea any time, it doesn't need to wait for a problem.",
        question: {
          q: "If you know you're going to be late for a shift, what should you do?",
          options: [
            "Wait until you arrive to explain",
            "Contact your supervisor at least 30 minutes before your shift start time",
            "Message a co-worker to cover for you without telling a supervisor",
          ],
          correct: 1,
          corrective: "Contact your supervisor at least 30 minutes before your shift starts, not after you arrive.",
        },
      },
      {
        content:
          "## Presentation and basics\nUniform is black on the floor and at the bar, chef whites in the kitchen. Personal hygiene basics are covered in full in the Food Safety & Hygiene module. Phone use: no phones on the floor, at the bar, or on the pass during work hours, unless it's genuinely work related, like checking a recipe reference or calling a supervisor. Phones out in front of customers or over a hot fryer are both a bad look and a real safety risk.",
        question: {
          q: "When is it acceptable to use your phone during a shift?",
          options: [
            "Anytime it's quiet",
            "Only genuinely work-related uses, like calling a supervisor",
            "Only during your break, and never otherwise",
          ],
          correct: 1,
          corrective: "Phones are only for genuinely work-related uses on shift, like calling a supervisor, not general downtime use.",
        },
      },
      {
        content:
          "## How training works here\nModules are worked through on the venue iPad at your own pace, over as many sessions as you need. Each module ends with a short comprehension check, not a formal exam, just a way to catch anything that didn't land. Certificates (Food Handling, RSA, First Aid) get uploaded as part of the relevant module. Once you've finished onboarding, Ask Larder is always available. It only knows what's actually true for this kitchen and this bar, not general internet advice.",
        question: {
          q: "If you forget how to do something a few weeks from now, what should you try first?",
          options: [
            "Guess and hope for the best",
            "Ask Larder, it only knows what's actually true for this venue",
            "Wait until your next shift with your supervisor to ask in person",
          ],
          correct: 1,
          corrective: "Ask Larder is available any time and is grounded in this venue's own procedures, so it's the right first stop.",
        },
      },
    ],
  },
  {
    title: "Food Safety & Hygiene",
    sections: [
      {
        content:
          "## Handwashing\nWash hands before starting work and after any break, after using the toilet, after touching raw meat or seafood, after touching your face or phone, after handling rubbish, and before putting on or after taking off gloves. Wet hands, lather with soap for at least 20 seconds covering palms, backs of hands, between fingers and under nails, rinse, then dry with a single use paper towel. Use that towel to turn off the tap if it isn't sensor operated.",
        question: {
          q: "Why use a paper towel to turn off the tap instead of a freshly washed hand?",
          options: ["It's faster", "Touching the tap handle with a clean hand can re-contaminate it", "It saves water"],
          correct: 1,
          corrective: "The tap handle was touched with dirty hands before washing, so touching it again with a clean hand undoes the wash.",
        },
      },
      {
        content:
          "## Temperature control\nUnder the Food Standards Code, potentially hazardous food must be kept at 5°C or colder, or 60°C or hotter. Between those two points is the danger zone, where bacteria multiply fastest. If food needs to cool down, it must go from 60°C to 21°C within 2 hours, then from 21°C to 5°C within a further 4 hours. Walk-in and fridge temperatures get logged at every kitchen open and close (see Kitchen Opening & Closing Procedure).",
        question: {
          q: "Under the Food Standards Code, what's the safe holding temperature for potentially hazardous food?",
          options: ["5°C or colder, or 60°C or hotter", "Anywhere between 10°C and 50°C", "Room temperature is fine if served within an hour"],
          correct: 0,
          corrective: "Safe holding is 5°C or colder, or 60°C or hotter. Everything in between is the danger zone.",
        },
      },
      {
        content:
          "## Food Safety Supervisor at Two Fires\nUnder Standard 3.2.2A, a business that handles high risk food, like Two Fires' fried food and dairy based menu, must have a certified Food Safety Supervisor on site. The Head Chef holds this certification, renewed every 5 years. Every food handler, not just the Head Chef, must complete food safety training covering safe handling, contamination, cleaning and sanitising, and personal hygiene before working with high risk food.",
        question: {
          q: "How often does a Food Safety Supervisor certification need to be renewed?",
          options: ["Every year", "Every 5 years", "It never expires once completed"],
          correct: 1,
          corrective: "Food Safety Supervisor certification is renewed every 5 years under Standard 3.2.2A.",
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
          "## Australia's declarable allergens\nUnder the Food Standards Code, these must be declared whenever they're an ingredient, with no exception for \"only a small amount\": cereals containing gluten (wheat, rye, barley, oats, spelt), crustacean, egg, fish, milk, tree nuts, peanuts, sesame, soybeans, lupin, and added sulphites (over 10mg/kg). Since Feb 2026, allergen statements use the mandatory Plain English terms, in bold, in a separate allergen summary as well as the ingredient list.",
        question: {
          q: "Which of these is one of Australia's declarable allergens under the Food Standards Code?",
          options: ["Sesame", "Basil", "Onion"],
          correct: 0,
          corrective: "Sesame is one of the eleven declarable allergens. Basil and onion are not on the list.",
        },
      },
      {
        content:
          "## Two Fires' specific cross-contact risk\nFried Chicken, Salt & Pepper Squid, Chips, Fried Pickles, and Panko Prawns all go through the same fryer oil. That means a customer avoiding gluten or crustacean can still be exposed through shared oil, even if the dish they ordered doesn't list that allergen on its own. Pizza dough contains gluten and touches shared prep surfaces and the same pizza peel used for other bases.",
        question: {
          q: "Why is Two Fires' fryer a genuine allergen risk even for a dish with a gluten-free batter?",
          options: [
            "Fryers run hotter than other equipment",
            "Oil shared with other fried items (like crumbed or battered food) can transfer allergens into an otherwise safe dish",
            "Fryers are harder to clean",
          ],
          correct: 1,
          corrective: "Shared fryer oil carries allergen traces between items, regardless of what a specific dish's own batter contains.",
        },
      },
      {
        content:
          "## Handling an allergy order\n1. FOH flags the allergy clearly on the order, never relies on memory.\n2. Kitchen confirms back verbally or on the docket before starting.\n3. If the item normally goes through the shared fryer, the kitchen tells FOH honestly whether it can be made safely. It often can't, and that's the correct answer to give the customer rather than guessing.\n4. Whoever plates it does a final check against the ticket before it leaves the pass.",
        question: {
          q: "If a customer wants a fried item without an allergen that's in the shared fryer oil, what's the right response?",
          options: [
            "Make it anyway and hope the trace amount doesn't matter",
            "Tell the customer honestly it can't be made safely through the shared fryer",
            "Serve it without mentioning the shared oil",
          ],
          correct: 1,
          corrective: "Be honest that a shared-fryer item can't be made allergen-safe. Guessing or staying silent both put the customer at risk.",
        },
      },
      {
        content:
          "## If something goes wrong\n[CALLOUT] If an allergen order goes out incorrectly, or a customer shows signs of a reaction (swelling, difficulty breathing, hives), get your supervisor immediately. Speed matters more than paperwork in the moment.",
        question: {
          q: "If a customer shows signs of an allergic reaction, what's the first thing you do?",
          options: ["Wait and see if it passes", "Get your supervisor immediately", "Finish serving your other tables first"],
          correct: 1,
          corrective: "Get your supervisor immediately. A reaction can escalate fast, so speed matters more than finishing other tasks.",
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
          "## Opening checks\n1. Check and log the walk-in and fridge temperatures. Must read 5°C or colder.\n2. Glance over stock rotation, oldest dated items at the front.\n3. Check the dry store for anything out of date or damaged.\n4. Turn on the fryers and pizza oven early enough to reach temperature before service.",
        question: {
          q: "What temperature must the walk-in and fridges read at opening check?",
          options: ["5°C or colder", "10°C or colder", "Room temperature is fine if it's morning"],
          correct: 0,
          corrective: "The walk-in and fridges must read 5°C or colder at every opening check, no exceptions for time of day.",
        },
      },
      {
        content:
          "## Pre-service setup\nCheck fryer oil level (topped up to the fill line, not overfilled) and oil quality (not dark or smoking) before service starts. Confirm the pizza oven has reached working temperature. Set up the prep bench, including the induction cooktop and vacuum sealer if they're needed for that day's prep.",
        question: {
          q: "What should you check about the fryer oil before service, beyond just turning the fryer on?",
          options: ["Nothing, turning it on is enough", "Oil level and oil quality (not dark or smoking)", "Only the oil's brand"],
          correct: 1,
          corrective: "Check both oil level (to the fill line) and oil quality (not dark or smoking), not just that the fryer is switched on.",
        },
      },
      {
        content:
          "## Closing shutdown\n1. Turn off both fryers, skim crumbs, let oil cool before covering.\n2. Turn off the pizza oven and griddle. Do not start cleaning either while still hot (see Pizza Oven & Grill Safety).\n3. Wipe down all cooking surfaces once cool.\n4. Seal the walk-in door properly and log the closing temperature.",
        question: {
          q: "Why do you wait before cleaning the pizza oven or griddle at close?",
          options: ["To save water", "Cleaning a hot surface risks a burn", "There's no reason, it's just habit"],
          correct: 1,
          corrective: "A hot deck oven or griddle surface can burn you. Wait until it's cooled before cleaning it.",
        },
      },
      {
        content:
          "[CALLOUT] Report any equipment fault (fryer, pizza oven, walk-in, extraction) to the Venue Manager and Elena the same night. Don't wait for the next shift to mention it. Hand over any stock or cash-adjacent notes to the Venue Manager before you leave.",
        question: {
          q: "If you notice a fryer or walk-in fault at close, when should you report it?",
          options: [
            "Next time someone asks",
            "The same night, to the Venue Manager and Elena",
            "Only if it happens again",
          ],
          correct: 1,
          corrective: "Report an equipment fault the same night, to both the Venue Manager and Elena, not on a delay.",
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
          "## Oil temperature and fire risk\nFrying oil runs around 180°C. Never leave a fryer unattended while it's at frying temperature. Overheated oil can ignite on its own well before it visibly smokes heavily. Keep oil below the fryer's marked maximum fill line; overfilling causes boil-over when food is added.",
        question: {
          q: "Why should a fryer never be left unattended at frying temperature?",
          options: ["It wastes gas or electricity", "Overheated oil can ignite on its own", "It makes the food taste worse"],
          correct: 1,
          corrective: "Overheated oil can self-ignite well before it looks like it's smoking heavily, which is why a fryer is never left unattended.",
        },
      },
      {
        content:
          "[CALLOUT] Cooking oil and fat fires are Class F fires. Only use the wet chemical (Class F) extinguisher kept at the fryer station, never water. Water hitting oil above 200°C flash-boils into steam and atomises the burning oil into a fireball. If a fryer fire is beyond what the extinguisher can handle in seconds, get everyone clear and call 000. Don't keep trying.",
        question: {
          q: "What must never be used on a fryer oil fire?",
          options: ["A wet chemical extinguisher", "Water", "A fire blanket over the fryer"],
          correct: 1,
          corrective: "Never use water on a hot-oil fire. It flash-boils and turns the fire into a fireball. Only the Class F wet chemical extinguisher is safe.",
        },
      },
      {
        content:
          "## Oil filtering and changeover\nSkim the oil daily during close-down. Filter or change the oil on the schedule set by the Head Chef based on how dark it is or how it smells; don't wait for it to smoke. Dispose of used oil into the designated waste-oil container for collection. Never pour it down a drain.",
        question: {
          q: "How should used fryer oil be disposed of?",
          options: ["Down the kitchen drain", "Into the designated waste-oil container", "In the general rubbish bin"],
          correct: 1,
          corrective: "Used oil always goes into the designated waste-oil container, never down a drain or into general rubbish.",
        },
      },
      {
        content:
          "## Allergen cross-contact reminder\nAll fried items at Two Fires share the same oil. See the Allergen Handling module for how this affects allergy orders. This isn't a fryer-cleanliness issue, it's a shared-ingredient issue that no amount of skimming fixes.",
        question: {
          q: "Does skimming and cleaning the fryer oil remove the allergen cross-contact risk?",
          options: ["Yes, if it's cleaned well", "No, shared oil is a shared-ingredient issue, not a cleanliness one", "Only if it's filtered twice"],
          correct: 1,
          corrective: "Cleaning doesn't fix it. Shared oil is a shared-ingredient problem, and only using separate oil would remove the risk.",
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
          "## Surface temperatures\nThe pizza deck oven and the flat top griddle run far hotter than a home oven. The cooking deck, oven interior, and any surface near the open front can cause a severe burn from even brief contact.",
        question: {
          q: "How do pizza deck oven surfaces compare to a home oven?",
          options: ["About the same temperature", "Much hotter, brief contact can cause a severe burn", "Cooler, since it's gas-fired"],
          correct: 1,
          corrective: "Deck oven surfaces run much hotter than a home oven. Even brief contact can cause a serious burn.",
        },
      },
      {
        content:
          "[CALLOUT] Only use dry peels and oven cloths near the pizza oven or griddle. A damp cloth on a hot surface flashes to steam and can burn you. Never touch the deck, the oven interior, or the griddle surface while hot.",
        question: {
          q: "Why should oven cloths and peels always be dry near the pizza oven?",
          options: [
            "Damp cloths wear out faster",
            "A damp cloth on a hot surface flashes to steam and can burn you",
            "Dry cloths are easier to hold",
          ],
          correct: 1,
          corrective: "A damp cloth on a hot surface flashes to steam instantly, which can burn you. Peels and oven cloths stay dry, always.",
        },
      },
      {
        content:
          "## Gas and extraction\nDon't attempt any gas connection check or repair yourself; that's a licensed technician's job. The extraction hood and fire suppression system above the fryers, griddle, and pizza oven must stay completely unobstructed. Never hang cloths, tools, or anything else from it or near its sensors.",
        question: {
          q: "What should you do if you think there's a gas issue with the pizza oven?",
          options: ["Check the connection yourself", "Leave it to a licensed technician", "Ignore it if the oven still lights"],
          correct: 1,
          corrective: "Gas issues always go to a licensed technician. Don't check or attempt a repair yourself, even if the oven still lights.",
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
          corrective: "Wait until the pizza oven's exterior has cooled before cleaning it, every shift, not once a week.",
        },
      },
      {
        content:
          "## Weekly deep clean rota\nDeep-clean tasks are spread across the week rather than all done on one day: extraction hood filters one day, walk-in shelving another, dry store organisation another. This means no single shift carries the whole workload, and nothing gets skipped because \"we'll get to it eventually.\"",
        question: {
          q: "Why are deep-clean tasks spread across different days instead of done all at once?",
          options: [
            "To save on cleaning product costs",
            "So no single shift carries the whole workload and nothing gets skipped",
            "Because it's required by law",
          ],
          correct: 1,
          corrective: "Spreading tasks across the week means no single shift is overloaded, and nothing gets quietly skipped.",
        },
      },
      {
        content:
          "## Stock hygiene in the walk-in\nEvery container in the walk-in must be labelled with contents and date. An unlabelled container isn't just untidy, it's the single most common cause of a stock or allergen mix-up, and gets thrown out if it can't be identified.",
        question: {
          q: "Why is an unlabelled container in the walk-in treated as a real problem?",
          options: [
            "It only matters during a health inspection",
            "It's the most common cause of a stock or allergen mix-up",
            "It slows down the stocktake",
          ],
          correct: 1,
          corrective: "Unlabelled containers are the most common cause of a real stock or allergen mix-up, not just an inspection issue.",
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
          "## Opening the venue\nUnlock the front entrance, disarm the alarm, and count the starting float into the till against the previous night's closing count. Turn on POS terminals and check overnight deliveries against the dry store and cellar.",
        question: {
          q: "What should the opening float count be checked against?",
          options: ["Nothing, just count it in", "The previous night's closing count", "An estimate from memory"],
          correct: 1,
          corrective: "The opening float is checked against the previous night's closing count, not counted in on its own or estimated.",
        },
      },
      {
        content:
          "[CALLOUT] Alarm codes, keys, and the safe combination are Venue Manager and Owner information only. Ask Larder will never answer a question about these. If a staff member asks, the answer is always to check with the Venue Manager or Elena directly.",
        noQuestion: true,
      },
      {
        content:
          "## Closing the venue\n1. Reconcile the float and takings against the POS end-of-day report.\n2. Deposit cash into the safe.\n3. Confirm the kitchen's closing checklist is complete before the Head Chef leaves.\n4. Set the alarm and lock up. The Venue Manager (or a nominated senior staff member) is always the last to leave.",
        question: {
          q: "Who is responsible for confirming the kitchen's closing checklist is complete before lock-up?",
          options: ["Whoever is rostered on cleaning", "The Venue Manager", "It isn't checked at close"],
          correct: 1,
          corrective: "The Venue Manager confirms the kitchen's closing checklist is complete before anyone locks up.",
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
          "## RSA certificate requirement\nAnyone selling, supplying, or serving alcohol at Two Fires must hold a current Responsible Service of Alcohol (RSA) certificate from a Liquor Control Victoria approved training provider. New starters have 28 days from their first shift to complete it. The certificate is valid for 3 years in Victoria.",
        question: {
          q: "In Victoria, how long is an RSA certificate valid for?",
          options: ["1 year", "3 years", "It never expires"],
          correct: 1,
          corrective: "An RSA certificate in Victoria is valid for 3 years before it needs renewing.",
        },
      },
      {
        content:
          "## Refusing service\nA patron is intoxicated if their speech, balance, coordination, or behaviour is noticeably affected by alcohol. Once someone is intoxicated, they must not be served any more alcohol, but they can remain on the premises unless they become drunk or disorderly, in which case they must be removed.",
        question: {
          q: "Once a patron is assessed as intoxicated, what's the correct action?",
          options: [
            "Serve one more drink to wind them down gently",
            "Stop serving them alcohol, they can stay unless disorderly",
            "Ask them to leave immediately regardless of behaviour",
          ],
          correct: 1,
          corrective: "Stop serving them, full stop. They can stay unless they become drunk or disorderly, but no more alcohol either way.",
        },
      },
      {
        content:
          "[CALLOUT] Never serve or supply alcohol to anyone under 18, and always ID-check if there's any doubt. Under the Liquor Control Reform Act 1998 (Vic), the licensee faces a penalty of 120 penalty units and the staff member who served them faces 20 penalty units. This is a real legal exposure, not just a house rule.",
        question: {
          q: "Under Victorian law, what happens if a staff member serves alcohol to someone under 18?",
          options: [
            "Nothing, as long as it wasn't intentional",
            "The staff member personally faces a real legal penalty, separate from the licensee's",
            "Only the licensee is ever penalised",
          ],
          correct: 1,
          corrective: "Both the licensee and the staff member who served a minor face real, separate legal penalties under Victorian law.",
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
          "## Float and till procedure\nCount the float in at the start of shift and out at the end, against the recorded starting amount. Report any discrepancy to Elena the same day, however small. This isn't about blame, it's about catching a till error or a real issue early.",
        question: {
          q: "What should you do if the till count doesn't match at the end of a shift?",
          options: ["Ignore it if it's a small amount", "Report it to Elena the same day", "Fix the number in the system yourself"],
          correct: 1,
          corrective: "Any discrepancy, even a small one, gets reported to Elena the same day. It's about catching issues early, not blame.",
        },
      },
      {
        content:
          "## End-of-day reconciliation\nRun the POS end-of-day report and reconcile cash and card totals against it. Any discrepancy beyond normal rounding gets flagged in the handover notes and followed up before the next trading day.",
        question: {
          q: "What's reconciled against the POS end-of-day report?",
          options: ["Cash and card totals", "Only cash", "Nothing, the report is just filed"],
          correct: 0,
          corrective: "Both cash and card totals are reconciled against the POS end-of-day report, not cash alone.",
        },
      },
      {
        content:
          "[CALLOUT] The safe combination is Venue Manager and Owner information only. Ask Larder will never provide it. If you need cash from the safe and aren't authorised, ask the Venue Manager directly.",
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
          "## Why lines need cleaning\nBeer is a food product. Without regular cleaning, biofilm, yeast, mould, and beer stone build up inside the lines, affecting both the flavour and the safety of what's poured.",
        question: {
          q: "Why do beer lines need regular cleaning, even though beer looks clean pouring out?",
          options: [
            "It doesn't matter, it's just for taste",
            "Biofilm, yeast, mould and beer stone build up inside the lines over time",
            "Only the kegs need attention, not the lines",
          ],
          correct: 1,
          corrective: "Biofilm, yeast, mould and beer stone build up inside the lines over time, invisible from the outside, and affect safety as well as taste.",
        },
      },
      {
        content:
          "## Cleaning schedule at Two Fires\nAll 8 tap lines get a full clean with food-grade line-cleaning chemical every fortnight, matching Australian industry standard. Tap nozzles get a daily rinse as part of close-down.",
        question: {
          q: "How often does Two Fires do a full beer line clean?",
          options: ["Once a year", "Every fortnight", "Only when the beer tastes off"],
          correct: 1,
          corrective: "A full line clean happens every fortnight on schedule, not just when something tastes wrong.",
        },
      },
      {
        content:
          "[CALLOUT] The cellar holds CO2 for the beer system, which can displace breathable air in a small enclosed space. Ventilate before extended time in the cellar, and never attempt to repair a gas line or coupler yourself. Call a technician.",
        question: {
          q: "Why does the cellar need ventilating before spending extended time in it?",
          options: [
            "It gets too warm otherwise",
            "CO2 from the beer system can displace breathable air in a small space",
            "It's a house cleanliness rule, not a safety one",
          ],
          correct: 1,
          corrective: "CO2 can build up and displace breathable air in a small, enclosed cellar, which is a real safety risk, not just a house rule.",
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
          "## Lifting\nWhen lifting kegs, stock deliveries, or anything heavy: bend at the knees not the back, keep the load close to your body, and get help or use a trolley for anything awkward or over a comfortable one-person weight. Never twist while carrying a load.",
        question: {
          q: "What's the correct way to lift something heavy, like a keg or a stock delivery?",
          options: ["Bend at the back to keep your knees fresh", "Bend at the knees, keep the load close, get help if needed", "Twist quickly to build momentum"],
          correct: 1,
          corrective: "Bend at the knees, keep the load close, and get help for anything awkward or heavy. Twisting under load is how backs get hurt.",
        },
      },
      {
        content:
          "## PPE by task\nCut-resistant glove for kitchen prep work involving knives on repetitive cuts. Dry oven cloths only near the fryer, griddle, and pizza oven, never damp. Non-slip shoes for everyone, kitchen and floor, given the fryer and dishwashing areas both create wet or greasy floor patches.",
        question: {
          q: "Why is non-slip footwear required for both kitchen and floor staff at Two Fires?",
          options: [
            "It's just a uniform choice",
            "The fryer and dishwashing areas both create wet or greasy floor patches",
            "It's only needed in the kitchen",
          ],
          correct: 1,
          corrective: "Both the fryer area and dishwashing create wet or greasy patches, so non-slip footwear matters kitchen-wide and on the floor.",
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
          "[CALLOUT] The Class F wet chemical extinguisher at the fryer station is for cooking oil and fat fires only, never water. General ABE extinguishers are located at the bar and near the front entrance. If in doubt, get everyone clear and call 000 rather than trying to fight a fire beyond what one extinguisher handles quickly.",
        question: {
          q: "What type of extinguisher is kept at the fryer station, and what is it for?",
          options: [
            "A general ABE extinguisher, for any fire",
            "A Class F wet chemical extinguisher, specifically for cooking oil/fat fires",
            "A water extinguisher, for any kitchen fire",
          ],
          correct: 1,
          corrective: "The fryer station holds a Class F wet chemical extinguisher, specifically for cooking oil and fat fires.",
        },
      },
      {
        content:
          "## First aid\nThe first aid kit is in the kitchen office. The Head Chef and Venue Manager are both nominated first aiders and hold current First Aid certificates. For anything beyond a minor cut or burn, get a nominated first aider immediately.",
        question: {
          q: "Who are the nominated first aiders at Two Fires?",
          options: ["Whoever is rostered that day", "The Head Chef and Venue Manager", "Only Elena"],
          correct: 1,
          corrective: "The Head Chef and Venue Manager are the nominated first aiders, not whoever happens to be rostered.",
        },
      },
      {
        content:
          "[CALLOUT] For anything serious, a bad burn, an allergic reaction, a fire beyond the extinguisher, or any injury you're unsure about, call 000 and get your supervisor immediately. Don't delay to fill out an incident report first. That happens after the situation is safe.",
        question: {
          q: "If something serious happens, what comes first, calling for help or filling out the incident report?",
          options: ["The incident report, so nothing is forgotten", "Calling for help / your supervisor first, paperwork after", "Whichever is faster in the moment"],
          correct: 1,
          corrective: "Call for help and get your supervisor first. The incident report always comes after the situation is safe.",
        },
      },
    ],
  },
];

const PENDING_APPROVAL_MODULE = null; // all Two Fires modules are already live from Block O

async function main() {
  for (const mod of modules) {
    const { data: existing, error: findErr } = await admin
      .from("modules")
      .select("id")
      .eq("venue_id", VENUE_ID)
      .eq("title", mod.title)
      .single();
    if (findErr || !existing) throw new Error(`Module not found: ${mod.title} (${findErr?.message})`);
    const moduleId = existing.id;

    // Delete old sections/questions for this module, then reinsert.
    await admin.from("check_questions").delete().eq("module_id", moduleId);
    await admin.from("module_sections").delete().eq("module_id", moduleId);

    let order = 1;
    for (const section of mod.sections) {
      const { error: sErr } = await admin.from("module_sections").insert({
        module_id: moduleId,
        section_order: order,
        content: section.content,
      });
      if (sErr) throw sErr;
      if (!section.noQuestion && section.question) {
        const { error: qErr } = await admin.from("check_questions").insert({
          module_id: moduleId,
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
    console.log(`Rewrote content for "${mod.title}" (${mod.sections.length} sections)`);
  }
  console.log("\nDone. Re-run scripts/ingest-module.ts for every module id to refresh Ask Larder's knowledge base.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
