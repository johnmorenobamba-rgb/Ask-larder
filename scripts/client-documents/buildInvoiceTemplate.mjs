// Writes an example render of the invoice builder into
// client-documents/templates/, so the founder can see the visual template
// without it being mistaken for a real bill (SAMPLE TEMPLATE banner, per
// buildInvoice.mjs). Uses the same buildInvoiceDocument() the real
// generator (generate-invoice.mjs) calls -- this is not a separate,
// hand-maintained template file that could drift from what real invoices
// actually look like.
import { Packer } from "docx";
import { writeFileSync } from "node:fs";
import { buildInvoiceDocument } from "./buildInvoice.mjs";

const doc = buildInvoiceDocument({
  invoiceNumber: "[INV-YYYY-MM-###]",
  invoiceDate: "[Invoice date]",
  dueDate: "[Due date]",
  venueName: "[Venue trading name]",
  venueAddress: "[Venue address]",
  lineItems: [
    { description: "[Line item description]", qty: 1, rate: 0, amount: 0 },
  ],
  isSampleTemplate: true,
});

const buf = await Packer.toBuffer(doc);
writeFileSync(new URL("../../client-documents/templates/Invoice Template.docx", import.meta.url), buf);
console.log("Wrote client-documents/templates/Invoice Template.docx");
