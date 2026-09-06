import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Block P pub validation pass, new venue. The Coachman's Arms Hotel, a
// suburban Victorian pub in Diamond Creek with a full commercial kitchen,
// gaming room, and a genuine "Applies to" role matrix that varies by module
// (unlike The Quiet Fox, which had only two role-gated modules). Content
// transcribed verbatim (structure, wording, and check-question wording
// preserved) from docs/block-p-pub/p4-modules/*.md (01 through 15;
// 00-module-index.md excluded, internal authoring note only). Idempotent:
// re-running removes any previous "block-p-pub-coachmans-arms" venue first.

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SLUG = "block-p-pub-coachmans-arms";
const OWNER_EMAIL = "coachmans-arms-owner@example.com";
const OWNER_PASSWORD = "CoachmansArmsOwner2026!";
const OWNER_NAME = "Gary Pappas";

// Duty Manager persona: role scope covers the two restricted modules (safe
// access, alarm access) plus cash handling / closing procedures, per every
// module's own "Applies to" line. Seeded with role='staff' (not 'manager')
// -- see note below (KNOWN PLATFORM BEHAVIOR, not a bug).
const DUTY_MANAGER_NAME = "Dave Kowalski";
const DUTY_MANAGER_PIN = "7391";

// Frontline persona: Bartender scope, shared + bar-relevant modules only,
// no cash handling / closing / restricted modules, per each module's own
// "Applies to" line. Default fallback_tier ('frontline') applies.
const BARTENDER_NAME = "Ash Thompson";
const BARTENDER_PIN = "2648";

// ---------------------------------------------------------------------------
// Module content, transcribed from docs/block-p-pub/p4-modules/*.md. Each
// section's body (heading + paragraphs + photo-block/safety-critical
// callouts) becomes one module_sections row; each "Check question" becomes
// one check_questions row. Sections marked "no check question" in the
// source get noQuestion: true. `roles: []` means the source module's
// "Applies to" line covers all 8 roles at this venue, so no module_roles
// row is inserted (shared / visible to everyone, matching the established
// convention from scripts/seed-block-p-quiet-fox.mjs).
// ---------------------------------------------------------------------------

const ALL_ROLES = [
  "Duty Manager",
  "Bar Supervisor",
  "Bartender",
  "Floor Staff",
  "Cellarman",
  "Head Chef",
  "Sous Chef",
  "Kitchen Hand",
];

