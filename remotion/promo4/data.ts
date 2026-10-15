// Every string and number the product screens show in promo v4, in one place. Strings marked APP
// are copied from the real app code (path given); strings marked CAPTURE are read off the demo
// venue capture library (Saltbush Corner Kitchen, invented staff). The asserts at the bottom fail
// the bundle if a value drifts from what the story says.

export const VENUE = "Saltbush Corner Kitchen"; // CAPTURE: demo venue
export const STAFF = { asker: "Felix Anand", lead: "Leila Mercer" }; // CAPTURE: invented demo staff

// Hook and pain beats: the three staff questions (chit shaped bubbles)
export const Q = {
  fryer: "How do I change the fryer oil?", // CAPTURE: ask-larder-useful-3
  fridges: "Have the fridges been checked?",
  cellar: "Why is the beer pouring flat?",
};

// Pain 1: a message on the owner's phone on their day off
export const PHONE = {
  time: "10:42",
  day: "Sunday 12 October",
  from: STAFF.asker,
  lines: ["Sorry to bother you on your day off", Q.fryer],
};

// Ask Larder panel. APP: src/components/staff/AskLarderChat.tsx
export const ASK = {
  title: "Ask Larder",
  close: "Close",
  placeholder: "Type your question",
  button: "Ask",
  another: "Ask another question",
  // CAPTURE: ask-larder-useful-3, the real recorded answer from the demo venue
  fryerAnswer:
    "Here's how to change the fryer oil: 1. Turn the fryer off and let the oil cool for at least one hour. Never move hot oil. 2. Put the oil tub under the drain tap, open the tap slowly and let the oil drain out. 3. Wipe the tank with paper towel, then wash it with hot soapy water, rinse and dry it fully. 4. Close the tap, fill to the fill line with fresh oil, and switch the fryer back on. 5. Write the date on the fryer log.",
  safeQuestion: "Where is the key to the safe?",
  // APP: the locked fallback wording, src/app/api/staff/ask-larder/route.ts, with [X] = "the safe"
  safeAnswer: "Ask your supervisor for assistance, as they have access to the safe.",
  shortAnswerChars: 60, // APP: SHORT_ANSWER_CHARS; longer answers render in Inter, shorter in Space Grotesk
};

// Forms. APP: src/components/staff/GenericComplianceForm.tsx and TemperatureLogForm.tsx
export const FORMS = {
  hubTitle: "Compliance forms", // CAPTURE: forms-hub-by-cadence
  cadences: ["Every shift", "Daily", "Weekly"],
  // CAPTURE: the real three tap recording (three-taps-s1.mp4, claims ledger T1) uses this form
  checklistTitle: "Kitchen cleaning and sanitising",
  checklistIntro: "Tick off the cleaning and sanitising done today, area by area.",
  checklistCadence: "Once a day. About 6 minutes. Due by 10pm.",
  checklistNote: "A recommended record. It records kitchen cleaning and sanitising. A written schedule is one way to show it. Check what your venue must keep with your local council or regulator.",
  defaultList: "Default list, review before use.",
  section: "Cleaning done today",
  checkCount: 11,
  checks: ["Clean and sanitise: Pizza oven", "Clean and sanitise: Fryer station", "Clean and sanitise: Grill", "Clean and sanitise: Dish pit"], // the first four of eleven, the only ones on screen
  recommended: "Recommended record",
  doneCard: { line: "Pass. 11 of 11 checks passed", meta: "3:27pm by Felix Anand", correct: "Correct this record" },
  doneFoot: "Done for today. You can correct the latest record or save another one.",
  hubCard: { title: "Kitchen cleaning and sanitising", due: "Due by 10pm." },
  markRest: "Mark the rest as pass",
  saveRecord: "Save record",
  recordSaved: "Record saved.",
  options: ["Pass", "Fail", "Not applicable"],
  unit: { name: "Walk in cool room", limit: "Keep at 5°C or colder", reading: "8", readingC: 8 }, // CAPTURE: temperature-log-saved
  outOfRange: (limit: string, reading: string) => `Out of range. ${limit}, this reading is ${reading}°C.`,
  noteLabel: "What did you do about it? (required)",
  quickNotes: ["Moved food to another unit", "Discarded the food", "Called a technician", "Will recheck in 30 minutes"],
  blocker: "Write what you did about each out of range reading before you save.",
  saveReading: "Save reading",
  savedFlagged: "1 reading saved. 1 was out of range and flagged for the owner.",
  recordsTitle: "Compliance records", // CAPTURE: owner-records-list
};

