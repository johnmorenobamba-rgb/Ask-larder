import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Block P — Ask Larder validation pass, new venue. The Quiet Fox, a 70
// capacity cocktail bar in Brunswick East, VIC. Content transcribed verbatim
// (structure preserved, check-question wording preserved) from
// docs/block-p/p4-modules/*.md (01 through 08; 00-module-index.md excluded,
// internal authoring note only). Idempotent: re-running removes any
// previous "block-p-quiet-fox" venue first.

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SLUG = "block-p-quiet-fox";
const OWNER_EMAIL = "quiet-fox-owner@example.com";
const OWNER_PASSWORD = "QuietFoxOwner2026!";
const OWNER_NAME = "Marcus Webb";

// Duty Manager persona: role scope covers cash handling, closing procedures,
// and every shared module. Seeded with role='staff' (not 'manager') — see
// note below.
const DUTY_MANAGER_NAME = "Priya Nandakumar";
const DUTY_MANAGER_PIN = "4127";

// General FOH persona: Bar Attendant scope, the shared modules only (no
// cash handling / closing procedures, per each module's "Applies to" line).
const BAR_ATTENDANT_NAME = "Liv";
const BAR_ATTENDANT_PIN = "6053";

// ---------------------------------------------------------------------------
// Module content, transcribed from docs/block-p/p4-modules/*.md. Each
// section's body (heading + paragraphs + photo-block/safety-critical
// callouts) becomes one module_sections row; each "Check question" becomes
// one check_questions row. Sections marked "no check question" in the
// source get noQuestion: true.
// ---------------------------------------------------------------------------

