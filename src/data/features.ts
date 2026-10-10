import type { ShotKey } from "./featureShots";

// The single source of truth for the hub cards, the feature subpages, related links, previous and next links, the sitemap,
// the "All features" strip and page metadata. Copy follows CLAUDE.md: plain verbs, sentence case, no dashes.
// Compliance wording traces to Notion Sources & References (section 1, FSANZ Standard 3.2.2A; sections 3 and 4, RSA and
// working with children checks vary by state) and to scratch/compliance-hardening3-report/C1-claims-ledger.md.

export type FeatureIconName = "chat" | "book" | "forms" | "badge" | "dashboard" | "station";

/** x and y are percentages of the image width and height. */
export type Callout = { x: number; y: number; label: string };

export type FeatureFigure = {
  title: string;
  body: string;
  shot: ShotKey;
  alt: string;
  caption: string;
  callouts?: Callout[];
};

export type Feature = {
  slug: string;
  icon: FeatureIconName;
  /** Short name for the strip, breadcrumb and related links. */
  name: string;
  card: { title: string; body: string; linkText: string };
  seo: { title: string; description: string };
  h1: string;
  subhead: string;
  problem: string[];
  does: string[];
  steps: FeatureFigure[];
  /** One more screenshot after the three steps, where a fourth image earns its place. */
  extra?: FeatureFigure;
  helps: { owner: string; newHire: string };
  related: [string, string];
  faq?: { q: string; a: string }[];
  /** Placeholder until a venue agrees to be quoted. Never invent one. */
  quoteSlot: string;
};

const QUOTE_TODO = "TODO: add a real venue quote here once a venue agrees to be named. No invented quotes.";

