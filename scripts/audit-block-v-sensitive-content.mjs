// Block V3 -- read-only audit of everything already stored, using the same
// detection logic V1 now enforces going forward. This never modifies or
// redacts anything it finds -- a real hit is a disclosure decision for a
// human, not a cleanup script's call to make silently.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { scanForSensitiveContent } from "../src/lib/security/detectSensitiveContent.ts";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function collectStrings(value, path, out) {
  if (typeof value === "string") {
    out.push([path, value]);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) collectStrings(v, `${path}.${k}`, out);
  }
}

const findings = [];

// 1. sop_intake_answers.answer_text (and attachment_extracted_text, since a
// document uploaded before this block existed could have carried one
// through unchecked).
{
  const { data, error } = await supabase
    .from("sop_intake_answers")
    .select("id, venue_id, topic_key, question_key, answer_text, attachment_extracted_text");
  if (error) throw error;
  for (const row of data ?? []) {
    for (const [field, text] of [
      ["answer_text", row.answer_text],
      ["attachment_extracted_text", row.attachment_extracted_text],
    ]) {
      const hits = scanForSensitiveContent(text);
      for (const hit of hits) {
        findings.push({ table: "sop_intake_answers", id: row.id, venue_id: row.venue_id, location: `${row.topic_key}.${row.question_key}.${field}`, kind: hit.kind, confidence: hit.confidence });
      }
    }
  }
}

// 2. module_sections.content
{
  const { data, error } = await supabase.from("module_sections").select("id, module_id, content");
  if (error) throw error;
  for (const row of data ?? []) {
    const hits = scanForSensitiveContent(row.content);
    for (const hit of hits) {
      findings.push({ table: "module_sections", id: row.id, module_id: row.module_id, location: "content", kind: hit.kind, confidence: hit.confidence });
    }
  }
}

// 3. sop_source_documents.raw_content
{
  const { data, error } = await supabase.from("sop_source_documents").select("id, venue_id, raw_content");
  if (error) throw error;
  for (const row of data ?? []) {
    const hits = scanForSensitiveContent(row.raw_content);
    for (const hit of hits) {
      findings.push({ table: "sop_source_documents", id: row.id, venue_id: row.venue_id, location: "raw_content", kind: hit.kind, confidence: hit.confidence });
    }
  }
}

// 4. sop_documents.content (jsonb -- scan every string field within it)
{
  const { data, error } = await supabase.from("sop_documents").select("id, module_id, content");
  if (error) throw error;
  for (const row of data ?? []) {
    const strings = [];
    collectStrings(row.content, "content", strings);
    for (const [path, text] of strings) {
      const hits = scanForSensitiveContent(text);
      for (const hit of hits) {
        findings.push({ table: "sop_documents", id: row.id, module_id: row.module_id, location: path, kind: hit.kind, confidence: hit.confidence });
      }
    }
  }
}

console.log(`Scanned sop_intake_answers, module_sections, sop_source_documents, sop_documents across all venues.\n`);
if (findings.length === 0) {
  console.log("No matches found in any table.");
} else {
  console.log(`${findings.length} finding(s):\n`);
  for (const f of findings) {
    console.log(JSON.stringify(f));
  }
}
