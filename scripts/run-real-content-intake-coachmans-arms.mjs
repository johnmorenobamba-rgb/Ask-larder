// Real guided content-intake run for coachmans-arms-wizard, 18 Sep 2026.
// Mirrors how Two Fires got its real sop_intake_answers on 13 Sep: this
// calls the same functions the /owner/onboarding/content-intake UI and its
// API routes call (scanForSensitiveContent, then an upsert matching
// answer/route.ts's shape, then curateTopic() per topic, the same function
// the /curate route calls) rather than reimplementing any of it. No
// server-only guard on any of these -- same reasoning as ingestModule.ts.
//
// Deliberately patchy, not exhaustive: about 80 of 114 possible question
// slots are answered, varying in length and confidence per topic, the way
// a real first walkthrough interview actually goes -- some questions get a
// full answer, some get "not really formalised," some get skipped
// entirely. Content is written to be consistent with what's already on
// file for this venue (existing module content, staff roster, the
// allergen SOP) -- not generic hospitality filler.
//
// Run with: npx tsx scripts/run-real-content-intake-coachmans-arms.mjs
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { scanForSensitiveContent } from "../src/lib/security/detectSensitiveContent.ts";
import { curateTopic } from "../src/lib/onboarding/curateTopic.ts";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const VENUE_ID = "79a9ea70-8302-4ab8-b501-8d27dc85457e"; // coachmans-arms-wizard