export const FEATURES: Feature[] = [
  {
    slug: "ask-larder",
    icon: "chat",
    name: "Ask Larder",
    card: {
      title: "Answers mid shift, from your own procedures",
      body: "A new hire asks a question and gets your venue's steps, at any hour.",
      linkText: "See how Ask Larder works",
    },
    seo: {
      title: "Ask Larder: answers mid shift from your own procedures",
      description:
        "Staff ask a question on shift and get plain steps from your venue's own approved procedures. Anything that needs a key, code or login goes to a supervisor.",
    },
    h1: "Answers mid shift, from your own approved procedures",
    subhead: "A new hire on their own at close can ask how to change the fryer oil and get your steps, not a guess.",
    problem: [
      "A new hire is closing alone for the first time and the manager is not picking up.",
      "The answer sits in a binder nobody opens, or in one chef's head.",
    ],
    does: [
      "Answers in plain steps, at any hour.",
      "Answers only from procedures you have approved. Other venues are never searched.",
      "Sends anything that needs a key, code or login to a supervisor.",
    ],
    steps: [
      {
        title: "Open Ask Larder from the home screen",
        body: "Staff tap Ask something on the venue iPad or their phone. There is nothing to install.",
        shot: "ask-larder/staff-home",
        alt: "The staff home screen on a tablet with a Your modules ring, certificates, compliance forms and a dark Ask something tile",
        caption: "The staff home screen. Ask something is one tap away. Example venue with invented names.",
        callouts: [{ x: 73, y: 41, label: "Ask something opens the chat" }],
      },
      {
        title: "Ask in plain words",
        body: "Staff type a question such as how to change the fryer oil. Ask Larder replies with numbered steps taken from your own approved procedure.",
        shot: "launch/ask-answer",
        alt: "The Ask Larder chat on a phone. The question is how to change the fryer oil, and the answer lists the steps: let the oil cool for an hour, drain it, clean and dry the tank, refill to the line and write the date on the fryer log",
        caption: "An answer from the Ask Larder chat. Example venue with invented names.",
        callouts: [{ x: 9, y: 31, label: "Steps come from your approved procedure" }],
      },
      {
        title: "See what staff are asking",
        body: "Questions that go to a supervisor show on your dashboard, so you can see where a procedure is missing.",
        shot: "ask-larder/owner-questions",
        alt: "Two owner dashboard tiles: near miss reports with two unresolved, and escalations with two unresolved",
        caption: "Escalations on the owner dashboard. Example venue with invented names.",
        callouts: [{ x: 92, y: 80, label: "Questions sent to a supervisor" }],
      },
    ],
    helps: {
      owner: "You see what staff ask and where your procedures have gaps. You decide what to add.",
      newHire: "A new hire gets an answer in the moment instead of guessing or waiting until tomorrow.",
    },
    related: ["training-modules", "stations"],
    faq: [
      {
        q: "Can the chatbot make something up?",
        a: "Ask Larder answers only from content you have approved. If the answer is not there, it says so and points to a supervisor. For anything that needs a key, a code or a login, it tells the person to ask their supervisor. It has been tested against attempts to talk it out of these rules.",
      },
      {
        q: "Does it need an internet connection?",
        a: "Yes. Larder runs in the browser on the iPad you already have, and it needs a connection to save records and answer questions.",
      },
    ],
    quoteSlot: QUOTE_TODO,
  },
  {
    slug: "training-modules",
    icon: "book",
    name: "Training and approval",
    card: {
      title: "Training built from your own procedures",
      body: "Role based modules with check questions. Nothing goes live until you approve it.",
      linkText: "See how training and approval work",
    },
    seo: {
      title: "Training built from your own procedures, approved by you",
      description:
        "Role based training modules with check questions, written from your venue's own procedures. Every module waits for the owner's approval before staff see it.",
    },
    h1: "Training built from your own procedures, approved by you",
    subhead: "Role based modules with check questions. Nothing reaches staff until you have approved it.",
    problem: [
      "Training lives in one manager's head, a binder nobody reads or last week's group chat.",
      "Every new hire learns a slightly different version of the same shift.",
      "When someone experienced leaves, their knowledge leaves with them.",
    ],
    does: [
      "Turns your own procedures and photos into short modules with check questions.",
      "Shows each new hire the training for their role.",
      "Holds every module until the owner approves it, and asks staff to confirm each update.",
    ],
    steps: [
      {
        title: "We build from your procedures",
        body: "After one visit to your venue we write modules from your own procedures and photos, then edit them by hand before you see them.",
        shot: "training-modules/module-section",
        alt: "A training module section on a tablet about washing hands for twenty seconds, with a Continue button",
        caption: "One section of a module. Example venue with invented names.",
        callouts: [{ x: 32, y: 79, label: "Staff continue one section at a time" }],
      },
      {
        title: "You review and approve",
        body: "Each module waits in your approval list. You read what staff will read, then approve it. Nothing goes live without that.",
        shot: "training-modules/owner-approval",
        alt: "The owner modules list on a phone with a closing and cleaning module marked pending approval and an Approve button",
        caption: "A module waiting for the owner. Example venue with invented names.",
        callouts: [{ x: 88, y: 29, label: "Approve puts it live" }],
      },
      {
        title: "Staff learn and answer check questions",
        body: "New hires read a section at a time and answer short questions before they move on.",
        shot: "training-modules/check-question",
        alt: "A check question on a tablet asking how long to wash your hands for, with four answers to choose from",
        caption: "A check question. Example venue with invented names.",
        callouts: [{ x: 62, y: 22, label: "One question at a time" }],
      },
    ],
    extra: {
      title: "Larder suggests what your procedures missed",
      body: "When staff keep asking the same uncovered question, or the same hazard keeps turning up in near miss reports, Larder drafts an addition to the right module. You approve it or dismiss it. Nothing reaches staff on its own.",
      shot: "launch/suggestion-feed",
      alt: "An example Larder suggestion, drafted from staff near miss reports, with Approve and Dismiss buttons",
      caption: "An example draft built from three near miss reports, with the evidence attached.",
    },
    helps: {
      owner: "Training is the same for every hire and built from how your venue actually runs. You approve it, so you know what staff are told.",
      newHire: "A new hire gets the same training the last hire got, matched to their role.",
    },
    related: ["ask-larder", "certificates-signoff"],
    faq: [
      {
        q: "Do we have to build the training ourselves?",
        a: "No. We do it with you, starting with one visit to your venue. We turn your own procedures and photos into training modules, and you review every one before it goes live.",
      },
      {
        q: "What happens when a procedure changes?",
        a: "You publish an update with a note and see who has not read it yet. Staff see the update before anything else and confirm they have read it.",
      },
    ],
    quoteSlot: QUOTE_TODO,
  },
  {
    slug: "compliance-forms",
    icon: "forms",
    name: "Compliance forms",
    card: {
      title: "Daily records in a few taps",
      body: "Checklists and temperature logs on the iPad already in your kitchen.",
      linkText: "See how compliance forms work",
    },
    seo: {
      title: "Compliance forms: daily food safety records in a few taps",
      description:
        "Checklists and temperature logs on the iPad in your kitchen, kept with the time, the person and what was done. Helps you meet and evidence FSANZ Standard 3.2.2A record keeping.",
    },
    h1: "Daily food safety records in a few taps",
    subhead: "Checklists and temperature logs on the iPad already in your kitchen, kept with the time, the person and what was done.",
    problem: [
      "FSANZ Standard 3.2.2A, in force since December 2023, means many Australian food businesses need to show their food safety controls work. Which parts apply depends on your food business category.",
      "Forms every shift, every day, every week and every month add up, and all of it has to be filed.",
    ],
    does: [
      "Groups forms by how often each is due. A checklist where everything passes takes three taps from the hub.",
      "Asks for a short note when a check or reading fails, and keeps the note with the record.",
      "Lets owners print records or download them as a CSV file.",
    ],
    steps: [
      {
        title: "Open the forms hub",
        body: "Forms are grouped by every shift, daily, weekly, monthly and when it happens. Overdue forms show on screen.",
        shot: "compliance-forms/forms-hub",
        alt: "The Larder forms hub on a tablet, grouped by every shift and daily, with cards marked Done, In progress and Not started",
        caption: "The forms hub, grouped by how often each form is due. Example venue with invented names.",
        callouts: [{ x: 24, y: 22, label: "Grouped by how often a form is due" }],
      },
      {
        title: "Tap through the checklist",
        body: "Tap Mark the rest as pass, then fail anything that needs attention. Nothing is typed on a checklist where everything passes.",
        shot: "compliance-forms/checklist",
        alt: "A kitchen opening checklist on a tablet with a Mark the rest as pass button and Pass, Fail and Not applicable choices for each check",
        caption: "A kitchen opening checklist. Example venue with invented names.",
        callouts: [{ x: 78, y: 44, label: "Mark the rest as pass" }],
      },
      {
        title: "Add a note when something fails",
        body: "A failed check asks what was done about it. The record does not save until there is a note.",
        shot: "compliance-forms/fail-note",
        alt: "A checklist with one failed check and a red prompt asking what was done about it before the Save record button",
        caption: "A failed check needs a note before it saves. Example venue with invented names.",
        callouts: [
          { x: 96, y: 38, label: "The failed check" },
          { x: 78, y: 96, label: "Save waits for the note" },
        ],
      },
    ],
    extra: {
      title: "The owner sees the record",
      body: "Every record keeps the time, the person and what was done about anything that failed. Owners print the records or download a CSV file.",
      shot: "compliance-forms/owner-records",
      alt: "The owner compliance records page on a phone with a form filter, a date range, a Show records button, Print records and Download CSV buttons",
      caption: "Compliance records on the owner side. Example venue with invented names.",
      callouts: [{ x: 94, y: 70, label: "Print or download a CSV" }],
    },
    helps: {
      owner: "Dated records you can print or download, with failed readings flagged on your overview. Which records your venue needs depends on your state, your council and your licence. Each form is a recommended record. Larder helps you keep records. It is not legal advice.",
      newHire: "Staff open a form, tap and move on. There is nothing to remember to file later.",
    },
    related: ["owner-dashboard", "certificates-signoff"],
    faq: [
      {
        q: "Do the compliance forms replace my own legal checks?",
        a: "No. Larder keeps your records and does not give legal advice. Check what your venue must keep with your local council or regulator.",
      },
      {
        q: "Does Larder send reminders about overdue forms?",
        a: "Overdue forms show on screen, for staff on the forms hub and for you on the owner overview. Larder does not send reminders or chase forms.",
      },
    ],
    quoteSlot: QUOTE_TODO,
  },
  {
    slug: "certificates-signoff",
    icon: "badge",
    name: "Certificates and sign off",
    card: {
      title: "Certificates and sign off in one place",
      body: "See what is expiring, and keep a record that each hire understood their training.",
      linkText: "See how certificates and sign off work",
    },
    seo: {
      title: "Certificates and sign off: expiry dates and typed name records",
      description:
        "Staff upload RSA, food handling and first aid certificates with their dates, and confirm each module by typing their name. Helps you meet and evidence FSANZ Standard 3.2.2A training.",
    },
    h1: "Certificates and sign off, in one place",
    subhead: "Staff upload their certificates with dates. New hires confirm they understood each module by typing their name.",
    problem: [
      "An RSA or food handling certificate runs out the week before an inspection and nobody noticed.",
      "FSANZ Standard 3.2.2A, in force since December 2023, means many Australian food businesses need trained staff and records to show it. Larder helps you meet and evidence that. Which parts apply depends on your food business category.",
      "Certificates differ by state. RSA and working with children checks have different regulators and names in each state, so we set them up for the state your venue is in.",
    ],
    does: [
      "Lets staff photograph a certificate and enter its dates.",
      "Shows owners every certificate and when it expires.",
      "Records a typed name sign off, with the time and device, when a module is completed.",
    ],
    steps: [
      {
        title: "Staff add a certificate",
        body: "Staff open Your certificates, photograph each one and enter its dates.",
        shot: "certificates-signoff/staff-certificates",
        alt: "The staff certificates list on a tablet with first aid, food handler, food safety supervisor and RSA certificate rows",
        caption: "Your certificates. Example venue with invented names and dates.",
        callouts: [{ x: 72, y: 80, label: "Each row shows the expiry date once uploaded" }],
      },
      {
        title: "Owners see what is expiring",
        body: "The certificate list shows each person, the certificate type and its date, so you can ask for a renewal in time.",
        shot: "certificates-signoff/owner-expiry",
        alt: "The owner certificate list on a phone showing each person, the certificate type and when it expired or needs a refresher",
        caption: "The owner certificate list. Example venue with invented names and dates.",
        callouts: [
          { x: 95, y: 13, label: "Already expired" },
          { x: 95, y: 28, label: "Refresher soon" },
        ],
      },
      {
        title: "Staff sign to confirm",
        body: "At the end of a module a new hire types their full name. Larder records when, and from which device. It is a comprehension check, not a contract.",
        shot: "certificates-signoff/esign",
        alt: "A Sign to confirm screen where a new hire has typed their full name above a Confirm and sign button",
        caption: "Sign to confirm. Example venue with an invented name.",
        callouts: [{ x: 88, y: 59, label: "Typed name, time and device" }],
      },
    ],
    extra: {
      title: "The Stamp marks a completed module",
      body: "Once the sign off is recorded, the completion screen shows the Stamp.",
      shot: "certificates-signoff/module-completed",
      alt: "The module completed screen with a circular stamp, the words Food safety basics completed and a Back to modules button",
      caption: "The completion screen after a module. Example venue.",
    },
    helps: {
      owner: "You see expiring certificates before they become a problem, and you hold a dated record that each hire confirmed their training.",
      newHire: "A new hire knows which certificates to upload and what they have signed for.",
    },
    related: ["training-modules", "owner-dashboard"],
    faq: [
      {
        q: "Is the typed name sign off a legal signature?",
        a: "No. It is a record that the person confirmed they understood the training. It is not a contract and not a legal signature.",
      },
      {
        q: "Do state rules make a difference?",
        a: "Some rules differ by state. RSA and working with children checks have different regulators and names in each state, so we set those up for the state your venue is in.",
      },
    ],
    quoteSlot: QUOTE_TODO,
  },
  {
    slug: "owner-dashboard",
    icon: "dashboard",
    name: "Owner dashboard",
    card: {
      title: "One screen for the whole venue",
      body: "Completions, certificates, failed readings and near misses together.",
      linkText: "See what the owner dashboard shows",
    },
    seo: {
      title: "Owner dashboard: completions, certificates and failed readings",
      description:
        "One screen for the owner: who has finished training, which certificates are expiring, failed readings, near miss reports and questions sent to a supervisor.",
    },
    h1: "One screen for the whole venue",
    subhead: "Completions, certificates, failed readings and near miss reports, together on a phone or a desktop.",
    problem: [
      "You piece it together from group chats, binders and memory.",
      "A failed fridge reading on Tuesday is still a surprise on Friday.",
    ],
    does: [
      "Shows who has finished which training.",
      "Lists certificates and when they expire.",
      "Flags failed readings and missed records, near miss reports and questions sent to a supervisor.",
    ],
    steps: [
      {
        title: "Open the dashboard",
        body: "Tiles show what needs attention, staff completion, near miss reports and escalations.",
        shot: "owner-dashboard/dashboard",
        alt: "The Larder owner dashboard on a phone with tiles for what needs attention, staff completion, near miss reports and escalations",
        caption: "The owner dashboard on a phone. Example venue with invented names.",
        callouts: [{ x: 96, y: 27, label: "What needs attention" }],
      },
      {
        title: "Check who has finished",
        body: "Completion tracking lists every staff member against every module.",
        shot: "owner-dashboard/completions",
        alt: "A completion tracking table listing seven staff against four modules with Completed, In progress and Not started",
        caption: "Completion tracking on a desktop. Example venue with invented names.",
        callouts: [{ x: 77, y: 49, label: "In progress shows in orange" }],
      },
      {
        title: "Deal with what staff raise",
        body: "Near miss reports stay open until you mark them resolved.",
        shot: "owner-dashboard/near-misses",
        alt: "The owner near miss reports page on a phone with two reports and a Mark resolved button",
        caption: "Near miss reports. Example venue with invented names.",
        callouts: [{ x: 42, y: 64, label: "Mark resolved when it is dealt with" }],
      },
    ],
    extra: {
      title: "See what is done, overdue and failed",
      body: "The compliance overview counts forms done, not started, overdue, open flags and failures, and lists what needs attention.",
      shot: "owner-dashboard/overview",
      alt: "The owner compliance overview on a phone with counts of forms done, not started, overdue, open flags and failures, and a Needs attention list",
      caption: "The compliance overview. Overdue shows on screen only. Example venue.",
    },
    helps: {
      owner: "One place to look at the start of a shift or the end of the week.",
      newHire: "A near miss a new hire reports reaches you directly, not a group chat.",
    },
    related: ["compliance-forms", "certificates-signoff"],
    faq: [
      {
        q: "Does Larder replace our rostering tool?",
        a: "No. Larder is not a rostering tool. It holds staff names, roles, training, certificates and compliance records. It does not hold shifts, hours, days off or pay. It works alongside tools like Tanda or Deputy, and it does not connect to them.",
      },
      {
        q: "What happens if we cancel?",
        a: "Larder is month to month with 30 days notice. We export your records for you on request. Access to Ask Larder ends when you cancel.",
      },
    ],
    quoteSlot: QUOTE_TODO,
  },
  {
    slug: "stations",
    icon: "station",
    name: "Stations",
    card: {
      title: "Scan the code on the machine",
      body: "Each station has its own QR code, photo, training and Ask Larder.",
      linkText: "See how station codes work",
    },
    seo: {
      title: "Stations: scan the code on the machine for training and answers",
      description:
        "Every station gets a QR code and a photo of your equipment. Staff scan it on the floor to open that station's training, questions and answers and troubleshooting.",
    },
    h1: "Scan the code on the machine",
    subhead: "Every station gets its own QR code and a photo of your equipment, with its own training and answers.",
    problem: [
      "The person who knows how to light the pizza oven is not on tonight.",
      "The manual is in a drawer and nobody knows which drawer.",
    ],
    does: [
      "Gives each machine or station a QR code and a photo.",
      "Opens that station's training, questions and answers, and troubleshooting.",
      "Keeps Ask Larder and a near miss report one tap away.",
    ],
    steps: [
      {
        title: "Print the label",
        body: "You create a station and print its QR label from the owner screen. Stick it where it is needed.",
        shot: "stations/qr-label",
        alt: "A printable station label on a phone for the pizza oven with a QR code and the words Scan for training",
        caption: "A station label with a sample QR code. Example venue.",
        callouts: [{ x: 77, y: 35, label: "Scan opens this station" }],
      },
      {
        title: "Staff scan on the floor",
        body: "Scanning opens that station's page with its training, questions and answers, and troubleshooting.",
        shot: "stations/station-page",
        alt: "A station page on a tablet titled What do you need with Training, FAQs and Troubleshooting options",
        caption: "The station page after a scan. Example venue.",
        callouts: [{ x: 97, y: 10, label: "Training for this station" }],
      },
      {
        title: "Report a hazard on the spot",
        body: "Staff tap Something felt unsafe and send a near miss report in a few taps, named or anonymous.",
        shot: "stations/near-miss",
        alt: "A near miss report form on a phone with a typed description, an optional photo and a Report anonymously checkbox",
        caption: "A near miss report from a station. Example venue with invented details.",
        callouts: [{ x: 62, y: 66, label: "Named or anonymous" }],
      },
    ],
    extra: {
      title: "See every station on the dashboard",
      body: "Owners see each station with its photo and QR code in the station gallery.",
      shot: "launch/stations-gallery",
      alt: "The owner dashboard station gallery: a large photo of a pizza oven with its QR code and four more station photos beside it",
      caption: "The station gallery on the owner dashboard. Example venue. Stock images.",
    },
    helps: {
      owner: "Station knowledge stays with the equipment, not with one person.",
      newHire: "A new hire at an unfamiliar machine scans, reads and gets on with it.",
    },
    related: ["ask-larder", "training-modules"],
    faq: [
      {
        q: "Do staff need to install anything?",
        a: "No. Larder runs in the browser on the iPad or phone staff already have. It needs an internet connection.",
      },
    ],
    quoteSlot: QUOTE_TODO,
  },
];

export const FEATURE_SLUGS = FEATURES.map((f) => f.slug);

export function getFeature(slug: string): Feature | undefined {
  return FEATURES.find((f) => f.slug === slug);
}

export function prevNext(slug: string): { prev: Feature; next: Feature } {
  const i = FEATURES.findIndex((f) => f.slug === slug);
  return { prev: FEATURES[(i - 1 + FEATURES.length) % FEATURES.length], next: FEATURES[(i + 1) % FEATURES.length] };
}
