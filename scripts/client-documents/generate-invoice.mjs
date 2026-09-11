#!/usr/bin/env node
// On-demand invoice generator. A script, not a UI feature, per instruction
// -- run it directly from scripts/client-documents/ whenever a real
// invoice needs to go out. Builds via the same buildInvoiceDocument() the
// template example uses (buildInvoiceTemplate.mjs), so a real invoice is
// never out of sync with what the template shows.
//
// Usage (simple, single line item):
//   node generate-invoice.mjs --venue "The Coachman's Arms Hotel" --slug coachmans-arms \
//     --description "Setup fee, founder's rate" --qty 1 --rate 750
//
// Usage (multiple line items, JSON):
//   node generate-invoice.mjs --venue "The Coachman's Arms Hotel" --slug coachmans-arms \
//     --description "Setup fee and SOP generation" \
//     --items '[{"description":"Setup fee (founder\'s rate)","qty":1,"rate":750},{"description":"SOP generation — cellar module","qty":1,"rate":120}]'
//
// Optional: --invoice-number, --date (YYYY-MM-DD, default today),
// --due-date (YYYY-MM-DD, default date+7), --address "Venue address".
//
// Filename: client-documents/invoices/YYYY-MM-venue-slug-description.docx
// (YYYY-MM from the invoice date). Never overwrites silently -- if a file
// already exists at that exact path, a numeric suffix is appended.

import { Packer } from "docx";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { buildInvoiceDocument } from "./buildInvoice.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "true";
      args[key] = value;
      if (value !== "true") i++;
    }
  }
  return args;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}

const args = parseArgs(process.argv.slice(2));

if (!args.venue) {
  console.error("Missing required --venue \"Venue trading name\"");
  process.exit(1);
}

const invoiceDate = args.date ?? formatDate(new Date());
const dueDate = args["due-date"] ?? addDays(invoiceDate, 7);
const venueSlug = args.slug ?? slugify(args.venue);
const description = args.description ?? "invoice";
const descriptionSlug = slugify(description);

let lineItems;
if (args.items) {
  const parsed = JSON.parse(args.items);
  lineItems = parsed.map((li) => ({ ...li, amount: li.qty * li.rate }));
} else {
  if (!args.rate) {
    console.error("Missing --rate (or use --items for multiple line items)");
    process.exit(1);
  }
  const qty = Number(args.qty ?? 1);
  const rate = Number(args.rate);
  // description (used here for the actual visible line-item text) is kept
  // exactly as passed, e.g. "Setup fee, founder's rate" -- only
  // descriptionSlug (derived above) feeds the filename, so a natural
  // sentence doesn't get forced into a filename-safe slug on the invoice
  // itself.
  lineItems = [{ description, qty, rate, amount: qty * rate }];
}

const yearMonth = invoiceDate.slice(0, 7); // YYYY-MM
const invoiceNumber = args["invoice-number"] ?? `INV-${invoiceDate.replace(/-/g, "")}-${venueSlug.toUpperCase().slice(0, 4)}`;

const doc = buildInvoiceDocument({
  invoiceNumber,
  invoiceDate,
  dueDate,
  venueName: args.venue,
  venueAddress: args.address,
  lineItems,
  isSampleTemplate: false,
});

const outDir = new URL("../../client-documents/invoices/", import.meta.url);
mkdirSync(outDir, { recursive: true });

let filename = `${yearMonth}-${venueSlug}-${descriptionSlug}.docx`;
let outPath = new URL(filename, outDir);
let n = 2;
while (existsSync(outPath)) {
  filename = `${yearMonth}-${venueSlug}-${descriptionSlug}-${n}.docx`;
  outPath = new URL(filename, outDir);
  n++;
}

const buf = await Packer.toBuffer(doc);
writeFileSync(outPath, buf);

const total = lineItems.reduce((sum, li) => sum + li.amount, 0);
console.log(`Wrote client-documents/invoices/${filename}`);
console.log(`  Invoice ${invoiceNumber} — ${args.venue} — $${total.toFixed(2)} AUD`);
