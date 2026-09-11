// Pricing Schedule (internal reference) -- pulled verbatim from the same
// finalised Notion source as the CSA and Order Form.
import { Packer } from "docx";
import { writeFileSync } from "node:fs";
import { makeDocument, clauseHeading, body, bullet, simpleTable, CONTENT_WIDTH_DXA } from "./brandKit.mjs";

const sections = [
  body("Internal reference. Not for client distribution.", { after: 260, bold: true }),

  clauseHeading("Setup fees, by tier"),
  simpleTable(
    ["Tier", "Staff range", "Setup fee"],
    [
      ["LDR-XS — Micro", "1–5 staff", "$799 AUD"],
      ["LDR-S — Small", "6–15 staff", "$1,299 AUD"],
      ["LDR-M — Medium", "16–25 staff", "$1,999 AUD"],
      ["LDR-L — Large", "26+ staff", "Custom quote"],
      ["Founder's rate", "Coachman's Arms only", "$750 AUD"],
    ],
    [Math.round(CONTENT_WIDTH_DXA * 0.333), Math.round(CONTENT_WIDTH_DXA * 0.333), CONTENT_WIDTH_DXA - 2 * Math.round(CONTENT_WIDTH_DXA * 0.333)],
  ),

  clauseHeading("Monthly retainer"),
  body("$100 AUD per month, invoiced in advance. Includes:", { after: 100 }),
  bullet("Administrator dashboard"),
  bullet("Staff completion tracking"),
  bullet("Certificate-expiry tracking and notifications"),
  bullet("Weekly staff-activity digest"),
  bullet("Five (5) free content edit requests per month"),

  clauseHeading("Additional services"),
  bullet("Additional edits beyond the five included: $15 AUD each"),
  bullet("Comprehension quiz add-on: complimentary, on request"),
  bullet("SOP generation for undocumented procedures: itemised, quoted after an initial walkthrough"),
];

const doc = makeDocument({
  title: "Pricing Schedule",
  subtitle: "Internal reference",
  docLabel: "Pricing Schedule (internal)",
  sections,
});

const buf = await Packer.toBuffer(doc);
writeFileSync(new URL("../../client-documents/templates/Pricing Schedule.docx", import.meta.url), buf);
console.log("Wrote client-documents/templates/Pricing Schedule.docx");