// Stations. APP: src/app/(staff)/[venueSlug]/station/[qrCodeSlug]/page.tsx and troubleshooting/page.tsx.
// DB (read only query, 15 Oct 2026): demo pub "The Coachman's Arms Hotel", station "Cellar", 5 approved FAQs, 5 approved issues.
export const STATION = {
  venue: "The Coachman's Arms Hotel",
  name: "Cellar",
  heading: "What do you need?",
  cards: [
    { title: "Training", text: "Work through your training for this station." },
    { title: "FAQs", text: "5 quick answers for this station." },
    { title: "Troubleshooting", text: "5 known issues and how to fix them." },
  ],
  unsafe: "Something felt unsafe?",
  labelFoot: "Scan for training", // APP: owner label page
  troubleshootingTitle: "Troubleshooting",
  back: "Back to station",
  issues: [
    { title: "Gauge needle stuck or reading inaccurately", tryThis: "Tap the gauge lightly to rule out a stuck needle and compare its reading against how the system is actually performing (pour quality, tank fill history).", then: "If the gauge appears stuck, cracked, or clearly inaccurate, take the regulator out of service and flag it for calibration or replacement by a technician. Don't rely on a questionable gauge to judge whether pressure is safe." },
    { title: "Regulator won't hold or show pressure", tryThis: "Check that the tank valve is fully open and the tank itself isn't empty. Inspect the connection between the tank and regulator for a proper seal. Listen and check with soapy water at fittings for a leak.", then: "If the tank has gas but the regulator still won't hold pressure, or you find a leak at a fitting you're not authorized to repair, shut off the gas supply and escalate to a supervisor or technician rather than continuing to use the line." },
  ],
  issue: {
    title: "Pours are flat or weak",
    tryThis: "Check the output gauge reading against the normal working range for that station. Confirm the tank isn't near empty. Check that the shutoff valve is fully open and lines aren't kinked or blocked.",
    then: "If gauge readings look normal and lines are clear but pours are still flat, don't adjust the regulator yourself. Log the issue and have a trained staff member or technician inspect the full line, since the cause is often downstream of the regulator.",
    escalation: "If this doesn't fix it, stop and ask your supervisor for help.", // APP: shown when escalation_required
  },
  laterIssues: ["Excessive foaming at the tap", "Hissing sound or visible frost at a fitting"],
  otherIssues: ["Gauge needle stuck or reading inaccurately", "Regulator won't hold or show pressure", "Excessive foaming at the tap", "Hissing sound or visible frost at a fitting"],
  // QR in the film encodes the live site root (verified 200), not a demo venue page a viewer cannot open
  qrTarget: "https://asklarder.com.au/",
};

// Close
export const CONTACT = {
  cta: "Book a walk through",
  url: "asklarder.com.au",
  phone: "0477 120 624",
  email: "hello@asklarder.com.au",
};

// ---- asserts: data agrees with the story ----
const assert = (c: boolean, m: string) => {
  if (!c) throw new Error(`promo4 data: ${m}`);
};
assert(FORMS.checks.length <= FORMS.checkCount, "visible checks are a subset of the 11");
assert(ASK.safeAnswer.length > ASK.shortAnswerChars, "the safe answer renders in Inter, as the app would");
assert(STATION.cards[2].text.startsWith("5 ") && STATION.otherIssues.length + 1 === 5, "5 issues shown, 5 in the database");
assert(FORMS.unit.readingC > 5, "the cool room reading must be out of range for a 5°C limit");
assert(/^0\d{3} \d{3} \d{3}$/.test(CONTACT.phone), "phone in 4 3 3 grouping");
const ALL = JSON.stringify({ Q, PHONE, ASK, FORMS: { ...FORMS, outOfRange: FORMS.outOfRange(FORMS.unit.limit, FORMS.unit.reading) }, STATION, CONTACT });
assert(!/[–—]/.test(ALL), "no en or em dashes in any on screen string");
assert(!/!/.test(ALL), "no exclamation marks");