// key: {type, text}. Omitted keys are deliberately left unanswered.
const ANSWERS = {
  welcome_and_how_we_work: {
    trigger_and_scope: {
      type: "universal",
      text: "This is just the general orientation stuff, what the place is, who's who, how the shift actually runs day to day. Not specific to bar or kitchen, everyone gets the same one first.",
    },
    who_performs_it: {
      type: "universal",
      text: "Every new starter gets this, doesn't matter if they're floor, bar, or kitchen.",
    },
    procedure: {
      type: "universal",
      text: "Gary's family took the pub over in 2016, it's been trading since the 80s under a few different owners before that. Public bar with the TAB corner and keno, bistro out back, beer garden off the side, small function room upstairs for private bookings, and a gaming room that runs pretty separately from everything else. Full kitchen, lunch and dinner seven days.",
    },
    definition_of_done: {
      type: "universal",
      text: "Once someone's done all their modules, uploaded whatever certs apply to them, and signed off, they're ready for a real shift.",
    },
    escalation_contact: {
      type: "universal",
      text: "Dave for rostering and shift stuff generally, he's the one running the floor day to day.",
    },
  },

  rsa_and_responsible_service: {
    trigger_and_scope: {
      type: "universal",
      text: "Comes up every time someone's serving alcohol, so bar and floor mainly. Covers checking RSA is current, reading intoxication, refusing service, that kind of thing.",
    },
    who_performs_it: {
      type: "universal",
      text: "Anyone on bar or floor needs a current RSA before they pour anything. Steph checks it when people start.",
    },
    procedure: {
      type: "universal",
      text: "Watch for the obvious signs, slurring, losing balance, getting loud or argumentative, spilling drinks. One on its own isn't much, a couple together and you slow down or stop pouring. Go with what you actually see, not what someone tells you. Stay calm when you refuse someone, don't get drawn into it.",
    },
    safety_critical: {
      type: "universal",
      text: "Yeah, definitely, a bad refusal that turns physical is the real risk. There's a duress alarm under the main till for that, use it, no need to explain first, it goes straight to a monitored security service.",
    },
    definition_of_done: {
      type: "universal",
      text: "Not really a single finish line for this one, it's ongoing every shift you're pouring.",
    },
    escalation_contact: {
      type: "universal",
      text: "We don't roster one fixed marshal every night, whoever's most senior on, usually Steph or Dave when either's working. If you're not sure who that is, ask, don't guess.",
    },
  },

  food_handling_and_allergens: {
    trigger_and_scope: {
      type: "universal",
      text: "Whenever a guest asks about an allergy or intolerance, basically any table interaction really given how big the menu is.",
    },
    who_performs_it: {
      type: "universal",
      text: "Floor staff take the question, kitchen confirms, Vinh's the one who really knows the menu inside out.",
    },
    materials: { type: "universal", text: "Nothing extra, it's really just knowing who to ask." },
    procedure: {
      type: "universal",
      text: "Menu's over 30 items once you count sides, sauces, specials, and the specials board changes every couple of weeks. Too much to memorise a fixed list. So it's process not memory, know the main risk categories, gluten, dairy, nuts basically, and always confirm the specific dish with the kitchen rather than answering from what you think you know.",
    },
    safety_honesty_check: {
      type: "safety_honesty",
      text: "Honestly, there's no single written allergen record covering every dish right now, most of that knowledge is in Vinh's head. If he's not on and nobody else can confirm confidently, the honest thing is to tell the guest we're checking, not guess on their behalf. That's a real gap, not something to paper over.",
    },
    definition_of_done: {
      type: "universal",
      text: "The guest gets a confirmed answer from the kitchen before the order goes in, not before you feel confident about it yourself.",
    },
    escalation_contact: { type: "universal", text: "Vinh, or Meg if he's not on." },
  },

  food_safety_fundamentals: {
    trigger_and_scope: {
      type: "universal",
      text: "Every service, we're a full kitchen cooking from raw seven days, that puts us in a higher category than somewhere just doing packaged snacks.",
    },
    who_performs_it: { type: "universal", text: "Whole kitchen team, but Meg's the Food Safety Supervisor on our certificate." },
    materials: {
      type: "universal",
      text: "Fridge thermometers, the cleaning whiteboard Vinh keeps updated, and the temp log.",
    },
    procedure: {
      type: "universal",
      text: "Fridge and food temps get checked and logged twice a day, opening and close, every day including breakfast prep, not just when someone remembers. Danger zone is 5 to 60 degrees, under 2 hours out of range it can go back in or get used, 2 to 4 hours it has to be used immediately and never go back in the fridge, past 4 hours it's binned. Deliveries get checked against the order and temp-checked before accepting, if something's off, flag it to Vinh or Meg, don't accept it.",
    },
    safety_critical: {
      type: "universal",
      text: "Yes, the temp danger zone stuff basically, getting that wrong is how people get sick.",
    },
    escalation_contact: { type: "universal", text: "Vinh day to day, Meg for the certificate/compliance side specifically." },
  },

  equipment_operating_and_cleaning: {
    trigger_and_scope: {
      type: "universal",
      text: "Covers the general stuff, till hardware, the payment terminal, glasswashers, anything electrical or mechanical that isn't cellar or kitchen specific, those have their own modules.",
    },
    who_performs_it: { type: "universal", text: "Whoever's using it day to day, but nobody fixes it themselves." },
    procedure: {
      type: "universal",
      text: "Honestly we don't have a proper written manual for this beyond report and escalate. If something's not working right, tell your Duty Manager, don't try to fix it yourself even if it looks simple, and don't just work around it quietly either.",
    },
    troubleshoot_then_escalate: {
      type: "troubleshoot_escalate",
      text: "First thing is just tell the Duty Manager, they'll decide if it needs a technician called out. We don't have a single go-to repair contact written down for general equipment, Dave usually knows who to call for what.",
    },
    escalation_contact: { type: "universal", text: "Whoever's Duty Manager on shift." },
  },

  cellar_and_gas_safety: {
    trigger_and_scope: {
      type: "universal",
      text: "Anything to do with the cellar, gas cylinders, keg changeovers, or the tap lines. This is the one we take most seriously safety-wise.",
    },
    who_performs_it: {
      type: "universal",
      text: "Robbo's trained across the whole setup and is really the only one who's had proper gas safety training. Ash and Chevy cover keg changeovers when he's off but that's just the physical changeover, not the gas safety side.",
    },
    materials: {
      type: "universal",
      text: "Gas monitoring and alarm, audible and visible, both inside the cellar and at the entry. Bubble solution for leak testing. A trolley or lifting device for kegs, don't want people carrying those by hand.",
    },
    procedure: {
      type: "universal",
      text: "Only go in if you actually need to and know what you're doing, three points of contact on the ladder always, keep the space clear of trip hazards. Cylinders and lines get leak tested with bubble solution regularly and the whole setup gets a proper maintenance check on schedule, though if I'm honest the exact interval isn't written down anywhere central, it's in Robbo's head mostly.",
    },
    safety_critical: {
      type: "universal",
      text: "This is the big one. CO2 and nitrogen are odourless and colourless, in an enclosed space like our cellar a leak can push the breathable air out with zero warning. We've had real deaths in Victorian pub cellars from exactly this, it's not theoretical. If the alarm goes off get out immediately, never send someone in after a collapsed colleague without breathing gear, call 000 straight away.",
    },
    definition_of_done: {
      type: "universal",
      text: "Changeover's done properly when the new keg's connected, no leaks on the bubble test, and the line's pouring clean. For the safety side there isn't really a single 'done', it's ongoing vigilance.",
    },
    escalation_contact: { type: "universal", text: "Robbo first, Dave if Robbo's not around and it can't wait." },
    troubleshoot_then_escalate: {
      type: "troubleshoot_escalate",
      text: "If a line's pouring flat or off, first thing is just don't touch it if you're not confident, that's Robbo's area. If Robbo's not on and it genuinely can't wait, Dave makes the call on what to do, including whether it's worth calling someone out.",
    },
    safety_honesty_check: {
      type: "safety_honesty",
      text: "This one isn't really about a customer allergy, it's staff safety, so the honest answer is: gas training hasn't been formally extended past Robbo yet, and that's a real gap we should probably close rather than assume is fine forever.",
    },
  },

  workplace_health_and_safety: {
    trigger_and_scope: {
      type: "universal",
      text: "General day to day safety stuff that isn't already covered somewhere more specific, manual handling, chemicals, glass, hazard reporting.",
    },
    who_performs_it: { type: "universal", text: "Applies to everyone, floor, bar, kitchen." },
    materials: { type: "universal", text: "Incident folder's in the office, cleaning chemicals are in the locked cupboard behind the kitchen." },
    procedure: {
      type: "universal",
      text: "No formal manual handling program here, general rule is lift with your knees not your back and ask for help with anything heavy, kegs especially. Chemicals stay in their original labelled containers, never decanted into something unlabelled. Glass collection's shared across whoever's on the floor, no dedicated glassy, carry on a tray not stacked by hand, sweep broken glass immediately and tell people nearby first.",
    },
    safety_critical: {
      type: "universal",
      text: "Chemicals in unlabelled containers is the one I'd flag hardest, and lifting kegs badly, that's a real back injury risk.",
    },
    escalation_contact: { type: "universal", text: "Your Duty Manager, and write it in the incident folder too if it's a hazard or near miss, not just a verbal mention." },
    behavioral_read: {
      type: "behavioral_read",
      text: "Last real one was someone nearly slipping near the glass collection point when a tray wasn't cleared in time, what you notice first is usually just broken glass or a wet patch nobody's flagged yet.",
    },
  },

  cash_handling_and_reconciliation: {
    trigger_and_scope: { type: "universal", text: "Every shift that touches the till, basically bar and floor." },
    who_performs_it: { type: "universal", text: "Whoever's on the till, but safe drops and reconciliation are Duty Manager." },
    materials: { type: "universal", text: "The two tills, the safe, a small lock box in the office for petty cash." },
    procedure: {
      type: "universal",
      text: "Float's $500 split across the two tills, count it against that at the start of your shift and flag any discrepancy straight away, not at the end of the night. Safe drops happen roughly hourly on a busy night, done by the Duty Manager, keeps cash in the till from building up too much. EFTPOS gets reconciled against the till nightly by the closing manager, every night we trade, not just busy ones.",
    },
    definition_of_done: { type: "universal", text: "Till balances against the float, EFTPOS reconciles, and any discrepancy's been flagged and noted, not just quietly absorbed." },
    escalation_contact: { type: "universal", text: "Duty Manager on shift for anything during service." },
  },

  closing_procedures_and_premises_security: {
    trigger_and_scope: { type: "universal", text: "End of night, every closing shift." },
    who_performs_it: { type: "universal", text: "Closing Duty Manager, usually Dave, sometimes Steph." },
    procedure: {
      type: "universal",
      text: "Till reconciliation and stock lockup by the closing manager, every night regardless of how it went. Last drinks around 12:30 for a 1am close, though I'll be honest, when we asked around, one person said 12:30 and another said 12:45, so treat 12:30 as the number to work from unless told otherwise on the night. CCTV isn't watched live, it's pulled and reviewed only if something's actually happened.",
    },
    safety_critical: { type: "universal", text: "Making sure the premises is actually secure before everyone leaves, doors locked, alarm set properly." },
    escalation_contact: { type: "universal", text: "Whoever's the closing Duty Manager that night." },
    troubleshoot_then_escalate: {
      type: "troubleshoot_escalate",
      text: "If the alarm or a lock isn't behaving the way it should at close, the right move is to call whoever's on the restricted list, Gary, Dave, or Steph, not to try a workaround yourself.",
    },
  },

  business_continuity_and_emergencies: {
    trigger_and_scope: { type: "universal", text: "Anything that stops normal service, payment system down, running out of stock unexpectedly, that kind of thing." },
    who_performs_it: { type: "universal", text: "Whoever notices it first flags it, Duty Manager actually handles it." },
    materials: { type: "universal", text: "We keep contacts on file for an electrician and the payment system provider, Dave has those." },
    procedure: {
      type: "universal",
      text: "If the payment system drops mid service, tell Dave straight away rather than troubleshooting it yourself. If we're about to run dry on a keg on a big night, the practical fix has been ringing the pub up the road and borrowing one, paying it back next delivery. It's informal, not a standing contract, worked out case by case. That call's Dave's to make, not something floor staff or a bar attendant should organise themselves.",
    },
    definition_of_done: { type: "universal", text: "Not really a single finish line, more that the right person's been told and it's being handled." },
    escalation_contact: { type: "universal", text: "Dave for most things, Gary for anything bigger, insurance stuff goes through Dave and Gary's accountant, not floor staff." },
    troubleshoot_then_escalate: {
      type: "troubleshoot_escalate",
      text: "Payment system down: check it's actually the terminal and not just a card issue, then call Dave. He's got the provider's support contact. We haven't had a situation serious enough to need the electrician recently so I can't say exactly how that call goes in practice.",
    },
  },

  happy_hour_and_promotional_pricing: {
    trigger_and_scope: { type: "universal", text: "Tuesday to Thursday, 5 to 7pm, that's our only real promotional pricing." },
    who_performs_it: { type: "universal", text: "Bar staff pouring during that window." },
    procedure: {
      type: "universal",
      text: "Two dollars off house tap beer and house wine only, not spirits, cocktails, or bottled craft. We deliberately keep it simple, no two-for-ones, no free drinks, nothing built to get people drinking faster than normal. That's on purpose, not just a cost thing, a flat time-boxed discount is a lot lower risk than an unlimited deal.",
    },
    definition_of_done: { type: "universal", text: "Discount applies correctly at the till during the window, nothing outside it." },
    escalation_contact: { type: "universal", text: "Dave or Steph if you're ever unsure whether it's running on a given day." },
  },

  crowd_control_and_door_security: {
    trigger_and_scope: { type: "universal", text: "Friday and Saturday nights, and Thursday when there's a band on." },
    who_performs_it: { type: "universal", text: "Contracted crowd controllers, not our regular staff, so different faces depending on the night. Usually two, sometimes three." },
    procedure: {
      type: "universal",
      text: "ID scanning at the door only runs Friday and Saturday, other nights staff still check ID normally at the bar, just no scanner. Bag checks happen on the busier nights when controllers are on, not as a nightly rule. Right now controllers carry their own radios and bar staff don't share a channel, so if you need the door during a busy shift you have to get someone's attention across the room, there's no faster way currently, that's a real gap worth knowing about rather than assuming.",
    },
    safety_critical: { type: "universal", text: "Anything escalating at the door, that communication gap makes it slower to get help there than it should be." },
    escalation_contact: { type: "universal", text: "Send someone over in person if something urgent's happening near the door." },
    behavioral_read: {
      type: "behavioral_read",
      text: "Last real flare-up, what you notice first is usually raised voices near the entry before anything physical, and the controllers are generally already moving on it by the time bar staff clock it.",
    },
  },

  trading_hours_licence_and_capacity: {
    trigger_and_scope: { type: "universal", text: "Comes up with last drinks, closing, and whenever a guest asks how late we're open." },
    who_performs_it: { type: "universal", text: "Everyone should know the basic hours, Dave's the one with the actual licence numbers." },
    procedure: {
      type: "universal",
      text: "10am to 1am Thursday through Saturday under a late night authorisation, 10am to 11pm Sunday through Wednesday. Patron capacity's a fixed number on the licence covering bar, bistro, beer garden, and function room combined, not something to repeat from memory even if you've heard a figure mentioned before, check the actual licence or ask Dave. Beer garden's got an informal noise curfew around 10pm, no formal process, whoever's on the floor just wanders out for a quiet word if it's getting loud.",
    },
    safety_critical: { type: "universal", text: "Capacity limit for fire safety reasons mainly." },
    escalation_contact: { type: "universal", text: "Dave for the exact licence figures." },
  },

  restricted_content_safe_and_alarm_access: {
    trigger_and_scope: {
      type: "universal",
      text: "Only comes up for the three people who actually hold this, Gary, Dave, and Steph. Everyone else never needs to think about it.",
    },
    who_performs_it: { type: "universal", text: "Gary, Dave, and Steph only, nobody else has it, and it's not written down anywhere outside those three." },
    materials: {
      type: "universal",
      text: "A physical safe and a separate alarm keypad, both in the office area. Just describing what they are, not how to open them.",
    },
    procedure: {
      type: "universal",
      text: "Comes up at open and close mainly, whoever's on and holds it handles it. Gary reviews and updates it periodically, especially if any of the three people holding it changes.",
    },
    definition_of_done: { type: "universal", text: "Premises properly secured, alarm set, safe closed and confirmed locked." },
    access_control: {
      type: "access_control",
      text: "If you're one of the three and don't currently have it, get it directly from Gary, never from another Duty Manager or Bar Supervisor. If none of the three are on and it's genuinely needed, that's an escalation to Gary directly, not something to work around.",
    },
  },

  gaming_machine_operation_and_responsible_gambling: {
    trigger_and_scope: { type: "universal", text: "The gaming room, runs pretty separately from the rest of the venue." },
    who_performs_it: {
      type: "universal",
      text: "Honestly this is mostly handled through an outside compliance provider, not by venue staff. Dave and Gary work directly with them.",
    },
    procedure: {
      type: "universal",
      text: "If a guest or a new team member asks a detailed question about the machines or responsible gambling, don't try to answer it yourself even if you think you know, escalate to Dave or Gary. This is genuinely the current state, not something we've written a proper staff procedure for yet.",
    },
    escalation_contact: { type: "universal", text: "Dave or Gary, they liaise with the compliance provider directly." },
  },
};

