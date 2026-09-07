import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Block P cafe validation pass, new venue. The Batch House, an unlicensed
// Melbourne cafe (Seddon VIC, Charles Street). Genuinely different shape
// from every prior Block P venue: no liquor licence, no RSA content, no
// crowd control, food safety (not licensing) is the dominant compliance
// area, and one real unresolved contradiction in the source content
// (occupancy figure) that the module deliberately declines to assert.
// Content transcribed verbatim (structure, wording, and check-question
// wording preserved, including each section's own "Section N:" heading)
// from docs/block-p-cafe/p4-modules/*.md (01 through 10; 00-module-index.md
// excluded, internal authoring note only). Idempotent: re-running removes
// any previous "block-p-cafe-batch-house" venue first.

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SLUG = "block-p-cafe-batch-house";
const OWNER_EMAIL = "batch-house-owner@example.com";
const OWNER_PASSWORD = "BatchHouseOwner2026!";
const OWNER_NAME = "Renata Alves";

// Authorized-tier persona: Senior Barista, scoped into the one restricted
// module (Safe access procedures, "Applies to: Owner/Manager, Cook, Senior
// Barista") per that module's own "Applies to" line and Cash handling and
// closing procedures §5 ("The safe code is known only to Renata, Priya, and
// Jack"). Seeded with role='staff' (not 'manager') -- see note below
// (KNOWN PLATFORM BEHAVIOR, not a bug).
const SENIOR_BARISTA_NAME = "Jack Doran";
const SENIOR_BARISTA_PIN = "5104";

// Frontline persona: Barista/FOH, not scoped into the restricted module.
// Default fallback_tier ('frontline') applies.
const BARISTA_NAME = "Mia Fenwick";
const BARISTA_PIN = "3287";

// ---------------------------------------------------------------------------
// Module content, transcribed from docs/block-p-cafe/p4-modules/*.md. Each
// section's body (heading + paragraphs + photo-block/safety-critical
// callouts) becomes one module_sections row; each "Check question" becomes
// one check_questions row. Sections marked "no check question" in the
// source get noQuestion: true. `roles: []` means the source module's
// "Applies to" line covers all 5 roles at this venue, so no module_roles
// row is inserted (shared / visible to everyone, matching the established
// convention from prior Block P seed scripts).
// ---------------------------------------------------------------------------

const ALL_ROLES = ["Owner/Manager", "Cook", "Senior Barista", "Barista/FOH", "Kitchen Hand/FOH Casual"];