const modules = [
  {
    title: "Welcome and how we work",
    roles: [], // Applies to: Duty Manager, Bar Supervisor, Bartender, Floor Staff, Cellarman, Head Chef, Sous Chef, Kitchen Hand
    sections: [
      {
        content:
          "## About The Coachman's Arms\nThe Coachman's Arms Hotel is a suburban pub on the corner of Main Hurstbridge Road in Diamond Creek, trading since the 1980s under a few different owners before Gary's family took it over in 2016.\n\nWe run a public bar with a TAB corner and keno screens, a bistro out the back, a beer garden off the side, and a small function room upstairs for private bookings. We also run a full commercial kitchen serving lunch and dinner seven days, and a gaming room out the back that operates somewhat separately from the rest of the venue.\n\n**Photo block:** the corner exterior of The Coachman's Arms from Main Hurstbridge Road.",
        noQuestion: true,
      },
      {
        content:
          "## Our team\nGary Pappas is the owner and licensee. Dave Kowalski is our Duty Manager and runs the roster and most of the day to day. Steph Vella is Bar Supervisor. Rob Doyle, known to everyone as Robbo, is our cellarman, and pulls beers too when the bar's flat out. Ash Thompson and Chevy Nguyen are bartenders, and Tayla Ferguson and Josh Whelan work the floor.\n\nIn the kitchen, Vinh Tran is Head Chef, Meg O'Brien is Sous Chef, and Jayden Cook and Priya Nair are kitchen hands. On busy weekends we also bring in contracted crowd controllers. They're not part of our regular staff, so you'll see different faces there depending on the night.\n\n**Photo block:** the team behind the bar and pass before a Friday service.",
        question: {
          q: "Who runs the roster and most of the day to day at The Coachman's Arms?",
          options: ["Gary Pappas", "Dave Kowalski", "Steph Vella", "Vinh Tran"],
          correct: 1,
        },
      },
      {
        content:
          "## How your training works\nEach module is broken into short sections like this one. Read a section, then answer a quick question to check it landed. Getting a question wrong just shows you the right answer, there's no penalty and no lockout, so answer honestly rather than guessing.\n\nOnce you've completed every module for your role, you'll upload your compliance certificates (RSA, food safety, or anything else that applies to you) and sign off with your typed name, recorded with the date, time, and your device. After that, you're ready to start real shifts. Ask Larder, our chatbot, is available any time after that from the same screen. It only answers from The Coachman's Arms' own approved content, so if it doesn't know something, it will tell you to ask your supervisor rather than guess.",
        noQuestion: true,
      },
      {
        content:
          "## Who to ask\nDave handles rostering and shift swaps. Steph handles RSA certificates and day to day bar supervision. Vinh and Meg handle anything about food, allergens, or the kitchen. Robbo is the person for anything cellar or gas related.\n\nFor anything about gaming machines or Responsible Gambling, that side of the business is handled by an outside compliance provider rather than by venue staff. Escalate to Dave or Gary rather than trying to answer it yourself, even if you think you know the answer. If you're ever unsure who to go to for something else, ask whoever's Duty Manager on shift, they'll point you the right way.",
        question: {
          q: "If someone asks a detailed question about gaming machine rules, what should you do?",
          options: [
            "Answer based on what you've picked up on the floor",
            "Escalate to Dave or Gary, this is handled by an outside compliance provider",
            "Check the machine's manual",
            "Tell them to ask Robbo",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Trading hours, licence and patron capacity",
    roles: ["Duty Manager", "Bar Supervisor", "Bartender", "Floor Staff", "Cellarman"],
    sections: [
      {
        content:
          "## Trading hours\nWe trade 10am to 1am Thursday through Saturday, under a late night authorisation attached to those three nights. Sunday through Wednesday, we trade 10am to 11pm.\n\nKnowing this matters for last drinks, for closing, and for answering a guest who asks how late we're open tonight versus on a weeknight.",
        question: {
          q: "What are our latest trading hours during the week, and on which nights?",
          options: ["1am, Thursday through Saturday", "Midnight, every night", "1am, every night", "11pm, every night"],
          correct: 0,
        },
      },
      {
        content:
          "## Patron capacity\nOur liquor licence sets an exact maximum number of people allowed on the premises, across the bar, bistro, beer garden, and function room combined, at any one time. That number is fixed by the licence itself, not by how busy a night feels or what anyone remembers hearing.\n\nIf you ever need the exact current limit, for a fire safety question, a regulator visit, or a genuinely packed night, check the number on our current liquor licence or ask Dave. Don't repeat a figure from memory, even one you've heard mentioned before, as if it were confirmed.",
        question: {
          q: "Where should you check for our exact maximum patron capacity?",
          options: [
            "Whatever number was mentioned most recently",
            "The number on our current liquor licence",
            "Count heads until the room feels full",
            "There's no fixed limit, use your judgement",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Beer garden noise\nWe keep an informal curfew on noise in the beer garden of around 10pm. There's no formal process beyond this, if things are getting loud out there after that time, whoever's on the floor wanders out and has a quiet word with the table.\n\nThis is about being a reasonable neighbour as much as anything else, a calm word early is a lot easier than a complaint later.",
        question: {
          q: "What's our general approach to beer garden noise after about 10pm?",
          options: [
            "Ignore it, the beer garden isn't covered by any noise expectation",
            "A staff member has a quiet word with the table",
            "Call the crowd controllers to move everyone inside",
            "Turn off the outdoor lighting to encourage people to leave",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## The gaming room\nOur gaming room runs somewhat separately from the rest of the venue, and everything to do with the gaming machine licence and Responsible Gambling requirements is handled through an outside compliance provider, not through venue staff training.\n\nIf a guest or a new team member asks a detailed question about gaming machines, don't attempt to answer it yourself, even if you think you know. Escalate to Dave or Gary, who work directly with the compliance provider on that side of the business.",
        question: {
          q: "Who handles questions about gaming machine rules and Responsible Gambling requirements at The Coachman's Arms?",
          options: [
            "Whoever's Duty Manager that night",
            "An outside compliance provider, escalate to Dave or Gary",
            "Bar Supervisor",
            "Nobody, staff answer these as they come up",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "RSA and responsible service",
    roles: ["Duty Manager", "Bar Supervisor", "Bartender", "Floor Staff", "Cellarman"],
    sections: [
      {
        content:
          "## RSA certification\nEvery bar and floor role at The Coachman's Arms needs a current RSA certificate before serving alcohol. Steph checks everyone's certificate when they start, and keeps track of renewal dates from there.\n\nIf your RSA is close to expiring, tell Steph as early as you can rather than waiting until it lapses. Serving without a current certificate isn't something we can make an exception for, for you or for the venue.",
        question: {
          q: "Who checks your RSA certificate when you start at The Coachman's Arms?",
          options: ["Gary, at your job interview", "Steph", "Whoever's rostered on your first shift", "Nobody, it's on the honour system"],
          correct: 1,
        },
      },
      {
        content:
          "## Recognising intoxication and refusing service\nWatch for the real signs: slurred or rambling speech, losing balance or bumping into things, becoming loud or argumentative, spilling drinks, or losing track of a conversation. Any one of these on its own can be nothing, a couple together is your cue to slow down or stop serving.\n\nTrust what you actually see over what a patron tells you. Someone insisting they're fine isn't a reason to keep pouring if your own read says otherwise. When you do refuse someone, stay calm and direct rather than getting drawn into an argument about it.",
        question: {
          q: "Which of these is a sign of intoxication staff are trained to watch for?",
          options: ["Ordering a soft drink", "Losing track of a conversation mid sentence", "Asking for the bill early", "Sitting at the bar alone"],
          correct: 1,
        },
      },
      {
        content:
          "## Who has the final say\nThe Coachman's Arms doesn't roster one fixed RSA marshal for every shift. In practice, whoever's most senior on the floor that night makes the call on a difficult refusal, and that's usually Steph or Dave when either of them is working.\n\nIf you're not sure who that is on a given night, ask, don't guess, and don't let an unclear refusal turn into an argument you end up handling alone.",
        question: {
          q: "If you're unsure how to handle a difficult refusal, what should you do?",
          options: [
            "Handle it yourself rather than bother a supervisor",
            "Check who's most senior on the floor that night and get them involved",
            "Serve the patron a weaker drink instead",
            "Wait until the end of the shift to mention it",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Handling trouble on the floor\nThere's a silent duress alarm under the main till. Use it any time you feel unsafe, it's connected to a monitored security service and doesn't need an explanation first.\n\nWe also keep a whiteboard in the office with the names of patrons who've been asked not to return. It's not a polished system, but check it if a face looks familiar at the bar or the door. If someone on that list comes in, tell your Duty Manager straight away rather than serving them and sorting it out later.\n\n> **Safety critical: the duress alarm is under the main till.** Use it any time you feel unsafe, no explanation needed first.",
        question: {
          q: "Where is the duress alarm at The Coachman's Arms?",
          options: ["In the office", "Under the main till", "At the front door", "There isn't one"],
          correct: 1,
        },
      },
      {
        content:
          "## Escalating to police\nIf a situation becomes physical, involves a weapon, or you genuinely feel unsafe, call 000 straight away. Don't wait to see if it settles down on its own, and don't try to physically manage an aggressive patron yourself.\n\nFor anything serious that happens on shift, whoever's on duty tells Dave or Steph verbally by the end of the night. That's currently how incidents get handed off here, so make sure it actually happens rather than assuming someone else mentioned it.",
        question: {
          q: "If a situation on the floor becomes physical or involves a weapon, what's the first thing you do?",
          options: [
            "Try to separate the people involved yourself",
            "Call 000 straight away",
            "Wait to see if it settles down",
            "Tell Dave or Steph at the end of the night",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Crowd control and door security",
    roles: ["Duty Manager", "Bar Supervisor", "Bartender", "Floor Staff"],
    sections: [
      {
        content:
          "## When crowd controllers work\nCrowd controllers work Friday and Saturday nights, and Thursday nights when there's a band on. Numbers vary with how big the night is, usually two, sometimes three.\n\nThey're contracted in for those shifts rather than being part of our regular staff, so you won't see the same faces every week.",
        question: {
          q: "On which nights does The Coachman's Arms usually run crowd controllers?",
          options: ["Every night we're open", "Friday and Saturday, and Thursday if there's a band on", "Sunday only", "We don't use crowd controllers"],
          correct: 1,
        },
      },
      {
        content:
          "## ID scanning\nID scanning at the door runs Friday and Saturday nights only. Outside those nights, staff still check ID the normal way behind the bar, scanning itself just isn't running.",
        question: {
          q: "On which nights does ID scanning run at the door?",
          options: ["Every night", "Friday and Saturday only", "Only when a crowd controller happens to bring the scanner", "We don't scan ID at the door"],
          correct: 1,
        },
      },
      {
        content:
          "## Bag checks\nBag checks happen at the door on busier nights, when crowd controllers are working, rather than as a standing rule every night. If you're on the door on a quieter night, this isn't something you need to run yourself.",
        question: {
          q: "When do bag checks happen at The Coachman's Arms?",
          options: [
            "Every night, as a standing policy",
            "On busier nights, when crowd controllers are on",
            "Only if a patron looks suspicious",
            "Never, we don't check bags",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Staying in touch with the door\nRight now, crowd controllers carry their own radios and bar staff don't share a channel with them. If you need to reach the door during a busy shift, you currently have to get someone's attention across the room rather than radio through.\n\nThis is a real gap in how we communicate, worth being aware of rather than assuming there's a faster way to reach the door than there actually is. If something urgent is happening near the door, send someone over in person rather than waiting for the right moment to shout across the room.",
        question: {
          q: "How do bar staff currently reach crowd controllers at the door during a shift?",
          options: [
            "A shared radio channel",
            "By getting their attention across the room, there's no shared channel yet",
            "Text message",
            "Through the till system",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Happy hour and promotional pricing",
    roles: ["Duty Manager", "Bar Supervisor", "Bartender", "Floor Staff"],
    sections: [
      {
        content:
          "## Our happy hour\nHappy hour runs Tuesday to Thursday, 5 to 7pm. During that window, house tap beer and house wine are two dollars off the normal price. It applies to those two categories only, not spirits, cocktails, or bottled craft beer.\n\nPolicies like this can shift over time, so if you're ever unsure whether happy hour is running on a particular day, check with Dave or Steph before quoting it to a guest.",
        question: {
          q: "What does happy hour discount at The Coachman's Arms?",
          options: ["Everything on tap and in the fridge", "House tap beer and house wine only", "Cocktails only", "All spirits"],
          correct: 1,
        },
      },
      {
        content:
          "## No two for ones or free drinks\nWe keep our promotional pricing simple: a flat two dollar discount on tap beer and house wine during happy hour, nothing more elaborate. We don't run two for one deals, free drinks, or anything built to get people drinking faster than they normally would.\n\nThat's a deliberate choice, not just a cost decision. A simple, time boxed discount is a much lower risk kind of promotion than an unlimited repeat deal or a matched free drink offer.",
        question: {
          q: "Which of these best describes our approach to drink promotions?",
          options: [
            "Two for one deals every weekend",
            "A flat, modest discount during a set window, nothing more elaborate",
            "Free drinks for regulars",
            "Whatever gets the most people in the door",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## If a guest asks about the rules\nThere's no single published rule that sets an exact time limit or discount cap for a happy hour. What actually matters is that a promotion doesn't encourage excessive or unsafe drinking.\n\nIf a guest or a new team member asks why our happy hour looks the way it does, that's the honest answer: we're not following one specific number, we're keeping it modest and time boxed on purpose.",
        question: {
          q: "Why does our happy hour run as a modest, time boxed discount rather than something bigger?",
          options: [
            "Because a fixed rule requires exactly this size discount",
            "To keep it a safer, lower risk kind of promotion",
            "Because tap beer can't be discounted any further",
            "It's just tradition, no real reason",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Food safety fundamentals",
    roles: ["Head Chef", "Sous Chef", "Kitchen Hand"],
    sections: [
      {
        content:
          "## Why our kitchen has extra requirements\nThe Coachman's Arms runs a full commercial kitchen, cooking meals from raw ingredients every service, seven days a week. That puts us in a higher food safety category under Victorian law than a venue only serving cold snacks or packaged food.\n\nIn practice, that means we're expected to nominate a Food Safety Supervisor and keep clear records showing our food safety controls are actually happening, not just assumed.",
        question: {
          q: "Why does The Coachman's Arms need a nominated Food Safety Supervisor?",
          options: [
            "Because we serve alcohol",
            "Because we cook meals from raw ingredients as a normal part of service",
            "Because our menu changes often",
            "All Victorian pubs are required to, regardless of what they serve",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Food Safety Supervisor\nWe're required to have a current Food Safety Supervisor certificate held by someone in the kitchen. Ask Vinh or Dave who currently holds it and when it's due for renewal, rather than assuming it's automatically up to date.\n\nIf you're ever asked this by a health inspector or a new team member and you're not certain, say you'll check rather than guessing a name.",
        question: {
          q: "If someone asks who our current Food Safety Supervisor is and you're not sure, what should you do?",
          options: [
            "Guess based on who runs the kitchen day to day",
            "Say you'll check with Vinh or Dave rather than guessing",
            "Say Gary, since he owns the venue",
            "Say we don't need one",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## The temperature danger zone\nPotentially hazardous food, raw meat, poultry, seafood, dairy, cooked rice, and similar, is only safe between 5°C and 60°C for a limited time. Under 2 hours total out of that range, it can go back in the fridge or be used straight away. Between 2 and 4 hours, it must be used immediately and never returned to the fridge. Past 4 hours, it has to be thrown out.\n\nThis applies at every stage of handling, prep, cooking, holding, and cooling, not just storage.",
        question: {
          q: "What must happen to potentially hazardous food that's been out of temperature control for more than 4 hours?",
          options: [
            "It can go back in the fridge if it looks fine",
            "It must be thrown out",
            "It can be reheated and served",
            "It depends on how busy service is",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Temperature checks in practice\nFridge and food temperatures are checked and logged twice a day, at opening and again at close, every day, including breakfast prep. This isn't a spot check when someone remembers, it's a standard part of opening and closing the kitchen.\n\nIf a reading is out of range, tell whoever's running the kitchen immediately rather than noting it and moving on.",
        question: {
          q: "When are kitchen temperature checks logged at The Coachman's Arms?",
          options: ["Only during dinner service", "At opening and again at close, every day", "Once a week", "Only if a health inspector is expected"],
          correct: 1,
        },
      },
      {
        content:
          "## Cleaning schedule and receiving deliveries\nVinh keeps the kitchen's cleaning schedule on the whiteboard in the kitchen. Follow what it lists for your shift rather than cleaning to your own routine, it's there so the whole kitchen stays consistent regardless of who's on.\n\nWhen a delivery arrives, check it against the order, and check the temperature of anything potentially hazardous, like meat, poultry, seafood, or dairy, before accepting it. If something looks wrong, smells off, or arrives at the wrong temperature, don't accept it, flag it to Vinh or Meg straight away.",
        question: {
          q: "What should you check on a delivery of raw meat or seafood before accepting it?",
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
    title: "Allergen awareness and cross contact",
    roles: ["Head Chef", "Sous Chef", "Kitchen Hand", "Bar Supervisor", "Bartender", "Floor Staff"],
    sections: [
      {
        content:
          "## Why allergen care looks different in a full kitchen\nOur menu runs to more than 30 items once you count mains, sides, sauces, and the specials board, and the specials board changes every couple of weeks or more. That's too much, and too changeable, to rely on a single printed list you memorise once and never check again.\n\nInstead of a fixed list, the approach here is a process: know the main risk categories, and always confirm anything specific with the kitchen rather than guessing.",
        question: {
          q: "Why doesn't The Coachman's Arms rely on a single printed allergen list for the whole menu?",
          options: [
            "Because allergies aren't common here",
            "Because the menu is large and the specials board changes often",
            "Because the kitchen doesn't track allergens at all",
            "Printed lists aren't allowed in food service",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## The main risk categories\nDishes most likely to carry gluten, dairy, or nuts are anything with pasta, bread, or crumbed coating (gluten), anything with cheese, cream, or butter based sauces (dairy), and any dish or dessert with nuts as a stated ingredient or garnish. Shared prep space and equipment, the same fryer, the same board, the same section, can carry a trace of any of these between dishes even when it isn't a listed ingredient.\n\nKnowing these categories helps you ask the right follow up question. It doesn't replace actually checking with the kitchen on a specific dish.\n\n> **Safety critical: shared prep space and equipment can carry allergen traces between dishes**, even when an allergen isn't a listed ingredient. Never assume a dish is safe just because the allergen itself isn't in the recipe.",
        question: {
          q: "Why might a dish carry a nut trace even if nuts aren't listed as an ingredient?",
          options: [
            "It can't, if nuts aren't in the recipe the dish is safe",
            "It may share prep space or equipment with a dish that does contain nuts",
            "Only desserts can carry traces",
            "Trace warnings are just a formality",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## How to actually answer a guest's allergy question\nNever guess or reassure a guest based on what you think is in a dish. Ask the kitchen directly, every time, even for a dish you've served a hundred times, recipes and specials change.\n\nIf the kitchen can't confirm quickly during a busy service, tell the guest honestly that you're checking rather than giving an answer you're not sure of.\n\n> **Safety critical: always confirm an allergen question with the kitchen directly.** Never answer from memory or assumption, even for a familiar dish.",
        question: {
          q: "If a guest asks whether a dish contains a specific allergen, what should you do?",
          options: [
            "Answer based on what you remember from the menu description",
            "Ask the kitchen directly, every time",
            "Recommend they avoid the whole menu to be safe",
            "Only check if they mention a severe allergy",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## When the kitchen isn't sure\nThere's currently no single written allergen record covering every dish, most of that knowledge sits with Vinh. If Vinh isn't on shift and nobody in the kitchen can confirm an allergen with confidence, be honest with the guest rather than guessing on their behalf, tell them you can't confirm it right now.\n\nBuilding a proper written allergen record for the full menu is real, ongoing work, not something staff are expected to reconstruct themselves on the floor.",
        question: {
          q: "If nobody in the kitchen can confirm whether a dish is safe for a guest's allergy, what should you tell them?",
          options: [
            "It's probably fine",
            "That you can't confirm it right now, honestly",
            "Recommend a similar dish instead without checking",
            "Serve it and see how they go",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Cellar and gas safety",
    roles: ["Cellarman", "Duty Manager", "Bartender"],
    sections: [
      {
        content:
          "## Why this matters\nCO2 and nitrogen, used to carbonate and pour our beer, are odourless and colourless gases. In an enclosed space like our cellar, a leak can push out breathable air without any warning sign you'd notice by smell or sight. Hospitality staff have died in Victorian cellars from exactly this cause, this isn't a hypothetical risk, it's the single most serious physical hazard in this venue.\n\n> **Safety critical: CO2 and nitrogen are odourless and invisible.** Never enter the cellar if you feel dizzy, short of breath, or notice anything unusual, and never go in to help someone who has collapsed without help arriving first.",
        question: {
          q: "Why is CO2 in an enclosed cellar dangerous, even though you can't see or smell it?",
          options: [
            "It stains equipment over time",
            "It can displace breathable air and cause suffocation without warning",
            "It only affects people with asthma",
            "It's dangerous only if a cylinder is visibly damaged",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Cellar access\nOnly trained staff should enter the cellar for anything beyond a quick, routine task. Robbo is trained across the full setup, changeovers, safety checks, all of it. If you're not confident about something in the cellar, don't guess, get Robbo or Dave.\n\nWhen you do need to access the cellar, use three points of contact on the ladder or steps at all times, and keep the space free of anything that could cause a slip or trip.",
        question: {
          q: "How many points of contact should you keep on the ladder or steps when accessing the cellar?",
          options: ["One", "Two", "Three", "It doesn't matter as long as you're careful"],
          correct: 2,
        },
      },
      {
        content:
          "## Alarms and leak checks\nOur cellar should have gas monitoring and an alarm that's both audible and visible, inside the cellar and at its entry point. Cylinders and lines should be leak tested regularly using bubble solution, and the whole monitoring and dispensing setup should get a proper maintenance check on a set schedule.\n\nIf you ever notice the alarm hasn't sounded in a way you'd expect, or you're not sure it's working, tell Dave or Robbo rather than assuming it's fine.",
        question: {
          q: "What should you do if you're not sure the cellar gas alarm is working properly?",
          options: ["Assume it's fine and carry on", "Tell Dave or Robbo", "Test it yourself with a lighter", "Wait until the next scheduled inspection"],
          correct: 1,
        },
      },
      {
        content:
          "## If the alarm goes off\nIf the gas alarm activates, get out of the cellar immediately and keep others out too. Never send a second person in to check on or rescue someone who has collapsed, without proper breathing equipment that person can be overcome just as fast as the first.\n\nCall 000 if anyone is unaccounted for or has collapsed, and tell Dave or Gary as soon as it's safe to do so.\n\n> **Safety critical: if a colleague collapses in the cellar, do not go in after them.** Get out, call 000, and never send a second person in without breathing equipment.",
        question: {
          q: "If the cellar gas alarm goes off and a colleague has collapsed inside, what should you do?",
          options: [
            "Go in immediately to pull them out",
            "Get out, call 000, and never send a second person in without breathing equipment",
            "Open the door and wait to see if they get up",
            "Call Robbo before doing anything else",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## What's specific to our cellar\nCylinders are stored in the cellar itself. The exact number on hand at any time isn't tracked as a fixed count, Robbo manages stock levels and changeovers directly. Gas safety training beyond Robbo hasn't been formally extended to other staff yet. Ash and Chevy cover keg changeovers when Robbo's off, but the safety side of gas handling specifically is still Robbo's area.\n\nIf Robbo's not on shift and something in the cellar doesn't seem right, don't attempt to sort it out yourself, contact Robbo directly or escalate to Dave.",
        question: {
          q: "If Robbo isn't on shift and something seems wrong in the cellar, what should you do?",
          options: [
            "Sort it out yourself since you've seen him do it before",
            "Contact Robbo directly or escalate to Dave, don't attempt it yourself",
            "Wait until his next shift",
            "Ask whichever bartender is free",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Keg handling and tap lines",
    roles: ["Cellarman", "Bartender", "Duty Manager"],
    sections: [
      {
        content:
          "## Our tap and keg setup\nWe run around 13 to 14 taps, a mix of rotating craft lines and fixed mainstream lines that don't change. Most of the range stays the same week to week, only a handful of lines rotate.\n\nRobbo manages which beers sit on which line. If you need the exact current lineup, check with him or the tap list at the bar.",
        question: {
          q: "Roughly how many taps does The Coachman's Arms run?",
          options: ["Around 4 to 5", "Around 13 to 14", "Exactly 20", "It changes every night"],
          correct: 1,
        },
      },
      {
        content:
          "## Line cleaning\nTap lines get cleaned on a regular schedule that Robbo manages and maintains. If you need to know exactly when a line was last cleaned or when the next clean is due, ask Robbo directly rather than assuming a fixed interval, the exact cadence isn't written down anywhere else yet.",
        question: {
          q: "Who manages the tap line cleaning schedule?",
          options: [
            "Whoever's rostered as Duty Manager that night",
            "Robbo",
            "Each bartender for their own section",
            "It's handled automatically by the tap system",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Lifting kegs safely\nA full keg weighs around 62 kilograms, heavy enough that lifting it awkwardly is a real injury risk, especially to your back. Use a trolley or a keg lifting device whenever one's available rather than lifting and carrying by hand.\n\nWhen you do need to lift, keep the keg between shoulder and mid thigh height, and get someone to help you for anything past a short, easy distance.",
        question: {
          q: "What's the safest way to move a full keg whenever possible?",
          options: [
            "Carry it alone as quickly as possible",
            "Use a trolley or keg lifting device",
            "Roll it on its side across the floor",
            "Lift it above shoulder height to see over it",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Keg changeovers\nRobbo handles keg changeovers day to day. Ash or Chevy cover this when he's off, so if you're one of them, make sure you're confident with the process before you're the one doing it alone.\n\nIf you're not confident changing a keg and Robbo isn't around, ask Dave rather than working it out on the spot.",
        question: {
          q: "Who covers keg changeovers when Robbo is off?",
          options: ["Whoever's closest to the cellar", "Ash or Chevy", "Nobody, changeovers wait until Robbo's back", "Gary"],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "General workplace safety",
    roles: [], // Applies to: Duty Manager, Bar Supervisor, Bartender, Floor Staff, Cellarman, Head Chef, Sous Chef, Kitchen Hand
    sections: [
      {
        content:
          "## Manual handling\nThere's no formal manual handling training program here yet. The general guidance is lift with your knees, not your back, and ask for help with anything heavy or awkward rather than pushing through alone. This matters most for kegs and stock deliveries, see the keg handling module for more on that specifically.\n\nIf lifting is a regular part of your role and something about it doesn't feel right, mention it to your Duty Manager rather than just working around it.",
        question: {
          q: "What's the general guidance for lifting anything heavy or awkward at The Coachman's Arms?",
          options: [
            "Push through it quickly so it's over faster",
            "Lift with your knees and ask for help rather than working alone",
            "Only lift if you've done it before",
            "There's no guidance, use your own judgement",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Chemical and cleaning safety\nCleaning chemicals are stored in a locked cupboard behind the kitchen, kept in their original, labelled containers. Never transfer a chemical into an unlabelled bottle or a container that used to hold something else.\n\nIf you can't find something you need, ask rather than substituting a different product without checking it's safe to use the same way.\n\n> **Safety critical: cleaning chemicals stay in their original, labelled containers, always.** Never decant into an unlabelled bottle.",
        question: {
          q: "How should cleaning chemicals be stored at The Coachman's Arms?",
          options: [
            "In whatever container is closest to hand",
            "In their original, labelled containers, in the locked cupboard behind the kitchen",
            "Mixed together to save space",
            "Anywhere out of guest sight",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Glass collection\nGlass collection is shared across whoever's on the floor, there's no dedicated glassy role here. Collect steadily through service rather than letting glasses build up on tables, and always carry glasses on a tray rather than stacked by hand.\n\nSweep up broken glass immediately and let others nearby know before you do, rather than leaving it for someone else to find.",
        question: {
          q: "Who's responsible for glass collection at The Coachman's Arms?",
          options: ["A dedicated glassy role", "Shared across whoever's on the floor", "Kitchen hands, between food service", "Only the Duty Manager"],
          correct: 1,
        },
      },
      {
        content:
          "## Reporting hazards\nIf you spot a hazard or have a near miss, write it in the incident folder in the office and tell your Duty Manager. It only works as a record if people actually use it, so don't skip it just because nothing serious happened.\n\nAnything urgent gets a direct word to your Duty Manager straight away, the folder is for the record, not the first response.",
        question: {
          q: "If you notice a hazard on shift, what should you do?",
          options: [
            "Mention it verbally and leave it at that",
            "Write it in the incident folder and tell your Duty Manager",
            "Only report it if someone gets hurt",
            "Fix it yourself and say nothing",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Cash handling",
    roles: ["Duty Manager", "Bar Supervisor"],
    sections: [
      {
        content:
          "## Float and tills\nOur float is $500, split across the two tills. Count your till against this figure at the start of your shift, and flag any discrepancy to whoever's Duty Manager straight away rather than at the end of the night.",
        question: {
          q: "What's our standard float across the two tills?",
          options: ["$200", "$500", "$1,000", "There's no fixed float"],
          correct: 1,
        },
      },
      {
        content:
          "## Safe drops\nSafe drops happen roughly hourly on a busy night, done by whoever's the duty manager on shift. This keeps the amount of cash sitting in the till manageable rather than building up across a long service.",
        question: {
          q: "How often do safe drops happen on a busy night?",
          options: ["Once, at the end of the night", "Roughly hourly", "Only if a till starts overflowing", "Twice a week"],
          correct: 1,
        },
      },
      {
        content:
          "## EFTPOS reconciliation\nEFTPOS is reconciled nightly against the till by the closing manager. This should happen every night we trade, not just on nights that feel busy or unusual.",
        question: {
          q: "Who reconciles EFTPOS against the till each night?",
          options: ["Whoever opened that morning", "The closing manager", "Gary, the next day", "It isn't reconciled nightly"],
          correct: 1,
        },
      },
      {
        content:
          "## Petty cash\nAnything under $50 doesn't need sign off. Anything above that needs Dave or Gary to sign off. Petty cash itself is kept in a small lock box in the office.",
        question: {
          q: "Who needs to sign off on a petty cash withdrawal above $50?",
          options: ["Any Duty Manager", "Dave or Gary", "Steph", "No sign off is needed at any amount"],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Closing procedures and premises security",
    roles: ["Duty Manager", "Bar Supervisor"],
    sections: [
      {
        content:
          "## Till reconciliation and lockup\nTill reconciliation and stock lockup are done by the closing duty manager, usually Dave, sometimes Steph. This happens every closing shift, regardless of how the night went.",
        question: {
          q: "Who's responsible for till reconciliation and stock lockup at close?",
          options: [
            "Whoever's still on shift at close",
            "The closing duty manager, usually Dave or Steph",
            "Kitchen staff before they leave",
            "It rotates weekly",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Last drinks\nLast drinks are called at about 12:30, for a 1am close. It can shift a little depending on how busy the night is, but 12:30 is the timing to work from.",
        question: {
          q: "Roughly when are last drinks called for a 1am close?",
          options: ["Midnight", "About 12:30", "12:55", "There's no set timing"],
          correct: 1,
        },
      },
      {
        content:
          "## CCTV\nCCTV is reviewed reactively rather than watched live every night. If something's happened, footage gets pulled and reviewed, it isn't monitored as a standing task through service.",
        question: {
          q: "When is CCTV footage reviewed at The Coachman's Arms?",
          options: ["Live, every night, by whoever's on the floor", "Reactively, if something's happened", "Only once a month", "It isn't reviewed at all"],
          correct: 1,
        },
      },
      {
        content:
          "## Restricted access at close\nThe safe code and the alarm code are both restricted to Gary, Dave, and Steph. If you're one of the three and closing that night, the specifics of accessing each are covered in your own restricted training, not in this module.",
        question: {
          q: "Who has access to the safe code and alarm code at The Coachman's Arms?",
          options: ["Every Duty Manager and Bar Supervisor", "Gary, Dave, and Steph", "Whoever is closing that night", "All bar staff"],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Business continuity and emergencies",
    roles: [], // Applies to: Duty Manager, Bar Supervisor, Bartender, Floor Staff, Cellarman, Head Chef, Sous Chef, Kitchen Hand
    sections: [
      {
        content:
          "## Emergency contacts\nWe keep emergency contacts on file for an electrician and our payment system provider. If the payment system stops working mid service, tell Dave immediately so he can start sorting it out, rather than trying to troubleshoot it yourself.",
        question: {
          q: "If the payment system stops working mid service, what should you do?",
          options: [
            "Keep trying different cards until one works",
            "Tell Dave immediately",
            "Wait until the end of the shift to mention it",
            "Turn the system off and on yourself",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Running low on stock on a big night\nIf we're about to run out of a keg on a big night, the practical fallback has been to ring the pub up the road and borrow one, paying it back on the next delivery. It's an informal arrangement rather than a standing contract, worked out case by case when it's actually needed.\n\nWhoever's Duty Manager on shift makes this call, not something a bar attendant or floor staff member should organise on their own.",
        question: {
          q: "What's the current fallback if a keg runs out on a big night?",
          options: [
            "Close that tap for the rest of the night, no exceptions",
            "The Duty Manager arranges to borrow one from the pub up the road",
            "Water down the remaining kegs",
            "There's no fallback, it's whatever happens",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Insurance and reporting\nInsurance broker details are held by Dave and by Gary's accountant, not something floor staff need to carry day to day. If something happens that might need reporting for insurance purposes, an incident, damage, anything like that, tell Dave or Gary and let them handle the paperwork and the broker contact directly.",
        question: {
          q: "If something happens that might need to be reported for insurance purposes, what should you do?",
          options: [
            "Contact the insurance broker yourself",
            "Tell Dave or Gary and let them handle it",
            "Wait to see if it comes up later",
            "Note it in the cleaning schedule",
          ],
          correct: 1,
        },
      },
    ],
  },
];

// The two restricted modules -- seeded separately, mirroring
// scripts/seed-block-p-quiet-fox-restricted-modules.mjs. is_restricted is
// set on the module_sections row (what ingest-module.ts actually reads),
// and fallback_tier='authorized' is set on the Duty Manager and Bar
// Supervisor staff_roles rows, matching this venue's own stated access
// rule ("Applies to: Duty Manager, Bar Supervisor" on both restricted
// modules, and Section 4 of Closing procedures: "The safe code and the
// alarm code are both restricted to Gary, Dave, and Steph" -- Gary is the
// owner, Dave is Duty Manager, Steph is Bar Supervisor).
const restrictedModules = [
  {
    title: "Safe access procedures",
    roles: ["Duty Manager", "Bar Supervisor"],
    content:
      "## Safe access at The Coachman's Arms\nThe safe combination is 22-08-41. Access to the safe combination is restricted to Gary, Dave, and Steph. Nobody else has the safe combination, and it isn't shared or written down anywhere outside those three people.\n\nIf you're one of the three and don't currently have the safe combination, get it directly from Gary rather than asking anyone else, including another Duty Manager or Bar Supervisor. Gary reviews the safe combination periodically and updates it if any of the three people holding it changes.",
  },
  {
    title: "Alarm and premises access",
    roles: ["Duty Manager", "Bar Supervisor"],
    content:
      "## Alarm access at The Coachman's Arms\nThe alarm code is 5192. Alarm code access is restricted the same way as safe access, to Gary, Dave, and Steph. Nobody else has the alarm code, and it isn't shared or written down anywhere outside those three people.\n\nIf you're one of the three and don't currently have the alarm code, get it directly from Gary rather than asking anyone else, including another Duty Manager or Bar Supervisor.",
  },
];

async function main() {
  const { data: existingVenue } = await admin.from("venues").select("id").eq("slug", SLUG).maybeSingle();
  if (existingVenue) {
    await admin.from("venues").delete().eq("id", existingVenue.id);
    const { data: authList } = await admin.auth.admin.listUsers();
    const u = authList.users.find((x) => x.email === OWNER_EMAIL);
    if (u) await admin.auth.admin.deleteUser(u.id);
    console.log("Removed previous block-p-pub-coachmans-arms venue");
  }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
  });
  if (authErr) throw authErr;

  const { data: bootstrapData, error: bootstrapErr } = await admin.rpc("bootstrap_owner", {
    p_auth_id: authData.user.id,
    p_venue_name: "The Coachman's Arms Hotel",
    p_venue_slug: SLUG,
    p_owner_name: OWNER_NAME,
    p_owner_email: OWNER_EMAIL,
  });
  if (bootstrapErr) throw bootstrapErr;
  const venueId = bootstrapData.venue_id;
  console.log("Created venue", SLUG, venueId);

  // Roles, matching every module's "Applies to" line verbatim.
  const roleDefs = [
    { name: "Duty Manager", department: "FOH" },
    { name: "Bar Supervisor", department: "FOH" },
    { name: "Bartender", department: "FOH" },
    { name: "Floor Staff", department: "FOH" },
    { name: "Cellarman", department: "FOH" },
    { name: "Head Chef", department: "BOH" },
    { name: "Sous Chef", department: "BOH" },
    { name: "Kitchen Hand", department: "BOH" },
  ];
  const roles = {};
  for (const r of roleDefs) {
    const { data, error } = await admin.from("staff_roles").insert({ venue_id: venueId, ...r }).select("id").single();
    if (error) throw error;
    roles[r.name] = data.id;
  }
  console.log("Seeded roles:", Object.keys(roles).join(", "));

  // Set fallback_tier: authorized for Duty Manager and Bar Supervisor --
  // the two roles the venue's own content (restricted modules 14/15's
  // "Applies to" line, and Closing Procedures §4) scopes into safe/alarm
  // access. Bartender, Floor Staff, Cellarman, Head Chef, Sous Chef, and
  // Kitchen Hand stay at the default 'frontline' -- no change needed.
  const { error: tierError } = await admin
    .from("staff_roles")
    .update({ fallback_tier: "authorized" })
    .in("id", [roles["Duty Manager"], roles["Bar Supervisor"]]);
  if (tierError) throw tierError;
  console.log("Set fallback_tier=authorized for Duty Manager and Bar Supervisor.");

  // Accounts: owner already created via bootstrap_owner above. Two staff
  // accounts, PIN-based per Tech Bible §6.
  //
  // KNOWN PLATFORM BEHAVIOR, not a bug (see MEMORY
  // feedback_manager_role_login_gap): app_users.role = 'manager' cannot log
  // in via any current path -- the venue_roster RPC that powers the staff
  // PIN picker filters role = 'staff' only, and there's no separate manager
  // login route. The Duty Manager persona below is seeded with role:
  // 'staff' (the established, correct pattern), not role: 'manager', even
  // though "Duty Manager" is his staff_role_id scope and his staff_roles
  // row carries fallback_tier='authorized' for elevated access.
  const dmPinHash = await bcrypt.hash(DUTY_MANAGER_PIN, 10);
  const { error: dmErr } = await admin
    .from("app_users")
    .insert({
      venue_id: venueId,
      role: "staff",
      name: DUTY_MANAGER_NAME,
      staff_role_id: roles["Duty Manager"],
      pin_hash: dmPinHash,
    })
    .select("id")
    .single();
  if (dmErr) throw dmErr;

  const btPinHash = await bcrypt.hash(BARTENDER_PIN, 10);
  const { error: btErr } = await admin
    .from("app_users")
    .insert({
      venue_id: venueId,
      role: "staff",
      name: BARTENDER_NAME,
      staff_role_id: roles["Bartender"],
      pin_hash: btPinHash,
    })
    .select("id")
    .single();
  if (btErr) throw btErr;
  console.log("Seeded accounts: owner, Duty Manager, Bartender");

  // Certificate types + role mapping. RSA is required for every bar/floor
  // role per module content ("Every bar and floor role at The Coachman's
  // Arms needs a current RSA certificate"). Food Handling maps to the
  // kitchen roles per the Food Safety Supervisor requirement described in
  // Food safety fundamentals. No WWCC or First Aid cert type -- not
  // mentioned anywhere in this venue's module content.
  const certDefs = ["RSA", "Food Handling"];
  const certTypeIds = {};
  for (const name of certDefs) {
    const { data, error } = await admin.from("certificate_types").insert({ venue_id: venueId, name }).select("id").single();
    if (error) throw error;
    certTypeIds[name] = data.id;
  }
  const certRoleMap = [
    ["RSA", "Duty Manager"],
    ["RSA", "Bar Supervisor"],
    ["RSA", "Bartender"],
    ["RSA", "Floor Staff"],
    ["RSA", "Cellarman"],
    ["Food Handling", "Head Chef"],
    ["Food Handling", "Sous Chef"],
    ["Food Handling", "Kitchen Hand"],
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

  // Restricted modules (safe access, alarm access) -- single is_restricted
  // section each, no check question (source: "This section is restricted
  // reference material, not a training topic, and has no check question.").
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

  console.log("\nDone. The Coachman's Arms Hotel demo venue ready:");
  console.log(`  Venue slug: ${SLUG}`);
  console.log(`  Owner login: http://localhost:3000/${SLUG}/owner/login`);
  console.log(`  Owner email/password: ${OWNER_EMAIL} / ${OWNER_PASSWORD}  (name: ${OWNER_NAME})`);
  console.log(`  Staff login: http://localhost:3000/${SLUG}/login`);
  console.log(`  Duty Manager (${DUTY_MANAGER_NAME}) PIN: ${DUTY_MANAGER_PIN}  [role='staff', fallback_tier=authorized]`);
  console.log(`  Bartender (${BARTENDER_NAME}) PIN: ${BARTENDER_PIN}  [role='staff', fallback_tier=frontline]`);
  console.log(`\n  Module IDs for ingestion:`);
  for (const [title, id] of Object.entries(moduleIds)) {
    console.log(`    ${id}  ${title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