let answeredCount = 0;
let skippedForSensitive = 0;

for (const [topicKey, questions] of Object.entries(ANSWERS)) {
  for (const [questionKey, { type, text }] of Object.entries(questions)) {
    const findings = scanForSensitiveContent(text);
    if (findings.length > 0) {
      console.error(`BLOCKED (sensitive content) ${topicKey}/${questionKey}: ${findings[0].message}`);
      skippedForSensitive++;
      continue;
    }
    const { error } = await supabase.from("sop_intake_answers").upsert(
      {
        venue_id: VENUE_ID,
        topic_key: topicKey,
        question_key: questionKey,
        question_type: type,
        answer_text: text,
        attachment_storage_path: null,
        attachment_extracted_text: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "venue_id,topic_key,question_key" },
    );
    if (error) {
      console.error(`FAILED to save ${topicKey}/${questionKey}: ${error.message}`);
      continue;
    }
    answeredCount++;
  }
}

console.log(`\nSaved ${answeredCount} intake answers (${skippedForSensitive} blocked by sensitive-content scan) across ${Object.keys(ANSWERS).length} topics.\n`);

// Now curate each topic for real -- same function the /curate route calls.
const { data: existingModules } = await supabase.from("modules").select("id, topic_key").eq("venue_id", VENUE_ID);
const moduleIdByTopic = new Map((existingModules ?? []).map((m) => [m.topic_key, m.id]));

const results = [];
for (const topicKey of Object.keys(ANSWERS)) {
  process.stdout.write(`Curating ${topicKey}... `);
  try {
    const result = await curateTopic(supabase, VENUE_ID, topicKey, moduleIdByTopic.get(topicKey));
    console.log(`OK -- module ${result.moduleId}, ${result.chunkCount} chunks embedded.`);
    results.push({ topicKey, ok: true, moduleId: result.moduleId, chunkCount: result.chunkCount });
  } catch (err) {
    console.log(`FAILED: ${err instanceof Error ? err.message : err}`);
    results.push({ topicKey, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}

console.log("\n=== SUMMARY ===");
for (const r of results) {
  console.log(r.ok ? `OK    ${r.topicKey} (${r.chunkCount} chunks)` : `FAILED ${r.topicKey}: ${r.error}`);
}