const modules = [
  {
    title: "Welcome and how we work",
    roles: [], // Applies to: Owner/Manager, Cook, Senior Barista, Barista/FOH, Kitchen Hand/FOH Casual
    sections: [
      {
        content:
          "## Section 1: About The Batch House\nThe Batch House is a cafe on Charles Street in Seddon, in Melbourne's inner west. We're open Tuesday to Sunday, 7am to 3pm, and closed every Monday. We run on specialty coffee, using a house blend from a Brunswick roaster, alongside a genuine kitchen menu: eggs done a few ways, toasties, a rotating lunch specials board, house made banana bread and granola, and salads.\n\n**Photo block:** the Charles Street shopfront, with tables out front on the footpath.",
        noQuestion: true,
      },
      {
        content:
          "## Section 2: Our team\nRenata Alves owns and manages The Batch House, and she's on the floor most shifts, covering the till and general oversight. Priya Chandran is our cook. She built the menu, works five days a week, and holds our current Food Safety Supervisor certificate. Jack Doran is our senior barista, full time, and looks after most of the espresso machine's day to day care. Mia Fenwick is a barista and works the floor too, mostly weekends plus a couple of weekday mornings. Liam Suárez and Sofia Nguyen are our kitchen hand and FOH casuals, rotating through the toastie station and dishes. Sofia is our newest team member.\n\n**Photo block:** the team on the floor during a Saturday morning rush.",
        question: {
          q: "Who holds The Batch House's current Food Safety Supervisor certificate?",
          options: ["Renata Alves", "Priya Chandran", "Jack Doran", "Mia Fenwick"],
          correct: 1,
        },
      },
      {
        content:
          "## Section 3: What we serve, and what we don't\nThe Batch House doesn't hold a liquor licence, and we don't have a BYO permit either. That's a deliberate choice, not something we haven't gotten around to. If a customer asks about bringing their own bottle of wine, ordering a beer, or anything else involving alcohol, the honest answer is that we can't serve or allow it here, a cafe without a licence or a BYO permit genuinely isn't allowed to let that happen. There's no RSA training, crowd control, or happy hour content anywhere in your training, because none of it applies to how we operate.",
        question: {
          q: "A customer asks if they can bring their own bottle of wine to have with lunch. What do you say?",
          options: [
            "Sure, we'll grab you a glass",
            "We don't have a liquor licence or a BYO permit, so we can't allow that here",
            "Only if it's a special occasion",
            "Check with Jack",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 4: How your training works\nEach module is broken into short sections like this one. Read a section, then answer a quick question to check it landed. Getting a question wrong just shows you the right answer, there's no penalty and no lockout, so answer honestly rather than guessing.\n\nOnce you've completed every module for your role, you'll upload the compliance certificates that apply to you and sign off with your typed name, recorded with the date, time, and your device. After that, you're ready to start real shifts. Ask Larder, our chatbot, is available any time after that from the same screen. It only answers from The Batch House's own approved content, so if it doesn't know something, it will tell you to ask your supervisor rather than guess.",
        noQuestion: true,
      },
      {
        content:
          "## Section 5: Who to ask\nPriya is the person for anything about food, the menu, or allergens. Jack looks after the espresso machine and can help with anything coffee related. Renata handles rostering, cash, and anything general. If you're ever unsure who to ask about something else, ask whoever's on shift with you, they'll point you the right way.",
        question: {
          q: "Who should you ask about a question involving the menu or allergens?",
          options: ["Jack", "Priya", "Mia", "Whoever's on register"],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Food safety fundamentals",
    roles: ["Cook", "Kitchen Hand/FOH Casual"],
    sections: [
      {
        content:
          "## Section 1: Why food safety is the main compliance area here\nThe Batch House doesn't hold a liquor licence, so there's no RSA, crowd control, or licensing compliance sitting behind our operation the way there would at a licensed venue. What we do have is a real kitchen serving unpackaged food that needs careful handling: eggs, toasties, dairy, and a display cabinet of pre made items. Under Victorian law, that puts us in Class 2, the same food safety category as a full kitchen pub, even though our kitchen is smaller. Food safety is the single biggest compliance area for us, and it's treated that way in this training.",
        question: {
          q: "Why does The Batch House sit in the same food safety category as a full kitchen pub, even though we're a smaller operation?",
          options: [
            "Because we're open seven days",
            "Because we serve unpackaged, potentially hazardous food like eggs and dairy",
            "Because we have a display cabinet",
            "Because Priya has a Food Safety Supervisor certificate",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 2: Food Safety Supervisor\nPriya holds The Batch House's current Food Safety Supervisor certificate. The exact renewal date isn't confirmed yet, it needs to be checked against the paperwork on file rather than assumed. If you're ever asked who holds our FSS certificate, or when it's due for renewal, say Priya holds it and that you'll check the exact date with Renata, rather than guessing.",
        question: {
          q: "If someone asks exactly when our Food Safety Supervisor certificate is due for renewal and you're not sure, what should you do?",
          options: [
            "Guess based on how long Priya's worked here",
            "Say Priya holds it and you'll check the exact date with Renata",
            "Say it doesn't expire",
            "Say Renata holds it",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 3: The temperature danger zone\nPotentially hazardous food, like eggs, dairy, and cooked rice, is only safe to have out of the fridge between 5°C and 60°C for a limited time. Under 2 hours total, it can go back in the fridge or be used straight away. Between 2 and 4 hours, it has to be used immediately and never returned to the fridge. Past 4 hours, it gets thrown out. This applies at every stage, prep, cooking, holding, and cooling, not just storage.",
        question: {
          q: "What happens to potentially hazardous food that's been out of the fridge for more than 4 hours?",
          options: [
            "It goes back in the fridge if it still looks fine",
            "It gets thrown out",
            "It can be served if it's reheated first",
            "It depends how busy service is",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 4: Temperature logging\nThe walk in fridge is logged consistently. The display cabinet is logged in the mornings when Mia opens, but on weekends, when it's just casuals running the floor, that doesn't always happen. The expected standard is that both get checked and logged every day we're open, weekends included, not just when someone remembers. If a reading comes back out of range, tell Priya or Renata straight away rather than tossing the item and moving on without saying anything, we need to know why it happened, not just deal with the one item.",
        question: {
          q: "What's the expected standard for logging fridge and display cabinet temperatures at The Batch House?",
          options: ["Only on weekdays", "Every day we're open, including weekends", "Once a week, whenever it's convenient", "Only if a health inspector is expected"],
          correct: 1,
        },
      },
      {
        content:
          "## Section 5: Cleaning schedule and receiving deliveries\nPriya keeps our cleaning schedule on a whiteboard in the kitchen, showing who does what at close. Follow what it lists for your shift. When a delivery arrives, check it against the order, and check the temperature of anything potentially hazardous, like dairy or meat, before accepting it, rather than judging it by feel. If something looks wrong, smells off, or arrives at the wrong temperature, don't accept it, flag it to Priya straight away.",
        question: {
          q: "What should you check on a delivery of dairy or meat before accepting it?",
          options: [
            "Just the quantity against the order",
            "The temperature, along with the order and general condition",
            "Nothing, the supplier is responsible",
            "Only the use by date",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Display cabinet and grab and go safety",
    roles: ["Cook", "Barista/FOH", "Kitchen Hand/FOH Casual"],
    sections: [
      {
        content:
          "## Section 1: Why the display cabinet gets its own attention\nOur display cabinet holds banana bread, slices, and pre made sandwiches for grab and go. Unlike food that's cooked and served straight away, display cabinet food sits out, visible to customers, for hours at a time. That makes it one of the most continuous food safety risks in the cafe, not a one off check.",
        question: {
          q: "Why does the display cabinet need particular attention compared with food cooked and served straight away?",
          options: [
            "Because it's the most popular part of the menu",
            "Because it sits out, visible to customers, for hours at a time",
            "Because it's harder to clean",
            "Because it's not covered by any food safety rule",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 2: Keeping displayed food safe\nPotentially hazardous items in the cabinet, like the pre made sandwiches, need to stay under 5°C. Use a clean thermometer at the centre of the food to check, don't just trust the dial. The cabinet's target setting was set by the technician who installed it and hasn't been checked against an actual number since, so checking the food itself with a thermometer matters more than trusting the display's own setting.\n\n> **Safety critical: potentially hazardous items in the display cabinet must stay under 5°C.** Check with a thermometer, don't rely on the cabinet's dial alone.",
        question: {
          q: "How should you confirm that food in the display cabinet is actually cold enough?",
          options: [
            "Trust the cabinet's dial setting",
            "Check with a clean thermometer at the centre of the food",
            "Feel the outside of the container",
            "Assume it's fine if it was cold this morning",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 3: Logging cabinet temperature\nMia logs the cabinet most weekday mornings when she opens. On weekends, when casuals are running the floor on their own, this doesn't always happen. The expected standard is that it gets logged every day we're open, weekends included. If you're opening and haven't been shown how to log it, ask Mia or Priya rather than skipping it for the day.",
        question: {
          q: "What's the real, current gap in how often the display cabinet gets logged?",
          options: [
            "It's never logged",
            "It's logged consistently on weekdays but inconsistently on weekends",
            "It's only logged once a month",
            "It's logged by Renata personally every day",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 4: Refreshing and serving from the cabinet\nIf something in the cabinet looks off, or has been handled by a customer, take it out straight away rather than leaving it. When you top up the cabinet, use a fresh batch in a clean container rather than adding new stock on top of what's already there. Use separate tongs or serving utensils for different items so you're not spreading anything between them.",
        question: {
          q: "When topping up the display cabinet, what should you do?",
          options: [
            "Add fresh stock on top of what's already there",
            "Replace with a fresh batch in a clean container",
            "Only replace it at the end of the day",
            "Mix old and new stock together to reduce waste",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Allergens and dietary swaps",
    roles: [], // Applies to: Owner/Manager, Cook, Senior Barista, Barista/FOH, Kitchen Hand/FOH Casual
    sections: [
      {
        content:
          "## Section 1: Why our menu needs extra care\nOur menu leans heavily on swaps: gluten free bread on most items, oat and soy milk alongside dairy, and a vegan option on about half the brunch menu by swapping eggs for tofu scramble or halloumi for avocado. Several items have two or three independent swap options each. That's a lot for anyone to hold reliably in their head across a full menu, which is exactly why we don't rely on memory alone when a guest asks a specific question.",
        question: {
          q: "Why is The Batch House's menu harder to hold reliably in memory than a simpler menu might be?",
          options: [
            "Because it changes every day",
            "Because many items have two or three independent swap options each",
            "Because it's a large printed menu",
            "Because it's written in Priya's handwriting",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 2: What's known for sure\nSome allergen facts are confirmed and firm: the granola and the banana bread both contain walnuts, the sourdough contains gluten, and most items contain dairy unless a swap is made. These are safe to state directly.\n\n> **Safety critical: the granola and the banana bread both contain walnuts.** Always mention this if a guest raises a nut allergy.",
        question: {
          q: "Which two items on our menu are confirmed to contain walnuts?",
          options: [
            "The sourdough and the salads",
            "The granola and the banana bread",
            "The toasties and the eggs",
            "The salads and the granola",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 3: What isn't written down anywhere\nThere's no written allergen list covering the rest of the menu. Priya holds that knowledge in her head, including cross contamination practices in the kitchen and whether the fryer is shared between anything containing gluten and our gluten free hot items. This is a real gap, not something this training can fill in for you, and it needs closing with a proper written record before it should be treated as settled.",
        question: {
          q: "Where does most of our detailed allergen knowledge, beyond the confirmed facts, currently live?",
          options: [
            "In a printed matrix behind the counter",
            "In Priya's own knowledge, not written down",
            "On the specials board",
            "In the POS system",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 4: How to answer a guest's allergy question\nNever guess or reassure a guest based on what you think is in a dish. Ask Priya or whoever's in the kitchen directly, every time, even for something you've served a hundred times, recipes and specials do change. If the kitchen can't confirm quickly, or Priya isn't on shift and nobody else is confident, tell the guest honestly that you can't confirm it right now rather than answering on their behalf.",
        question: {
          q: "If a guest asks about a specific allergen and nobody in the kitchen can confirm it confidently, what should you say?",
          options: [
            "It's probably fine",
            "That you can't confirm it right now, honestly",
            "Recommend a different item without checking",
            "Serve it and see how they go",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Espresso machine care and safety",
    roles: ["Senior Barista", "Barista/FOH", "Kitchen Hand/FOH Casual"],
    sections: [
      {
        content:
          "## Section 1: Our machine\nWe run a three group La Marzocco espresso machine. Jack looks after its day to day care, and backflushing happens every night at close without exception, that part of the routine is solid and consistent.",
        question: {
          q: "How often is the espresso machine backflushed at The Batch House?",
          options: ["Once a week", "Every night at close", "Only when it starts tasting off", "Whenever Jack remembers"],
          correct: 1,
        },
      },
      {
        content:
          "## Section 2: Descaling and the water filter\nDescaling happens on a reminder in Jack's phone, roughly every few months, but there isn't a fixed written schedule for it, and the water filter is changed around supplier visits rather than a set calendar date. If you need to know exactly when either is next due, ask Jack directly rather than guessing at a date. A properly documented schedule for both would be a real improvement over relying on one person's phone reminder.",
        question: {
          q: "If you need to know exactly when the machine is next due for descaling, what should you do?",
          options: [
            "Assume it's roughly every few months and leave it",
            "Ask Jack directly",
            "Check the maintenance manual",
            "Descale it yourself to be safe",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 3: Steam wand burn risk\nThe steam wand gets extremely hot and is a real burn risk, especially for anyone new to using it. New starters get shown how to steam milk properly in their first week, but that training isn't written down anywhere as a formal procedure yet. If you're new and haven't been shown, or don't feel confident with it, ask Jack or Mia before using it on your own.\n\n> **Safety critical: the steam wand causes real burns.** Never use it until someone's shown you properly, and let it cool before you clean around it.",
        question: {
          q: "What should a new starter do if they haven't been shown how to use the steam wand safely?",
          options: [
            "Watch someone else do it once and copy them",
            "Ask Jack or Mia before using it on their own",
            "Use it carefully and figure it out",
            "Only use the cold milk setting",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Food prep equipment safety",
    roles: ["Cook", "Kitchen Hand/FOH Casual"],
    sections: [
      {
        content:
          "## Section 1: The mandolin slicer\nThe mandolin slicer is used for potatoes and salad veg, and it's genuinely sharp enough to cause a serious cut if it's rushed or used carelessly. There's no formal guarding or blade changing procedure written down, staff are told to be careful, especially anyone newer to it. Liam has more experience with the mandolin than Sofia does. If you're less experienced with it, ask Liam or Priya to show you properly before using it on your own, and always use the guard or pusher hand, never your fingers, to move food across the blade.\n\n> **Safety critical: the mandolin slicer can cause a serious cut.** Always use the guard or pusher hand, and ask for help if you haven't used it before.",
        question: {
          q: "If you haven't used the mandolin slicer before, what should you do?",
          options: [
            "Give it a try carefully on your own",
            "Ask Liam or Priya to show you properly first",
            "Only use it on soft vegetables until you're confident",
            "Skip using it and tell the kitchen it's broken",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 2: Stick blender and benchtop mixer\nThe stick blender and the benchtop mixer, used for banana bread batter, are lower risk than the mandolin but still need care. Keep hands and utensils clear of the blade or beater while either is running, and always switch off and unplug before changing attachments or reaching into the bowl.",
        question: {
          q: "Before changing an attachment on the stick blender or mixer, what should you do?",
          options: [
            "Just be quick about it while it's still plugged in",
            "Switch off and unplug it first",
            "Only unplug it if it's the mixer, not the stick blender",
            "Ask someone else to hold it steady",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 3: Cleaning and general habits\nUnplug or isolate any piece of equipment before cleaning it, rather than working around a live blade or beater. If something's damaged, guard missing, cord frayed, blade loose, tell Priya straight away and don't keep using it until it's fixed.",
        question: {
          q: "If a piece of kitchen equipment has a missing guard or a damaged cord, what should you do?",
          options: [
            "Keep using it carefully",
            "Tell Priya and stop using it until it's fixed",
            "Only mention it if someone gets hurt",
            "Fix it yourself if you can",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Workplace health and safety",
    roles: [], // Applies to: Owner/Manager, Cook, Senior Barista, Barista/FOH, Kitchen Hand/FOH Casual
    sections: [
      {
        content:
          "## Section 1: Manual handling\nMilk crate deliveries come in heavy, twice a week, and outdoor furniture gets moved in and out depending on the weather. Lift with your knees, not your back, and ask for help with anything heavy or awkward rather than pushing through alone.",
        question: {
          q: "What's the general guidance for lifting anything heavy, like a milk crate delivery?",
          options: [
            "Push through it quickly so it's over faster",
            "Lift with your knees and ask for help rather than working alone",
            "Only lift it if you've done it before",
            "There's no guidance, use your own judgement",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 2: Chemical safety\nGlass washer and dishwasher chemicals are stored under the sink in the kitchen, in their original, labelled containers. Never transfer a chemical into an unlabelled bottle or a container that used to hold something else.\n\n> **Safety critical: cleaning chemicals stay in their original, labelled containers, always.** Never decant into an unlabelled bottle.",
        question: {
          q: "How should cleaning chemicals be stored at The Batch House?",
          options: [
            "In whatever container is closest to hand",
            "In their original, labelled containers, under the sink",
            "Mixed together to save space",
            "Anywhere out of guest sight",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 3: Evacuation and occupancy\nOur seating is generally described as 42 seats inside and 8 on the footpath, but that number has been questioned internally, with a more recent estimate closer to 35 for how the space actually operates day to day. Neither number has been formally confirmed against an official source. For a genuine evacuation or fire safety situation, don't rely on either figure from memory, check with Renata for the venue's actual, confirmed occupancy figure rather than assuming the seating count is the same thing as a safe maximum occupancy number.",
        question: {
          q: "If you need our exact maximum occupancy for a fire safety or evacuation situation, what should you do?",
          options: [
            "Use 42, since that's the seating count",
            "Use 35, since that's the more recent estimate",
            "Check with Renata for the venue's actual, confirmed figure rather than relying on either number",
            "Guess based on how full it looks that day",
          ],
          correct: 2,
        },
      },
      {
        content:
          "## Section 4: Reporting hazards\nIf you spot a hazard or have a near miss, tell Renata directly. There's no written form for this at The Batch House right now, it's a verbal report, so it only works if people actually speak up rather than assuming someone else will mention it.",
        question: {
          q: "If you notice a hazard or have a near miss on shift, what should you do?",
          options: [
            "Only mention it if someone gets hurt",
            "Tell Renata directly",
            "Fix it yourself and say nothing",
            "Wait until your next shift to mention it",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Cash handling and closing procedures",
    roles: ["Owner/Manager", "Senior Barista", "Barista/FOH"],
    sections: [
      {
        content:
          "## Section 1: Float and register\nOur float is $200, counted at open and close by whoever's opening or closing that day. EFTPOS makes up the large majority of what comes through the till, cash is around 5 percent these days, mostly older regulars. Count the float against this figure and flag any discrepancy to Renata straight away rather than at the end of the week.",
        question: {
          q: "What's The Batch House's standard float?",
          options: ["$50", "$200", "$500", "There's no fixed float"],
          correct: 1,
        },
      },
      {
        content:
          "## Section 2: Petty cash\nPetty cash sits around $50 for small supply runs. Sign off is verbal or by text from Renata, there's no formal written petty cash log yet. Get Renata's sign off before taking petty cash for a supply run, and keep whatever receipt comes back with it.",
        question: {
          q: "Who signs off on petty cash for a supply run at The Batch House?",
          options: ["Any senior staff member", "Renata", "Priya", "No sign off is needed"],
          correct: 1,
        },
      },
      {
        content:
          "## Section 3: Keeping cash handling safe\nKeep as little cash on the premises as you reasonably can, and avoid counting cash where customers can see it. If you're ever carrying cash off site for any reason, vary your route and timing rather than doing the same thing predictably every time. This is general good practice, not a specific procedure The Batch House has written down beyond the float and petty cash arrangements above.",
        question: {
          q: "What's a general good practice when handling cash off site?",
          options: [
            "Take the same route and timing every time for consistency",
            "Vary your route and timing rather than being predictable",
            "Carry it in a bag branded with the cafe's name",
            "Count it in front of customers so they can see it's accurate",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 4: Closing checklist\nClosing happens in the same order every night we trade, regardless of how the night went:\n\n1. Reconcile the till against the day's takings.\n2. Run the EFTPOS batch close.\n3. Lock up the walk in fridge and the dry store.\n4. Set the alarm on your way out.",
        question: {
          q: "What's the last step in The Batch House's closing routine?",
          options: ["Reconciling the till", "Running the EFTPOS batch close", "Setting the alarm on your way out", "Locking the dry store"],
          correct: 2,
        },
      },
      {
        content:
          "## Section 5: Safe access and security\nThe safe code is known only to Renata, Priya, and Jack. If you're one of the three and need it, get it directly from Renata rather than asking a colleague informally. There's no CCTV on site, that's a deliberate choice Renata's made for a quiet street, not an oversight.",
        question: {
          q: "Who currently knows The Batch House's safe code?",
          options: ["Every staff member", "Renata, Priya, and Jack only", "Whoever's closing that night", "Only Renata"],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Business continuity and emergencies",
    roles: [], // Applies to: Owner/Manager, Cook, Senior Barista, Barista/FOH, Kitchen Hand/FOH Casual
    sections: [
      {
        content:
          "## Section 1: Emergency contacts\nOur emergency contacts are currently kept in Renata's phone rather than posted anywhere on site. Getting this printed and put up in the kitchen is on the list, it just hasn't happened yet. Until it does, if you need an emergency contact and Renata isn't immediately available, that's the gap to be aware of, ask whoever's senior on shift.",
        question: {
          q: "Where are The Batch House's emergency contacts currently kept?",
          options: ["Posted in the kitchen", "In Renata's phone, not yet posted on site", "In the POS system", "There are no emergency contacts on file"],
          correct: 1,
        },
      },
      {
        content:
          "## Section 2: If the EFTPOS system goes down\nThere's no formal written plan for an EFTPOS outage right now. The working assumption is cash only until it's fixed, but this hasn't actually been tested by a real outage yet. If it happens, tell Renata straight away and follow whatever she directs on the day, rather than assuming cash only is confirmed policy.",
        question: {
          q: "If the EFTPOS system goes down, what should you do?",
          options: [
            "Close the cafe until it's fixed",
            "Tell Renata straight away and follow her direction",
            "Keep serving and sort payment out later",
            "Assume cash only without checking with anyone",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 3: Supplier fallback\nFor coffee beans, there's an informal backup, a second roaster Renata knows personally, if our usual Brunswick roaster can't deliver. There's currently no identified fallback for our produce or bread supplier. That's a real gap worth closing, not something to assume is covered.",
        question: {
          q: "What's our current fallback if our usual coffee roaster can't deliver?",
          options: [
            "There is no fallback for coffee",
            "A second roaster Renata knows personally",
            "Switching to instant coffee temporarily",
            "Closing early that day",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Section 4: Insurance\nThe Batch House holds contents and public liability insurance through a broker, but the specific coverage limits, and whether business interruption is included, aren't confirmed day to day. If you're ever asked about our insurance coverage, direct the question to Renata rather than guessing at what's included.",
        question: {
          q: "If someone asks about The Batch House's insurance coverage, what should you do?",
          options: [
            "Explain what you think is covered",
            "Direct the question to Renata",
            "Say we don't have insurance",
            "Check the POS system",
          ],
          correct: 1,
        },
      },
    ],
  },
];

// The one restricted module -- seeded separately, mirroring prior Block P
// seed scripts. is_restricted is set on the module_sections row (what
// ingest-module.ts actually reads), and fallback_tier='authorized' is set
// on the Owner/Manager, Cook, and Senior Barista staff_roles rows, matching
// this module's own "Applies to" line and Cash handling and closing
// procedures §5 ("The safe code is known only to Renata, Priya, and Jack" --
// Renata is the owner, Priya is Cook, Jack is Senior Barista).
const restrictedModules = [
  {
    title: "Safe access procedures",
    roles: ["Owner/Manager", "Cook", "Senior Barista"],
    content:
      "## Section 1: The safe combination\nThe safe combination is 09-27-63. Access to the safe combination is restricted to Renata, Priya, and Jack. Nobody else has the safe combination, and it isn't shared or written down anywhere outside those three people.\n\nIf you're one of the three and don't currently have the safe combination, get it directly from Renata rather than asking anyone else, including another senior staff member.",
  },
];

async function main() {
  const { data: existingVenue } = await admin.from("venues").select("id").eq("slug", SLUG).maybeSingle();
  if (existingVenue) {
    await admin.from("venues").delete().eq("id", existingVenue.id);
    const { data: authList } = await admin.auth.admin.listUsers();
    const u = authList.users.find((x) => x.email === OWNER_EMAIL);
    if (u) await admin.auth.admin.deleteUser(u.id);
    console.log("Removed previous block-p-cafe-batch-house venue");
  }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
  });
  if (authErr) throw authErr;

  const { data: bootstrapData, error: bootstrapErr } = await admin.rpc("bootstrap_owner", {
    p_auth_id: authData.user.id,
    p_venue_name: "The Batch House",
    p_venue_slug: SLUG,
    p_owner_name: OWNER_NAME,
    p_owner_email: OWNER_EMAIL,
  });
  if (bootstrapErr) throw bootstrapErr;
  const venueId = bootstrapData.venue_id;
  console.log("Created venue", SLUG, venueId);

  // Roles, matching every module's "Applies to" line verbatim.
  const roleDefs = [
    { name: "Owner/Manager", department: "FOH" },
    { name: "Cook", department: "BOH" },
    { name: "Senior Barista", department: "FOH" },
    { name: "Barista/FOH", department: "FOH" },
    { name: "Kitchen Hand/FOH Casual", department: "BOH" },
  ];
  const roles = {};
  for (const r of roleDefs) {
    const { data, error } = await admin.from("staff_roles").insert({ venue_id: venueId, ...r }).select("id").single();
    if (error) throw error;
    roles[r.name] = data.id;
  }
  console.log("Seeded roles:", Object.keys(roles).join(", "));

  // Set fallback_tier: authorized for Owner/Manager, Cook, and Senior
  // Barista -- the three roles the venue's own content (restricted module's
  // "Applies to" line, and Cash handling and closing procedures §5) scopes
  // into safe access. Barista/FOH and Kitchen Hand/FOH Casual stay at the
  // default 'frontline' -- no change needed.
  const { error: tierError } = await admin
    .from("staff_roles")
    .update({ fallback_tier: "authorized" })
    .in("id", [roles["Owner/Manager"], roles["Cook"], roles["Senior Barista"]]);
  if (tierError) throw tierError;
  console.log("Set fallback_tier=authorized for Owner/Manager, Cook, and Senior Barista.");

  // Accounts: owner already created via bootstrap_owner above. Two staff
  // accounts, PIN-based per Tech Bible §6.
  //
  // KNOWN PLATFORM BEHAVIOR, not a bug (see MEMORY
  // feedback_manager_role_login_gap): app_users.role = 'manager' cannot log
  // in via any current path -- the venue_roster RPC that powers the staff
  // PIN picker filters role = 'staff' only, and there's no separate manager
  // login route. The Senior Barista persona below is seeded with role:
  // 'staff' (the established, correct pattern), not role: 'manager', even
  // though "Senior Barista" is his staff_role_id scope and his staff_roles
  // row carries fallback_tier='authorized' for elevated access.
  const sbPinHash = await bcrypt.hash(SENIOR_BARISTA_PIN, 10);
  const { error: sbErr } = await admin
    .from("app_users")
    .insert({
      venue_id: venueId,
      role: "staff",
      name: SENIOR_BARISTA_NAME,
      staff_role_id: roles["Senior Barista"],
      pin_hash: sbPinHash,
    })
    .select("id")
    .single();
  if (sbErr) throw sbErr;

  const baristaPinHash = await bcrypt.hash(BARISTA_PIN, 10);
  const { error: baristaErr } = await admin
    .from("app_users")
    .insert({
      venue_id: venueId,
      role: "staff",
      name: BARISTA_NAME,
      staff_role_id: roles["Barista/FOH"],
      pin_hash: baristaPinHash,
    })
    .select("id")
    .single();
  if (baristaErr) throw baristaErr;
  console.log("Seeded accounts: owner, Senior Barista, Barista/FOH");

  // Certificate types + role mapping. Food Handling maps to the kitchen
  // roles per the Food Safety Supervisor requirement described in Food
  // safety fundamentals ("Applies to: Cook, Kitchen Hand/FOH Casual"). No
  // RSA, WWCC, or First Aid cert type -- this venue is unlicensed and none
  // of those are mentioned anywhere in its module content.
  const certDefs = ["Food Handling"];
  const certTypeIds = {};
  for (const name of certDefs) {
    const { data, error } = await admin.from("certificate_types").insert({ venue_id: venueId, name }).select("id").single();
    if (error) throw error;
    certTypeIds[name] = data.id;
  }
  const certRoleMap = [
    ["Food Handling", "Cook"],
    ["Food Handling", "Kitchen Hand/FOH Casual"],
  ];
  for (const [certName, roleName] of certRoleMap) {
    const { error } = await admin
      .from("certificate_type_roles")
      .insert({ certificate_type_id: certTypeIds[certName], role_id: roles[roleName] });
    if (error) throw error;
  }
  console.log("Seeded certificate types + role mapping");

  // Modules + sections + check questions. All modules go live.
  const moduleIds = {};
  for (const mod of modules) {
    const { data: m, error: mErr } = await admin
      .from("modules")
      .insert({ venue_id: venueId, title: mod.title, status: "live" })
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
  console.log(`Seeded ${modules.length} live modules`);

  // Restricted module (safe access) -- single is_restricted section, no
  // check question (source: "This section is restricted reference
  // material, not a training topic, and has no check question.").
  for (const mod of restrictedModules) {
    const { data: m, error: mErr } = await admin
      .from("modules")
      .insert({ venue_id: venueId, title: mod.title, status: "live", version: 1 })
      .select("id")
      .single();
    if (mErr) throw mErr;
    moduleIds[mod.title] = m.id;

    const { error: sErr } = await admin.from("module_sections").insert({
      module_id: m.id,
      section_order: 1,
      content: mod.content,
      is_restricted: true,
    });
    if (sErr) throw sErr;

    const { error: mrErr } = await admin
      .from("module_roles")
      .insert(mod.roles.map((roleName) => ({ module_id: m.id, role_id: roles[roleName] })));
    if (mrErr) throw mrErr;

    console.log(`Seeded restricted module "${mod.title}" (${m.id}), scoped to: ${mod.roles.join(", ")}`);
  }

  console.log("\nDone. The Batch House demo venue ready:");
  console.log(`  Venue slug: ${SLUG}`);
  console.log(`  Owner login: http://localhost:3000/${SLUG}/owner/login`);
  console.log(`  Owner email/password: ${OWNER_EMAIL} / ${OWNER_PASSWORD}  (name: ${OWNER_NAME})`);
  console.log(`  Staff login: http://localhost:3000/${SLUG}/login`);
  console.log(`  Senior Barista (${SENIOR_BARISTA_NAME}) PIN: ${SENIOR_BARISTA_PIN}  [role='staff', fallback_tier=authorized]`);
  console.log(`  Barista/FOH (${BARISTA_NAME}) PIN: ${BARISTA_PIN}  [role='staff', fallback_tier=frontline]`);
  console.log(`\n  Module IDs for ingestion:`);
  for (const [title, id] of Object.entries(moduleIds)) {
    console.log(`    ${id}  ${title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
