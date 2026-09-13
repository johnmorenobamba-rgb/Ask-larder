// Seeds topic_gap_checklists with real, grounded sub-procedure checklists
// for the 14 topics Two Fires' modules cover (Food Standards Code,
// WorkSafe Victoria manual handling guidance, RSA regulations, and standard
// Australian hospitality operating practice) -- not invented per-run by the
// agent. Also backfills modules.topic_key for these 14 (they were seeded
// directly, bypassing the Block T/U flow that normally sets it), at the
// same granularity as the module itself (1:1), since Two Fires' modules are
// finer-grained than the broader topic_key groupings used by venues that
// went through the real wizard.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const VENUE_ID = "b379e33f-b0d8-47bf-810e-450635b29b6b"; // Two Fires

function sp(key, label, why, mechanism) {
  return { key, label, why_it_matters: why, default_mechanism: mechanism };
}

const CHECKLISTS = [
  {
    topic_key: "allergen_handling",
    title: "Allergen Handling",
    module_title: "Allergen Handling",
    source_notes: "Food Standards Code (Standard 1.2.3) mandatory declarable allergens and Feb 2026 Plain English labelling requirement.",
    sub_procedures: [
      sp("declarable_allergens_list", "Australia's mandatory declarable allergens", "Legal requirement, same at every venue.", "standard_fill"),
      sp("plain_english_labelling", "Plain English allergen terms in labelling/menu (Feb 2026 requirement)", "Compliance requirement, not venue-specific.", "standard_fill"),
      sp("cross_contact_risk_mapping", "This venue's specific shared equipment/surfaces creating cross-contact risk", "Only the owner knows what shares a fryer, grill, or prep surface here.", "owner_question"),
      sp("order_flagging_process", "How an allergy order is flagged from FOH to kitchen", "Every venue needs a version of this; the exact mechanism varies.", "owner_question"),
      sp("reaction_response_procedure", "What to do if a customer shows signs of a reaction", "Safety-critical, same core steps everywhere (escalate immediately, don't guess).", "standard_fill"),
    ],
  },
  {
    topic_key: "bar_service_rsa",
    title: "Bar Service & RSA Compliance",
    module_title: "Bar Service & RSA Compliance",
    source_notes: "Victorian RSA regulatory obligations (responsible service, ID checking, refusal of service).",
    sub_procedures: [
      sp("rsa_responsible_service_standards", "Standard RSA obligations (refusing intoxicated patrons, not serving minors)", "Legal requirement, same at every licensed venue.", "standard_fill"),
      sp("id_checking_process", "This venue's actual ID-checking process/technology", "Varies venue to venue (scanner, visual check, policy on borderline cases).", "owner_question"),
      sp("intoxication_refusal_escalation", "Steps for refusing an intoxicated patron and who backs up front-line staff", "Standard RSA framework, but the escalation chain is venue-specific.", "owner_question"),
      sp("incident_documentation", "How an RSA-related incident gets logged", "Venue-specific record-keeping process.", "owner_question"),
      sp("trading_hours_licence_conditions", "This venue's actual licensed trading hours and any special licence conditions", "Only the owner's licence has this detail.", "owner_question"),
    ],
  },
  {
    topic_key: "beer_line_cellar_hygiene",
    title: "Beer Line & Cellar Hygiene",
    module_title: "Beer Line & Cellar Hygiene",
    source_notes: "Standard draught beer system hygiene practice (line cleaning cadence, CO2/gas safety) and general cellar safety.",
    sub_procedures: [
      sp("line_cleaning_schedule", "Beer line cleaning frequency and method", "Industry-standard cadence (typically every 1-2 weeks) applies broadly; confirm this venue's actual schedule.", "standard_fill"),
      sp("co2_gas_safety", "CO2/gas cylinder storage and leak-safety rules", "Physical/safety requirement, true at any venue with a gas system.", "standard_fill"),
      sp("keg_changeover_procedure", "This venue's actual keg changeover steps", "Equipment-specific, varies by system.", "owner_question"),
      sp("cellar_temperature_monitoring", "Target cellar temperature range and how it's actually monitored here", "Standard target range exists; the monitoring process is venue-specific.", "owner_question"),
      sp("drain_floor_sanitation", "Cellar drain and floor sanitation practice", "Standard hygiene practice, not venue-specific.", "standard_fill"),
    ],
  },
  {
    topic_key: "cash_handling_end_of_day",
    title: "Cash Handling & End-of-Day",
    module_title: "Cash Handling & End-of-Day",
    source_notes: "Standard till reconciliation and cash-control practice.",
    sub_procedures: [
      sp("till_float_process", "This venue's actual float amount and float process", "Only the owner sets the float.", "owner_question"),
      sp("reconciliation_procedure", "How the till is actually reconciled at end of day", "Standard method exists; the exact steps are venue-specific.", "owner_question"),
      sp("discrepancy_escalation", "What to do if the numbers don't match", "Needs a real venue-specific escalation contact/process.", "owner_question"),
      sp("safe_drop_and_banking", "This venue's safe/banking process", "Venue-specific security process.", "owner_question"),
      sp("eftpos_reconciliation", "Reconciling the card terminal against the till", "Standard practice with venue-specific terminal/process detail.", "standard_fill"),
    ],
  },
  {
    topic_key: "customer_service_house_policies",
    title: "Customer Service & House Policies",
    module_title: "Customer Service & House Policies",
    source_notes: "Standard hospitality complaint-handling framework.",
    sub_procedures: [
      sp("complaint_handling_steps", "A standard de-escalation framework for handling a complaint", "General best practice, applies broadly.", "standard_fill"),
      sp("refund_discount_authority", "What staff can authorize without asking a manager first", "Only the owner sets this limit.", "owner_question"),
      sp("house_policy_communication", "This venue's specific house policies (bookings, dress code, walk-ins, etc.)", "Entirely venue-specific.", "owner_question"),
      sp("manager_escalation_threshold", "When a complaint must be handed to a manager", "Venue-specific judgment call.", "owner_question"),
    ],
  },
  {
    topic_key: "deep_fryer_safety_oil_management",
    title: "Deep Fryer Safety & Oil Management",
    module_title: "Deep Fryer Safety & Oil Management",
    source_notes: "Standard commercial fryer safety practice (never use water on an oil fire, PPE, oil-quality checks).",
    sub_procedures: [
      sp("safe_startup_shutdown", "Safe fryer startup and shutdown procedure", "Standard equipment-safety practice.", "standard_fill"),
      sp("oil_change_schedule_quality_check", "Oil-quality check method and this venue's actual change schedule", "Standard testing method (colour/smell/TPM) exists; schedule is venue-specific.", "owner_question"),
      sp("burn_fire_response", "Response to an oil fire or burn (never water on an oil fire)", "Safety-critical, same everywhere.", "standard_fill"),
      sp("filtering_cleaning_procedure", "This venue's actual filtering and cleaning method", "Varies by equipment and venue routine.", "owner_question"),
      sp("ppe_requirements", "Required PPE for fryer work", "Standard safety requirement.", "standard_fill"),
    ],
  },
  {
    topic_key: "emergencies_incidents",
    title: "Emergencies & Incidents",
    module_title: "Emergencies & Incidents",
    source_notes: "Standard workplace emergency response framework (fire, medical, security).",
    sub_procedures: [
      sp("fire_evacuation_procedure", "Fire evacuation steps, this venue's actual exits and assembly point", "Standard framework; exits/assembly point are venue-specific.", "owner_question"),
      sp("first_aid_response", "First aid response, this venue's first-aider and kit location", "Standard steps; who/where is venue-specific.", "owner_question"),
      sp("incident_reporting_process", "How an incident actually gets reported and reviewed here", "Venue-specific record-keeping process.", "owner_question"),
      sp("medical_emergency_escalation", "Medical emergency escalation (call 000, then who gets notified)", "Standard first step; internal notification chain is venue-specific.", "owner_question"),
      sp("security_threat_response", "Response to a security threat or aggressive person", "Venue-specific, depends on layout/staffing.", "owner_question"),
    ],
  },
  {
    topic_key: "food_safety_hygiene",
    title: "Food Safety & Hygiene",
    module_title: "Food Safety & Hygiene",
    source_notes: "Food Standards Code temperature-control and hygiene fundamentals.",
    sub_procedures: [
      sp("temperature_danger_zone_standards", "Food Standards Code temperature requirements (danger zone, safe holding temps)", "Legal requirement, identical everywhere.", "standard_fill"),
      sp("handwashing_protocol", "Standard handwashing protocol", "General food-safety practice.", "standard_fill"),
      sp("cross_contamination_prevention", "Cross-contamination prevention for this venue's actual kitchen layout/equipment", "Standard principle; specific risk points are venue-specific.", "owner_question"),
      sp("illness_reporting_policy", "Staff illness reporting policy", "Standard food-safety requirement.", "standard_fill"),
      sp("cleaning_sanitising_schedule", "This venue's actual cleaning and sanitising schedule", "Venue-specific.", "owner_question"),
    ],
  },
  {
    topic_key: "full_venue_open_close",
    title: "Full Venue Open/Close",
    module_title: "Full Venue Open/Close",
    source_notes: "Inherently venue-specific -- alarm codes, key holders, and checklists differ at every premises.",
    sub_procedures: [
      sp("alarm_arm_disarm_process", "This venue's alarm arm/disarm process on arrival and departure", "Entirely venue-specific.", "owner_question"),
      sp("key_holder_trust_process", "Who holds keys and how a new team member earns key trust", "Entirely venue-specific.", "owner_question"),
      sp("opening_checklist", "This venue's actual opening checklist", "Entirely venue-specific.", "owner_question"),
      sp("closing_checklist_lockup", "This venue's actual closing checklist and lockup steps", "Entirely venue-specific.", "owner_question"),
      sp("escalation_if_something_wrong", "What to do if something looks wrong on arrival (forced entry, missing float, etc.)", "Standard safety-first principle applies broadly.", "standard_fill"),
    ],
  },
  {
    topic_key: "kitchen_cleaning_sanitation",
    title: "Kitchen Cleaning & Sanitation",
    module_title: "Kitchen Cleaning & Sanitation",
    source_notes: "Standard commercial kitchen cleaning/chemical-safety practice.",
    sub_procedures: [
      sp("daily_vs_periodic_tasks", "Which cleaning tasks happen daily vs. on a periodic schedule", "Standard framework exists; the actual schedule is venue-specific.", "owner_question"),
      sp("chemical_safety_storage", "Cleaning chemical safety, dilution, and storage", "Standard safety requirement (SDS, correct storage/labelling).", "standard_fill"),
      sp("equipment_specific_cleaning", "This venue's equipment-specific cleaning steps", "Varies by actual equipment on site.", "owner_question"),
      sp("pest_control_procedure", "Pest control/prevention practice", "Standard food-premises requirement.", "standard_fill"),
    ],
  },
  {
    topic_key: "kitchen_opening_closing_procedure",
    title: "Kitchen Opening & Closing Procedure",
    module_title: "Kitchen Opening & Closing Procedure",
    source_notes: "Standard kitchen equipment safety framework plus venue-specific setup.",
    sub_procedures: [
      sp("opening_equipment_checks", "Equipment checks on opening (temps, gas, power)", "Standard safety framework; the exact equipment list is venue-specific.", "owner_question"),
      sp("stock_and_prep_setup", "This venue's actual stock and prep setup order", "Entirely venue-specific.", "owner_question"),
      sp("closing_equipment_shutdown", "Safe equipment shutdown order at close", "Standard safety practice (gas off, power down in the right order).", "standard_fill"),
      sp("closing_cleaning_handover", "Closing cleaning tasks and handover to the next shift", "Venue-specific.", "owner_question"),
    ],
  },
  {
    topic_key: "manual_handling_ppe",
    title: "Manual Handling & PPE",
    module_title: "Manual Handling & PPE",
    source_notes: "WorkSafe Victoria manual handling guidance (safe lifting technique, hazard identification).",
    sub_procedures: [
      sp("safe_lifting_technique", "Safe lifting technique", "WorkSafe guidance, identical everywhere.", "standard_fill"),
      sp("manual_handling_risk_areas", "This venue's actual heavy/awkward manual handling tasks", "Only the owner knows what's actually heavy here (keg runs, stock deliveries, etc.).", "owner_question"),
      sp("required_ppe_by_task", "Required PPE for specific tasks", "Standard baseline; which tasks need what is venue-specific.", "owner_question"),
      sp("injury_reporting_process", "How a manual-handling injury gets reported", "Standard WHS requirement.", "standard_fill"),
    ],
  },
  {
    topic_key: "pizza_oven_grill_safety",
    title: "Pizza Oven & Grill Safety",
    module_title: "Pizza Oven & Grill Safety",
    source_notes: "Standard high-heat equipment safety practice.",
    sub_procedures: [
      sp("safe_ignition_shutdown", "Safe ignition and shutdown procedure", "Standard equipment-safety practice.", "standard_fill"),
      sp("burn_prevention_ppe", "Burn prevention and required PPE", "Standard safety requirement.", "standard_fill"),
      sp("temperature_management", "Target operating temperatures for this venue's actual menu", "Venue-specific, depends on what's cooked.", "owner_question"),
      sp("cleaning_maintenance_schedule", "This venue's actual cleaning and maintenance schedule", "Venue-specific.", "owner_question"),
    ],
  },
  {
    topic_key: "welcome_how_we_work",
    title: "Welcome & How We Work",
    module_title: "Welcome & How We Work",
    source_notes: "Standard new-hire orientation coverage areas -- content itself is inherently venue-specific (culture, expectations), but the checklist of WHAT an orientation module should cover is a known, general list.",
    sub_procedures: [
      sp("venue_values_and_culture", "This venue's actual values and culture, not generic platitudes", "Entirely venue-specific.", "owner_question"),
      sp("role_expectations_overview", "What's expected in each role at this venue", "Entirely venue-specific.", "owner_question"),
      sp("communication_channels", "How the team actually communicates (group chat, roster app, noticeboard)", "Entirely venue-specific.", "owner_question"),
      sp("uniform_presentation_standards", "This venue's uniform/presentation standards", "Entirely venue-specific.", "owner_question"),
      sp("probation_review_process", "Probation period length and how a review actually happens here", "Commonly missing from orientation content even when the rest is thorough.", "owner_question"),
      sp("key_contacts_escalation", "Who to go to for what (roster issues, pay, safety concerns)", "Entirely venue-specific.", "owner_question"),
    ],
  },
];

for (const c of CHECKLISTS) {
  const { error: checklistError } = await supabase.from("topic_gap_checklists").upsert(
    {
      topic_key: c.topic_key,
      title: c.title,
      venue_type: null,
      sub_procedures: c.sub_procedures,
      source_notes: c.source_notes,
      version: 1,
    },
    { onConflict: "topic_key" },
  );
  if (checklistError) {
    console.error(`FAILED checklist ${c.topic_key}:`, checklistError.message);
    continue;
  }

  const { error: updateError } = await supabase
    .from("modules")
    .update({ topic_key: c.topic_key })
    .eq("venue_id", VENUE_ID)
    .eq("title", c.module_title);
  if (updateError) {
    console.error(`FAILED topic_key backfill for ${c.module_title}:`, updateError.message);
  } else {
    console.log(`OK ${c.topic_key} <- ${c.module_title}`);
  }
}
