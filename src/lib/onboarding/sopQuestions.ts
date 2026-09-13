// Block T -- the universal question scaffold (T2) plus the three
// critical-incident layers (T3) that get appended on top of it per topic.
// This is what makes "one generic engine + layered types" a real mechanism
// instead of a description: SopInterview.tsx renders the exact same
// question-card component over whatever getQuestionsForTopic() returns,
// whether that's 7 entries or 9. No topic gets bespoke rendering code.
//
// Question *wording* lives here, in code, not in a database table --
// it's founder-authored copy with conditional layering logic, which is
// easier to write and diff as TypeScript than as rows. Only *answers*
// (sop_intake_answers) are persisted.

export type SopQuestionType = "universal" | "behavioral_read" | "safety_honesty" | "troubleshoot_escalate" | "access_control";

export interface SopQuestionDef {
  // Stable id -- primary key half of sop_intake_answers' (venue_id,
  // topic_key, question_key) uniqueness. Never rename an existing key once
  // real answers exist against it.
  key: string;
  type: SopQuestionType;
  prompt: string;
  helperText?: string;
  allowsAttachment: boolean;
  // Only true for the troubleshoot_escalate layer -- tells the curation
  // step (T5) to look for a real named external contact in this answer and
  // offer to save it to venue_contacts, rather than leaving it in prose.
  capturesStructuredContact?: boolean;
}

// T2 -- every topic runs through these seven, in order, before any layer.
// Plain, concrete, readable-aloud questions -- not field labels.
export const UNIVERSAL_SCAFFOLD: SopQuestionDef[] = [
  {
    key: "trigger_and_scope",
    type: "universal",
    prompt: "When does this actually come up, and what does it cover? What's clearly not part of it?",
    helperText: "Think of the real moment this starts -- a delivery arrives, a guest asks a question, a shift begins.",
    allowsAttachment: false,
  },
  {
    key: "who_performs_it",
    type: "universal",
    prompt: "Who's actually allowed to do this, day to day?",
    helperText: "Name the real role, not a title from an org chart nobody uses.",
    allowsAttachment: false,
  },
  {
    key: "materials",
    type: "universal",
    prompt: "What do you physically need on hand to do this -- equipment, keys, forms, anything?",
    helperText: "Say 'nothing extra' if that's genuinely true.",
    allowsAttachment: true,
  },
  {
    key: "procedure",
    type: "universal",
    prompt: "Walk me through it step by step, in the order it actually happens.",
    helperText: "Describe it the way you'd tell a new hire standing next to you, not a formal policy.",
    allowsAttachment: true,
  },
  {
    key: "safety_critical",
    type: "universal",
    prompt: "Is there any part of this where getting it wrong could actually hurt someone or cause a real incident?",
    helperText: "If genuinely nothing is safety-critical here, say so plainly.",
    allowsAttachment: false,
  },
  {
    key: "definition_of_done",
    type: "universal",
    prompt: "How do you know it's actually finished and done properly?",
    allowsAttachment: false,
  },
  {
    key: "escalation_contact",
    type: "universal",
    prompt: "If something goes wrong or a staff member isn't sure, who do they actually go to?",
    helperText: "A real name or role, not 'management'.",
    allowsAttachment: false,
  },
];

const BEHAVIORAL_READ: SopQuestionDef = {
  key: "behavioral_read",
  type: "behavioral_read",
  prompt: "Describe the last time this actually happened -- what's the first thing you noticed that told you it wasn't normal?",
  helperText: "There's no fixed script for this one -- we want the real pattern-recognition, not a rulebook answer.",
  allowsAttachment: false,
};

const SAFETY_HONESTY: SopQuestionDef = {
  key: "safety_honesty_check",
  type: "safety_honesty",
  prompt: "If a customer discloses a real health or safety need here (an allergy, celiac, an intolerance), what's actually true about this venue? Is there real risk, and what exactly should staff say -- honestly, not just 'we'll manage it'?",
  helperText: "If the honest answer is 'yes, there's real risk, here's what we can't guarantee', say exactly that -- it has to survive into the final SOP this plainly, not get softened later.",
  allowsAttachment: false,
};