const modules = [
  {
    title: "Welcome and how we work",
    roles: [], // shared — "Applies to: Duty Manager, Bar Supervisor, Bar Attendant, Glassie"
    sections: [
      {
        content:
          "## Welcome to The Quiet Fox\nThe Quiet Fox is a 70 capacity cocktail bar on Nicholson Street in Brunswick East. We're cocktail led, with a tight snacks menu, and we're busiest Thursday to Saturday nights.\n\nThis training walks you through how we run service, what's expected of you in your role, and where to go if something's unclear. It's built from our own procedures, not a generic hospitality course, so everything in here is exactly how we actually do things at this venue.\n\n**Photo block:** the front of The Quiet Fox from Nicholson Street, showing the footpath trading strip and the front window.",
        noQuestion: true,
      },
      {
        content:
          "## Your team\nEveryone at The Quiet Fox works front of house. There's no kitchen department, so you won't see a separate food team, food service here is limited to cold snack boards prepared behind the bar.\n\nThe team: Marcus is the owner and licensee. Priya is Duty Manager and also our RSA marshal on Friday and Saturday nights, and on any night the floor count goes over 50. Jordan is Bar Supervisor and second in charge. Liv, Sam, and Dee are Bar Attendants. Noah is our Glassie, and also runs drinks to the booths when it's busy, so he holds full RSA certification like everyone else.\n\n**Photo block:** a group shot of the current team behind the bar before a Friday service.",
        question: {
          q: "Who is rostered as RSA marshal on Friday and Saturday nights?",
          options: ["Jordan Ashcroft", "Marcus Webb", "Priya Nandakumar", "Noah Fitzgerald"],
          correct: 2,
        },
      },
      {
        content:
          "## How your training works\nEach module is broken into short sections like this one. Read a section, then answer a quick question to check it landed. Getting a question wrong just shows you the right answer, there's no penalty and no lockout, so answer honestly rather than guessing.\n\nOnce you've completed every module for your role, you'll upload your compliance certificates (RSA and any others that apply to you) and sign off with your typed name, which is recorded with the date, time, and your device. After that, you're ready to start real shifts.\n\nAsk Larder, our chatbot, is available any time after that from the same screen. It only answers from The Quiet Fox's own approved content, so if it doesn't know something, it will tell you to ask your supervisor rather than guess.",
        noQuestion: true,
      },
      {
        content:
          "## The venue at a glance\nThe Quiet Fox holds an on premises liquor licence, licence number 32104578, with no late night endorsement. That means nothing here trades past 1am, ever, and that limit matters for how we run last drinks and closing.\n\nLicensed capacity is 70 patrons: 40 seated across the booths and high tables, and 30 standing at the main bar and footpath strip. Trading hours run Tuesday and Wednesday 4pm to 11pm, Thursday 4pm to midnight, Friday and Saturday 3pm to 1am, and Sunday 2pm to 10pm. We're closed Monday.",
        question: {
          q: "What is the latest The Quiet Fox is licensed to trade, on any night?",
          options: ["Midnight", "1am", "2am", "There's no set limit"],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "RSA and service standards",
    roles: [],
    sections: [
      {
        content:
          "## RSA at The Quiet Fox\nEvery role at The Quiet Fox needs current RSA certification, including the Glassie role. That's because Noah regularly carries drinks from the bar out to the booths when it's busy, so he needs to be certified even on nights he isn't pouring.\n\nWe hire no one under 18, in any role, so there's no split here between staff who can and can't serve. Your RSA certificate is captured when you're invited to Larder: a photo of the card plus its issue and expiry dates, so we can track renewals for you.",
        noQuestion: true,
      },
      {
        content:
          "## Checking ID\nCheck ID for anyone who looks under 25. No exceptions, and no judgement call based on how old someone seems, if there's any doubt at all, ask for ID.\n\nThis standard exists precisely so you never have to make an awkward guess on the floor. Staff who stick to the rule consistently get far less pushback than staff who only ask sometimes.\n\n**Photo block:** the ID check point sign displayed at the entry, reminding patrons that proof of age may be requested.",
        question: {
          q: "What's the ID checking rule at The Quiet Fox?",
          options: [
            "Only check ID if someone asks to open a tab",
            "Check anyone who looks under 25",
            "Check anyone who looks under 21",
            "Use your own judgement on a case by case basis",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Knowing your standard pours\nKnowing a standard pour matters for two reasons: consistency behind the bar, and judging how much a patron has actually had. Spirits are poured as a 30ml nip. Wine is a 150ml standard pour or a 120ml small pour. Beer goes out in schooners and pints straight off the tap.\n\nIf you're not confident on a pour, ask Jordan or Priya to show you rather than eyeballing it. Getting this right protects both the guest experience and your own ability to judge intoxication later in the night.",
        question: {
          q: "What's a standard spirit pour at The Quiet Fox?",
          options: ["15ml", "30ml", "45ml", "There's no fixed measure"],
          correct: 1,
        },
      },
      {
        content:
          "## Recognising intoxication\nWatch for slurred speech, unsteady balance, spilling drinks, becoming loud or argumentative, or losing track of a conversation mid sentence. Any one of these on its own can be nothing, but a couple together is your cue to slow down or stop serving that patron.\n\nTrust what you see over what someone tells you. A patron insisting they're fine is not a reason to override your own read of the situation.",
        question: {
          q: "Which of these is a sign of intoxication staff are trained to watch for?",
          options: ["Ordering a mocktail", "Losing track of a conversation mid sentence", "Asking for the bill early", "Sitting at the bar alone"],
          correct: 1,
        },
      },
      {
        content:
          "## Refusing service, the right way\nWhen you decide to stop serving someone, use our script exactly as written rather than improvising your own version. Staying on script keeps the conversation calm and consistent no matter who's behind the bar that night.\n\nIf a patron pushes back at all, don't argue it yourself, call Priya or Jordan over immediately and let them take it from there. Priya, as RSA marshal, has the final say if a Bar Attendant and a patron disagree about whether someone's had enough.\n\n> **Safety critical: use this wording exactly.** \"I can't serve you another one, I want to make sure you get home okay tonight. Can I grab you a water, or call you a taxi?\"",
        question: {
          q: "If a patron argues after being refused service, what should you do?",
          options: [
            "Keep explaining the refusal yourself until they accept it",
            "Serve them a weaker drink instead",
            "Call Priya or Jordan over immediately",
            "Ask another Bar Attendant to serve them instead",
          ],
          correct: 2,
        },
      },
      {
        content:
          "## Handling trouble on the floor\nThe Quiet Fox doesn't run crowd controllers, our room is small enough that Priya or Jordan can read the floor themselves, and most issues here are refusals rather than anything physical. Stay calm, keep your voice level, and give a patron space rather than crowding them if a conversation gets heated.\n\nThere's a silent duress button fitted under the main till, wired through to a monitored security service. Use it if you ever feel unsafe, it doesn't need an explanation first, that's what it's there for.\n\nWe also keep a folder behind the bar with a photo and a short note on anyone who's been asked not to return. If a face looks familiar on the door or at the bar, check the folder rather than relying on memory alone.",
        question: {
          q: "Where should you check if a patron's face looks familiar from a past incident?",
          options: [
            "Ask another Bar Attendant if they recognise them",
            "The banned patron folder behind the bar",
            "Look them up on social media",
            "Wait and see if they cause trouble again",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Food handling and allergens",
    roles: [],
    sections: [
      {
        content:
          "## Our food service\nThe Quiet Fox has no kitchen and no cooking equipment on site, so nothing hot ever leaves the bar. Our menu is cold boards and packaged snacks only: marinated olives, marinated feta, kettle chips, pretzels, a cheese board, and a charcuterie board.\n\nBecause we sit at this low risk end of food service, we don't need a nominated Food Safety Supervisor. That would change if we ever added a cooked menu, but it isn't required for what we serve now.\n\n**Photo block:** the full snacks menu as displayed at the bar, showing all six items.",
        noQuestion: true,
      },
      {
        content:
          "## Keeping cold items cold\nCold items are held in the under bar fridge at or below 5°C at all times. Check the fridge temperature at the start of your shift, and again if you notice anything sitting out longer than it should.\n\nBoards are assembled to order rather than made up in advance and left sitting out. This keeps everything fresher and reduces the time any ingredient spends outside the fridge.",
        question: {
          q: "What temperature must cold items be held at in the under bar fridge?",
          options: [
            "At or below 5°C",
            "At or below 10°C",
            "Room temperature is fine for short periods",
            "There's no set temperature, just keep it cold",
          ],
          correct: 0,
        },
      },
      {
        content:
          "## Assembling boards safely\nWash your hands and change gloves between board types, particularly between anything with nuts and anything with dairy. This is the single most important habit in food handling here, since it's what actually stops one guest's allergy from being triggered by another guest's board.\n\nTake your time assembling rather than rushing, even when the bar's busy. A board assembled carelessly under pressure is exactly when a cross contact mistake happens.\n\n> **Safety critical: change gloves between board types, every time, no exceptions**, especially between nut adjacent and dairy items.",
        question: {
          q: "When must you change gloves while assembling boards?",
          options: [
            "Only if a guest mentions an allergy",
            "Between board types, especially nuts and dairy",
            "Once per shift is enough",
            "Only when gloves look visibly dirty",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Know the allergen matrix\nEvery item on our snacks menu carries a tag for what it contains, and you should be able to answer a guest's allergy question without hesitating. Marinated olives and kettle chips carry no flagged allergens. Marinated feta contains dairy. Pretzels contain gluten.\n\nThe cheese board contains dairy, and the lavash served with it contains gluten. The charcuterie board may contain traces of nuts, since it shares prep space with the cheese board, and its bread contains gluten.\n\n> **Safety critical: the charcuterie board may contain nut traces** from shared prep space with the cheese board. Always mention this if a guest asks about nut allergies.",
        question: {
          q: "Why does the charcuterie board carry a nut trace warning?",
          options: [
            "It's made with actual nuts as an ingredient",
            "It shares prep space with the cheese board",
            "It's served on the same tray as the pretzels",
            "It doesn't, only the cheese board does",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Stock rotation and use by dates\nRotate stock so nothing sits in the display fridge past its use by date. Check dates when you restock during your shift, not just at the start of the week.\n\nIf you find something past its date, pull it and tell whoever's running the bar that night rather than serving it anyway. This is a quick check that protects every guest who orders a board that day.",
        question: {
          q: "What should you do if you find an ingredient past its use by date?",
          options: [
            "Serve it if it still looks and smells fine",
            "Pull it and tell whoever's running the bar",
            "Use it only for board garnish, not the main item",
            "Leave it for the next shift to deal with",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Bar equipment and stations",
    roles: [],
    sections: [
      {
        content:
          "## Beer lines and taps\nOur beer lines run through a Lancer Taphouse system behind the main bar, with four taps pouring straight from kegs kept in the cool room. Pour beer at a slight angle down the side of the glass to control the head, then straighten up as the glass fills.\n\nThe lines get cleaned on a fortnightly rotation. If a beer starts pouring cloudy, foamy, or with an off taste that a fresh keg doesn't explain, tell Priya or Jordan rather than assuming it's the keg.\n\n**Photo block:** the four tap Lancer Taphouse system behind the main bar, showing the tap handles and glassware set up beneath them.",
        question: {
          q: "How often are the beer lines cleaned?",
          options: ["Weekly", "Fortnightly", "Monthly", "Only when a keg is changed"],
          correct: 1,
        },
      },
      {
        content:
          "## The glasswasher\nOur glasswasher is a Hobart PROFI FX unit fitted under the bar counter. It runs a full wash and rinse cycle in a couple of minutes, using detergent and a rinse aid dosed automatically from their containers under the back bar.\n\nLoad glasses upside down and give the machine a moment to finish its cycle before opening it. Running low on rinse aid leaves glasses spotty, so flag it early rather than after a service starts.",
        question: {
          q: "Where does the glasswasher's detergent and rinse aid come from?",
          options: [
            "Poured in by hand before each wash",
            "Dosed automatically from containers under the back bar",
            "A separate bottle kept at each till",
            "It doesn't need either, just hot water",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## The espresso machine\nWe run a compact Wega Mininova machine, used only for espresso martinis rather than a coffee program, so you won't be pulling shots for guests to drink on their own. Pull a fresh shot for each espresso martini ordered rather than batching shots ahead of time, since the drink relies on that shot being hot and freshly extracted.\n\nWipe down the group head and steam wand after each use, and flag any grinder issue to Priya or Jordan rather than working around it.\n\n**Photo block:** the Wega Mininova machine on the back bar, positioned next to the cocktail station.",
        question: {
          q: "What is the espresso machine used for at The Quiet Fox?",
          options: ["A full coffee program for guests", "Espresso martinis only", "Decaf orders only", "It's for staff use only, not guest drinks"],
          correct: 1,
        },
      },
      {
        content:
          "## Cool room and kegerator\nOur single walk in cool room is Bromic branded and holds kegs, wine, and board ingredients together. It's a shared space, so keep food sealed and away from anything that could drip onto it, and keep kegs clear of the walkway.\n\nThe kegerator sits under the bar and runs two extra lines beyond the main four tap system, giving us six pouring lines in total when everything's connected.",
        question: {
          q: "What does The Quiet Fox's single cool room hold?",
          options: ["Kegs only", "Wine only", "Kegs, wine, and board ingredients together", "Nothing, it's used for storage of glassware only"],
          correct: 2,
        },
      },
      {
        content:
          "## POS and EFTPOS terminals\nWe run three Square terminals: the main bar terminal, a second till, and a roaming Square Stand used in the function nook. The second till only comes online on Friday and Saturday nights when we're busy enough to need it.\n\nLog every sale as it happens rather than running a tab in your head, this keeps our till counts accurate at the end of the night and makes reconciliation faster for whoever's closing.",
        question: {
          q: "When does the second till come online?",
          options: ["Every night we're open", "Only Friday and Saturday nights", "Only for function bookings", "It's always on, just unattended on quiet nights"],
          correct: 1,
        },
      },
      {
        content:
          "## Looking after the gear\nReport anything that looks, sounds, or smells wrong with any piece of equipment straight away rather than waiting to see if it resolves itself. A glasswasher running a longer cycle than usual, a tap pouring unevenly, or a fridge that feels warmer than it should are all worth flagging immediately.\n\nEquipment issues caught early are a quick fix. Left until they fail mid service, they become a bigger problem for everyone on shift.",
        question: {
          q: "If a piece of equipment seems to be behaving oddly, what should you do?",
          options: ["Wait to see if it fixes itself", "Keep using it as normal", "Report it straight away", "Only mention it at the end of the night"],
          correct: 2,
        },
      },
    ],
  },
  {
    title: "Workplace safety and manual handling",
    roles: [],
    sections: [
      {
        content:
          "## Lifting kegs safely\nA full 50L keg weighs close to 58kg, so it never comes up from the cool room as a solo lift. Always get a second person to help, every time, even if you feel confident lifting it alone.\n\nBend at the knees rather than the back, keep the keg close to your body, and communicate clearly with whoever's lifting with you before you move.\n\n> **Safety critical: never lift a full keg alone.** Get a second person every time, no exceptions.",
        question: {
          q: "How should a full keg be lifted from the cool room?",
          options: ["Alone, if you feel strong enough", "With a second person, every time", "Only with a trolley, never by hand", "However's fastest during a busy shift"],
          correct: 1,
        },
      },
      {
        content:
          "## Collecting glass safely\nUse the scoop and rubber lined tubs kept behind the bar to collect broken glass. Never pick up broken glass with bare hands, even a small piece, the tub and scoop exist so you don't have to.\n\nSweep the area again after the main pieces are collected, since small fragments are easy to miss and just as sharp as the obvious ones.\n\n**Photo block:** the glass collection scoop and rubber lined tub kept behind the main bar.",
        question: {
          q: "What should you use to collect broken glass?",
          options: ["Bare hands, carefully", "A regular broom only", "The scoop and rubber lined tubs", "Whatever's closest at the time"],
          correct: 2,
        },
      },
      {
        content:
          "## Handling cleaning chemicals\nGlasswasher detergent and sanitiser stay in their original containers, stored under the back bar. Never decant either into an unlabelled bottle, even temporarily, since a bottle without its original label is a guessing game for whoever picks it up next.\n\nRead the label before using anything you're not familiar with, and ask Priya or Jordan if you're ever unsure what a chemical is for or how it's meant to be used.\n\n> **Safety critical: never decant cleaning chemicals into an unlabelled bottle.** Keep everything in its original, labelled container.",
        question: {
          q: "Where should glasswasher detergent and sanitiser be kept?",
          options: [
            "In their original containers under the back bar",
            "Decanted into smaller labelled bottles for convenience",
            "Anywhere with space near the glasswasher",
            "Locked away and only accessed by Marcus",
          ],
          correct: 0,
        },
      },
      {
        content:
          "## Reporting hazards and near misses\nIf you spot a hazard or something goes wrong that could have caused an injury, tell whoever's Duty Manager on shift straight away. It gets logged in the near miss folder and reviewed by Marcus every week.\n\nThere's no separate after hours emergency line for this, since nothing at The Quiet Fox runs unsupervised, so reporting to the Duty Manager on shift covers every situation.",
        question: {
          q: "Who should you report a hazard or near miss to?",
          options: [
            "Write it in the near miss folder yourself and move on",
            "Whoever's Duty Manager on shift at the time",
            "Wait until Marcus is next in the venue",
            "Only report it if someone was actually injured",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Cash handling and end of night reconciliation",
    roles: ["Duty Manager", "Bar Supervisor"],
    sections: [
      {
        content:
          "## The opening float\nThe Quiet Fox opens with a $400 float in total, split as $250 on the main bar till and $150 on the second till. The second till float only gets loaded on Friday and Saturday nights, when the second Square terminal comes online.\n\nCount the float against these figures before service starts, and note anything that doesn't match before the first sale of the night rather than after.",
        question: {
          q: "What is the opening float on the main bar till?",
          options: ["$150", "$250", "$400", "$500"],
          correct: 1,
        },
      },
      {
        content:
          "## Till reconciliation at close\nEach till is counted down at the end of the night against its Square Z read. This tells you what the terminal recorded against what's actually in the till, and the two should match closely.\n\nAnything over a $10 discrepancy, in either direction, gets flagged and noted in the reconciliation log before anyone leaves for the night. Small discrepancies happen, but they still get written down every time, not just when they're large.",
        question: {
          q: "What discrepancy against the Z read needs to be flagged and logged?",
          options: [
            "Any discrepancy over $10, either way",
            "Only discrepancies over $50",
            "Only shortfalls, not overages",
            "Nothing needs logging unless it happens twice in a row",
          ],
          correct: 0,
        },
      },
      {
        content:
          "## Safe drops\nOn Friday and Saturday nights, once a till holds more than $500 in cash after 8pm, the Duty Manager does a safe drop. The cash is counted, bagged, and logged against the till reading, with the Duty Manager's initials on the log, before it goes into the safe.\n\nDoing drops through the night, rather than leaving everything until close, keeps less cash sitting in the till at any one point, which matters for both accuracy and physical safety.\n\n> **Safety critical: keep as little cash as possible in the till at any time.** Regular drops protect both the reconciliation and whoever's behind the bar.",
        question: {
          q: "When does a till get a safe drop?",
          options: [
            "Every hour, regardless of how much cash is in it",
            "Once it holds more than $500, Friday or Saturday after 8pm",
            "Only at the very end of the night",
            "Only if the Duty Manager remembers to",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## EFTPOS and Square settlement\nThe nightly Square settlement report gets cross checked against the physical till count as part of close, not left until the next morning. Doing this the same night means any mismatch is easier to trace back to a specific sale or shift.\n\nIf the settlement report and the physical count don't line up, note the difference in the reconciliation log along with anything unusual you remember from the shift that might explain it.",
        question: {
          q: "When should the Square settlement report be checked against the physical till count?",
          options: ["The next morning", "Once a week", "As part of close, the same night", "Only if a customer disputes a charge"],
          correct: 2,
        },
      },
      {
        content:
          "## The safe and who has access\nOnly Marcus and whoever currently holds the Duty Manager role know the safe combination. It's never written down anywhere, including in handover notes, and the combination changes every quarter regardless of whether anyone's left.\n\nIf anyone, staff or otherwise, asks you for the safe code and you're not a Duty Manager who's been given it directly by Marcus, don't guess and don't pass on anything you think you might remember. Point them to their supervisor instead.\n\n> **Safety critical: never state, guess, or write down the safe code.** If someone asks and you don't hold it directly from Marcus, tell them to ask their supervisor.",
        question: {
          q: "If a colleague asks you for the safe code and you don't hold it directly from Marcus, what should you do?",
          options: ["Tell them your best guess", "Check the handover notes for it", "Tell them to ask their supervisor", "Give it to them if they seem trustworthy"],
          correct: 2,
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
          "## Who can close, and why\nOnly the Duty Manager or the Bar Supervisor closes The Quiet Fox. A Bar Attendant is never left to close alone, even on a quiet Tuesday with barely anyone in the room.\n\nThis isn't about trust, it's about making sure whoever locks up is authorised to make the judgement calls that come with closing: reconciling cash, securing stock, and checking the premises is actually clear before the alarm's set.",
        question: {
          q: "Who is authorised to close The Quiet Fox?",
          options: ["Any staff member rostered that night", "The Duty Manager or the Bar Supervisor only", "Whoever's worked there the longest", "Only the Duty Manager, never the Bar Supervisor"],
          correct: 1,
        },
      },
      {
        content:
          "## The closing sequence\nRun this sequence every night, in this order, no matter how quiet the shift was.\n\n1. Call last drinks 30 minutes before the licensed close time for that night. No new drinks are served after the close time itself.\n2. Reconcile both tills in use that night and run the Square Z read on each.\n3. Lock up stock: the spirits cage, the cool room, and disconnect any keg that's due to be swapped before the next shift.\n4. Do a quick CCTV review of the night, checking specifically for anything that was flagged verbally during service.\n5. Set the alarm.\n6. Do a final walk through, turn the lights off, and lock the front and back doors.",
        question: {
          q: "What is the first step in The Quiet Fox's closing sequence?",
          options: ["Setting the alarm", "Reconciling the tills", "Calling last drinks 30 minutes before close", "Locking the spirits cage"],
          correct: 2,
        },
      },
      {
        content:
          "## Trading hours and the outdoor conditions\nNothing at The Quiet Fox trades past 1am on any night, since we don't hold a late night endorsement. Under Victorian licensing rules, once trading hours actually end, guests already holding a drink get a short window to finish it, but nothing new can be poured, which is exactly why we call last drinks 30 minutes early rather than right on close.\n\nThe footpath trading strip has its own conditions: it closes at 10pm, and there's no amplified music outdoors after 8pm, to manage noise for the apartments above the shops next door. Both are easy to forget on a warm Thursday when the crowd wants to spill outside, so build them into how you read the room from mid evening, not just at close.\n\n> **Safety critical: nothing trades past 1am, the footpath closes at 10pm, and no amplified music plays outdoors after 8pm.** These are licence conditions, not house preferences.",
        question: {
          q: "What time does the footpath trading strip need to be clear by?",
          options: ["8pm", "9pm", "10pm", "It can stay open until the venue itself closes"],
          correct: 2,
        },
      },
      {
        content:
          "## CCTV review at close\nThe six cameras cover the entry, main bar, back bar, function nook, back door, and footpath strip, with footage retained for 30 days. Every closing night, do a quick review focused on anything that was flagged verbally during the shift, rather than watching the whole night back.\n\nIf an actual incident occurred, that review needs to be more thorough, and it's worth doing while the details are still fresh rather than leaving it for the next day.",
        question: {
          q: "What triggers a fuller CCTV review, beyond the standard nightly check?",
          options: ["A quiet night with no incidents", "An actual incident occurring during the shift", "A new staff member's first close", "CCTV is only ever reviewed if the police request it"],
          correct: 1,
        },
      },
      {
        content:
          "## Banned patrons at close\nWe keep a folder behind the bar with a photo and a short note on anyone who's been asked not to return. It's a physical folder, not a digital list, so check it as part of your closing routine if anything unusual happened that night involving a patron who might need to be added.\n\nIf you do add someone, note it clearly enough that whoever's on the door next time can recognise them from the description alone.",
        question: {
          q: "How does The Quiet Fox track patrons who've been asked not to return?",
          options: ["A shared digital spreadsheet", "A physical folder behind the bar with a photo and note", "A message sent to the whole team", "It relies on staff memory alone"],
          correct: 1,
        },
      },
    ],
  },
  {
    title: "Business continuity and emergencies",
    roles: [],
    sections: [
      {
        content:
          "## Emergency contacts\nFor fire, ambulance, or police in an actual emergency, call 000. Every staff member should know this without needing to look it up.\n\nFor anything that isn't urgent, the Police Assistance Line is 131 444. The direct line for our local station is kept on the wall by the office phone, and Marcus's own mobile is listed as the after hours contact on our licence, for anything that needs the licensee directly.\n\n**Photo block:** the emergency contacts card kept by the office phone, listing 000, the Police Assistance Line, and the local station number.",
        question: {
          q: "What number do you call for an actual emergency, fire, ambulance, or police?",
          options: ["131 444", "000", "The local station's direct line", "Marcus's mobile"],
          correct: 1,
        },
      },
      {
        content:
          "## If EFTPOS or Square goes down\nIf Square stops working, switch straight to a paper tab system and the backup manual EFTPOS terminal kept charged in the office. Don't wait to see if it comes back on its own before switching over, a stalled sale mid order is harder to unwind than starting the tab on paper from the start.\n\nPut the small \"cash preferred, card outage\" sign up at the door so guests know before they order, rather than finding out at the till.",
        question: {
          q: "What's the first thing to do if Square goes down mid service?",
          options: ["Wait a few minutes to see if it comes back", "Switch to the paper tab system and backup terminal", "Stop taking orders until it's fixed", "Ask guests to come back later"],
          correct: 1,
        },
      },
      {
        content:
          "## Supplier and trade backups\nWe keep a backup keg supplier and a backup spirits supplier on file, both live accounts rather than just a name on a card, in case our primary distributor's delivery is delayed. If you notice a delivery hasn't turned up when expected, flag it to the Duty Manager rather than assuming it'll sort itself out.\n\nFor anything physical that breaks, Brunswick Electrical Services covers electrical issues, Nicholson St Plumbing covers plumbing, and Merri Locksmiths runs a 24 hour line for lockouts or lock issues. These contacts are kept in the office folder along with our insurance broker's details.",
        question: {
          q: "Why does The Quiet Fox keep a backup keg and spirits supplier on file?",
          options: [
            "To get better prices by comparing suppliers",
            "In case the primary distributor's delivery is delayed",
            "Because the primary supplier is being phased out",
            "They're not actually used, just kept as contacts",
          ],
          correct: 1,
        },
      },
      {
        content:
          "## Who to go to and where details live\nDay to day, hazards, near misses, and anything operational go to whoever's Duty Manager on shift. Anything involving the licence itself, like a regulator query, goes through Marcus, who deals directly with Liquor Control Victoria, the state body that regulates our licence.\n\nInsurance details are kept with the physical policy documents in the office, referenced by policy number rather than repeated in training, so if you ever need them, that's where to point someone.",
        question: {
          q: "Who handles queries involving The Quiet Fox's liquor licence with the regulator?",
          options: ["Whoever's Duty Manager that night", "Marcus", "Any staff member who answers the office phone", "The insurance broker"],
          correct: 1,
        },
      },
    ],
  },
];

async function main() {
  const { data: existingVenue } = await admin.from("venues").select("id").eq("slug", SLUG).maybeSingle();
  if (existingVenue) {
    await admin.from("venues").delete().eq("id", existingVenue.id);
    const { data: authList } = await admin.auth.admin.listUsers();
    const u = authList.users.find((x) => x.email === OWNER_EMAIL);
    if (u) await admin.auth.admin.deleteUser(u.id);
    console.log("Removed previous block-p-quiet-fox venue");
  }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
  });
  if (authErr) throw authErr;

  const { data: bootstrapData, error: bootstrapErr } = await admin.rpc("bootstrap_owner", {
    p_auth_id: authData.user.id,
    p_venue_name: "The Quiet Fox",
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
    { name: "Bar Attendant", department: "FOH" },
    { name: "Glassie", department: "FOH" },
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
  // KNOWN BUG (confirmed in a prior validation pass on this codebase, see
  // MEMORY feedback_manager_role_login_gap): app_users.role = 'manager'
  // cannot log in via any current path -- the venue_roster RPC that powers
  // the staff PIN picker filters role = 'staff' only, and there's no
  // separate manager login route. The Duty Manager persona below is
  // therefore seeded with role: 'staff' (the established workaround), not
  // role: 'manager', even though "Duty Manager" is her staff_role_id scope.
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

  const baPinHash = await bcrypt.hash(BAR_ATTENDANT_PIN, 10);
  const { error: baErr } = await admin
    .from("app_users")
    .insert({
      venue_id: venueId,
      role: "staff",
      name: BAR_ATTENDANT_NAME,
      staff_role_id: roles["Bar Attendant"],
      pin_hash: baPinHash,
    })
    .select("id")
    .single();
  if (baErr) throw baErr;
  console.log("Seeded accounts: owner, Duty Manager, Bar Attendant");

  // Certificate types + role mapping. RSA is required for every role at
  // this venue (module content: "Every role at The Quiet Fox needs current
  // RSA certification, including the Glassie role"). No Food Handling cert
  // (no kitchen, no Food Safety Supervisor requirement per module content),
  // no WWCC (no programs involving minors).
  const certDefs = ["RSA"];
  const certTypeIds = {};
  for (const name of certDefs) {
    const { data, error } = await admin.from("certificate_types").insert({ venue_id: venueId, name }).select("id").single();
    if (error) throw error;
    certTypeIds[name] = data.id;
  }
  const certRoleMap = [
    ["RSA", "Duty Manager"],
    ["RSA", "Bar Supervisor"],
    ["RSA", "Bar Attendant"],
    ["RSA", "Glassie"],
  ];
  for (const [certName, roleName] of certRoleMap) {
    const { error } = await admin
      .from("certificate_type_roles")
      .insert({ certificate_type_id: certTypeIds[certName], role_id: roles[roleName] });
    if (error) throw error;
  }
  console.log("Seeded certificate types + role mapping");

  // Modules + sections + check questions. All modules go live — no
  // pending_approval module for this pass (Block O already exercised that
  // path; this pass is about the Ask Larder pipeline).
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
  console.log(`Seeded ${modules.length} modules, all live`);

  console.log("\nDone. The Quiet Fox demo venue ready:");
  console.log(`  Venue slug: ${SLUG}`);
  console.log(`  Owner login: http://localhost:3000/${SLUG}/owner/login`);
  console.log(`  Owner email/password: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  console.log(`  Staff login: http://localhost:3000/${SLUG}/login`);
  console.log(`  Duty Manager (${DUTY_MANAGER_NAME}) PIN: ${DUTY_MANAGER_PIN}  [role='staff' workaround, scope=Duty Manager]`);
  console.log(`  Bar Attendant (${BAR_ATTENDANT_NAME}) PIN: ${BAR_ATTENDANT_PIN}`);
  console.log(`\n  Live module IDs for ingestion:`);
  for (const [title, id] of Object.entries(moduleIds)) {
    console.log(`    ${id}  ${title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
