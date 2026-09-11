// Client Services Agreement -- clause text pulled verbatim from the
// FINALISED source of truth in Notion ("Client Documents — Finalised (CSA,
// Order Form, Pricing Schedule, Privacy Policy)", Larder HQ / Sources of
// Truth, last edited 11 Sep 2026). That page explicitly supersedes the
// earlier working-draft clauses in Legal & Compliance Reference §4.
import { Packer } from "docx";
import { writeFileSync } from "node:fs";
import {
  makeDocument,
  clauseHeading,
  subclause,
  body,
  fillLine,
  sectionRule,
} from "./brandKit.mjs";

const sections = [
  body(
    'This Agreement is entered into between Larder ("Larder", "we", "us") and the venue named in the attached Order Form ("the Venue", "you"), effective as of the date of signing set out in the Order Form.',
    { after: 260 },
  ),

  clauseHeading("1. Services"),
  subclause(
    "1.1 Larder will deliver a Setup phase producing role-specific training modules built from the Venue's own standard operating procedures, photographs, and staff interviews. The applicable pricing tier and Setup Fee are set out in the Order Form (Schedule A), which forms part of this Agreement.",
  ),
  subclause(
    "1.2 Larder will deliver an ongoing Monthly Service, for a fee of $100 AUD per month per venue, comprising: an administrator dashboard; staff completion tracking; a certificate-expiry tracking and notification system; a weekly staff-activity digest; and up to five (5) content edit requests per calendar month.",
  ),

  clauseHeading("2. Additional services"),
  subclause("2.1 Additional content edit requests beyond the five included per month are billed at $15 AUD per request."),
  subclause("2.2 A formal comprehension quiz add-on may be requested for any module at no additional charge, added on a reasonable-request basis."),
  subclause("2.3 SOP generation for procedures not currently documented by the Venue is available as a separate, itemised service, quoted after an initial walkthrough, and is not included in the Setup Fee."),

  clauseHeading("3. Term and cancellation"),
  subclause("3.1 This Agreement operates on a month-to-month basis with no minimum lock-in period beyond the initial Setup phase."),
  subclause("3.2 Either party may cancel the Monthly Service with thirty (30) days' written notice."),
  subclause("3.3 Setup Fees are non-refundable once work has commenced, reflecting labour already performed."),

  clauseHeading("4. Data and content ownership"),
  subclause("4.1 All source material provided by the Venue (SOPs, photographs, menus, procedural knowledge) remains the Venue's property at all times."),
  subclause("4.2 Upon cancellation, the Venue's content and staff completion records will be made available for export in a standard format within a reasonable timeframe."),
  subclause('4.3 Access to the "Ask Larder" chatbot and hosted platform ends at the conclusion of the notice period.'),
  subclause("4.4 Larder retains ownership of its underlying software, module templates, artificial intelligence prompting methodology, and platform methodology."),

  clauseHeading("5. Approval and liability"),
  subclause("5.1 All training modules require explicit approval by an authorised representative of the Venue before being made available to staff."),
  subclause("5.2 The Venue is responsible for verifying the accuracy and currency of all compliance-related content (including but not limited to food safety, allergen handling, responsible service of alcohol, and working with children requirements) prior to approval, notwithstanding Larder's good-faith effort to source such content from current, named regulatory standards."),
  subclause("5.3 Larder's liability arising out of or in connection with this Agreement is limited to the fees paid by the Venue in the twelve (12) months preceding any claim, to the maximum extent permitted by law."),

  clauseHeading("6. Confidentiality, privacy, and use of artificial intelligence"),
  subclause("6.1 Larder will handle staff personal information (including certificate images and compliance data) in accordance with its Privacy Policy, available at asklarder.com.au/privacy."),
  subclause('6.2 Larder uses artificial intelligence to structure training content from Venue-approved source material and to power the "Ask Larder" staff chatbot, which answers only from that Venue\'s own approved content. No Venue or staff data is used to train any third-party or general-purpose AI model.'),
  subclause("6.3 Larder will not use Venue or staff data for any purpose beyond delivering the Services described in this Agreement."),

  clauseHeading("7. Fees and payment"),
  subclause('7.1 The Setup Fee is invoiced as follows: fifty percent (50%) upon execution of this Agreement and the Order Form, due within seven (7) days; the remaining fifty percent (50%) upon the Venue\'s modules first being made available to staff ("go-live"), due within seven (7) days.'),
  subclause("7.2 The Monthly Service fee is invoiced monthly in advance, due within seven (7) days of the invoice date."),
  subclause("7.3 Additional services under Clause 2 are invoiced as incurred, due within seven (7) days of the invoice date."),
  subclause("7.4 Overdue amounts may accrue interest at the rate prescribed under the Penalty Interest Rates Act 1983 (Vic), or Larder may suspend the Services, at Larder's discretion."),

  clauseHeading("8. General"),
  subclause("8.1 This Agreement is governed by the laws of Victoria, Australia."),
  subclause("8.2 This Agreement, together with its Order Form and Schedules, constitutes the entire agreement between the parties regarding the Services."),

  sectionRule(),
  ...fillLine("Signed for the Venue", { after: 200 }),
  ...fillLine("Date"),
  ...fillLine("Signed for Larder", { after: 200 }),
  ...fillLine("Date"),
];

const doc = makeDocument({
  title: "Client Services Agreement",
  subtitle: "Status: finalised — ready for lawyer review",
  docLabel: "Client Services Agreement",
  sections,
});

const buf = await Packer.toBuffer(doc);
writeFileSync(new URL("../../client-documents/templates/Client Services Agreement.docx", import.meta.url), buf);
console.log("Wrote client-documents/templates/Client Services Agreement.docx");