const TROUBLESHOOT_ESCALATE: SopQuestionDef = {
  key: "troubleshoot_then_escalate",
  type: "troubleshoot_escalate",
  prompt: "If this fails or breaks, what's the first thing to actually try? If that doesn't fix it, who gets called?",
  helperText: "If a real person or company gets called, give their name and how to reach them -- we'll offer to save them as a contact.",
  allowsAttachment: true,
  capturesStructuredContact: true,
};

// Block V2 -- a distinct layer for topics that are fundamentally about
// physical/system ACCESS (a safe, an alarm, a restricted area), not
// equipment repair. TROUBLESHOOT_ESCALATE's "what's the first thing to
// actually try" framing is exactly wrong here -- for a glasswasher that
// invites real troubleshooting; for a safe or alarm it invites someone to
// describe (or type) the actual code. This asks who's authorized and who to
// call instead, so the sensitive value is never invited in the first place
// -- V1's detectSensitiveContent is a backstop for what still gets typed
// anyway, not the primary defense.
const ACCESS_CONTROL: SopQuestionDef = {
  key: "access_control",
  type: "access_control",
  prompt: "Who's actually authorized to access this day to day? If they're not on shift when it's needed, who do you call?",
  helperText: "Answer with who's allowed and who to call, never the code or combination itself -- that never gets typed here, even as an example.",
  allowsAttachment: false,
  capturesStructuredContact: true,
};

// Topic-specific overrides on top of the universal scaffold -- lets a topic
// replace a generic question's wording without changing it for every other
// topic that reuses the same key. Used here to keep
// restricted_content_safe_and_alarm_access's "materials"/"procedure"
// questions from ever asking what the access itself looks like.
const TOPIC_QUESTION_OVERRIDES: Partial<Record<string, Partial<Record<string, Partial<SopQuestionDef>>>>> = {
  restricted_content_safe_and_alarm_access: {
    materials: {
      prompt: "What's physically involved here (a safe, a keypad, a lockbox, an alarm panel)? Describe what it is, not how to open it.",
      helperText: "Just what exists and where it is -- never the code, combination, or key location.",
    },
    procedure: {
      prompt: "Who actually handles this day to day, and when does it come up (opening, closing, a delivery)?",
      helperText: "Describe who's involved and when, not the steps to actually access it.",
    },
  },
  closing_procedures_and_premises_security: {
    troubleshoot_then_escalate: {
      prompt: "If the alarm or lock doesn't behave as expected at close, who's the right person to call?",
      helperText: "Say who to call, not what to try -- never describe a workaround, override, or the code itself here.",
    },
  },
};

// T3 -- a topic can carry more than one layer. Reassigning which topics get
// which layers, or adding a new layer type later, is a config edit here,
// not new component code.
export const TOPIC_QUESTION_LAYERS: Partial<Record<string, SopQuestionDef[]>> = {
  crowd_control_and_door_security: [BEHAVIORAL_READ],
  workplace_health_and_safety: [BEHAVIORAL_READ],
  food_handling_and_allergens: [SAFETY_HONESTY],
  equipment_operating_and_cleaning: [TROUBLESHOOT_ESCALATE],
  cellar_and_gas_safety: [TROUBLESHOOT_ESCALATE, SAFETY_HONESTY],
  closing_procedures_and_premises_security: [TROUBLESHOOT_ESCALATE],
  business_continuity_and_emergencies: [TROUBLESHOOT_ESCALATE],
  display_cabinet_and_grab_and_go_safety: [TROUBLESHOOT_ESCALATE],
  gaming_machine_operation_and_responsible_gambling: [BEHAVIORAL_READ],
  restricted_content_safe_and_alarm_access: [ACCESS_CONTROL],
};

export function getQuestionsForTopic(topicKey: string): SopQuestionDef[] {
  const base = [...UNIVERSAL_SCAFFOLD, ...(TOPIC_QUESTION_LAYERS[topicKey] ?? [])];
  const overrides = TOPIC_QUESTION_OVERRIDES[topicKey];
  if (!overrides) return base;
  return base.map((q) => (overrides[q.key] ? { ...q, ...overrides[q.key] } : q));
}
