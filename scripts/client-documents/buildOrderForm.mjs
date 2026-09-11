// Order Form (Schedule A) -- pulled verbatim from the same finalised
// Notion source as the CSA. Forms part of the Client Services Agreement.
import { Packer } from "docx";
import { writeFileSync } from "node:fs";
import {
  makeDocument,
  clauseHeading,
  body,
  fillLine,
  checkboxOption,
  sectionRule,
} from "./brandKit.mjs";

const sections = [
  body("Schedule A to the Client Services Agreement between Larder and the Venue named below.", { after: 260 }),

  clauseHeading("Venue details"),
  ...fillLine("Venue trading name"),
  ...fillLine("Legal / registered business name"),
  ...fillLine("Address"),
  ...fillLine("ABN"),
  ...fillLine("Primary contact / owner"),
  ...fillLine("Date"),

  clauseHeading("Pricing tier (select one)"),
  checkboxOption("LDR-XS — Micro (1–5 staff) — $799 AUD"),
  checkboxOption("LDR-S — Small (6–15 staff) — $1,299 AUD"),
  checkboxOption("LDR-M — Medium (16–25 staff) — $1,999 AUD"),
  checkboxOption("LDR-L — Large (26+ staff) — Custom quote: $___________"),
  checkboxOption("Founder's rate (first-client discretionary) — $750 AUD"),

  clauseHeading("Fees"),
  ...fillLine("Setup fee"),
  ...fillLine("SOP generation add-on (if any)"),

  sectionRule(),
  ...fillLine("Signed for the Venue", { after: 200 }),
  ...fillLine("Signed for Larder", { after: 200 }),
];

const doc = makeDocument({
  title: "Order Form",
  subtitle: "Schedule A to the Client Services Agreement",
  docLabel: "Order Form — Schedule A",
  sections,
});

const buf = await Packer.toBuffer(doc);
writeFileSync(new URL("../../client-documents/templates/Order Form (Schedule A).docx", import.meta.url), buf);
console.log("Wrote client-documents/templates/Order Form (Schedule A).docx");
