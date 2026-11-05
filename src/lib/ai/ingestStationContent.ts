// No `server-only` guard, for the same reason as ingestModule.ts: this is
// imported by Next.js API routes AND by scripts/ingest-stations.ts, a
// standalone script where `server-only` throws unconditionally. The Supabase
// client is passed in: a route passes its request-scoped, RLS-respecting client
// (the caller is already verified manager tier for this venue, and
// knowledge_chunks' venue_isolation policy lets them write their own venue's
// rows); the script passes a service-role client.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { embedTexts } from "@/lib/ai/voyage";

interface StationRow {
  id: string;
  name: string;
  venue_id: string | null;
  equipment_manufacturer: string | null;
  equipment_model: string | null;
}

export interface ApprovedStationContent {
  station: StationRow;
  /** One self-contained text per approved entry, troubleshooting first. */
  entries: string[];
}

function stationLabel(station: StationRow): string {
  const equipment = [station.equipment_manufacturer, station.equipment_model]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" ");
  return equipment ? `${station.name} station (${equipment})` : `${station.name} station`;
}

/**
 * Loads a station and its APPROVED FAQs and troubleshooting entries, formatted
 * as self-contained texts. Each text names the station and equipment so it
 * still makes sense on its own as a retrieved chunk, with no surrounding
 * context. Pending entries are never included: the owner approval gate decides
 * what Ask Larder can say.
 *
 * Shared by ingestStationContent (embedding) and the Ask Larder route (the
 * deterministic "asked from this station" context block), so both say exactly
 * the same thing.
 */
export async function loadApprovedStationContent(
  stationId: string,
  supabase: SupabaseClient<Database>,
): Promise<ApprovedStationContent | null> {
  const { data: station, error: stationError } = await supabase
    .from("stations")
    .select("id, name, venue_id, equipment_manufacturer, equipment_model")
    .eq("id", stationId)
    .maybeSingle();
  if (stationError) throw new Error(stationError.message);
  if (!station) return null;

  const [{ data: issues, error: issuesError }, { data: faqs, error: faqsError }] = await Promise.all([
    supabase
      .from("station_troubleshooting_issues")
      .select("issue_title, diagnosis_steps, resolution_text, escalation_required")
      .eq("station_id", stationId)
      .eq("status", "approved")
      .order("created_at"),
    supabase
      .from("station_faqs")
      .select("question, answer")
      .eq("station_id", stationId)
      .eq("status", "approved")
      .order("created_at"),
  ]);
  if (issuesError) throw new Error(issuesError.message);
  if (faqsError) throw new Error(faqsError.message);

  const label = stationLabel(station);
  const entries: string[] = [];
  for (const issue of issues ?? []) {
    const parts = [
      `${label} troubleshooting.`,
      `Problem: ${issue.issue_title.trim()}.`,
      `Try this: ${issue.diagnosis_steps.trim()}`,
      `Then: ${issue.resolution_text.trim()}`,
    ];
    if (issue.escalation_required) {
      // escalation_required is a real field on the entry; keep the wording
      // generic so it never adds a step the venue didn't write.
      parts.push("If this does not fix it, tell your supervisor.");
    }
    entries.push(parts.join(" "));
  }
  for (const faq of faqs ?? []) {
    entries.push(`${label} FAQ. Q: ${faq.question.trim()} A: ${faq.answer.trim()}`);
  }

  return { station, entries };
}

export interface IngestStationResult {
  chunkCount: number;
  stationName: string;
}

/**
 * Embeds a station's approved FAQs and troubleshooting entries and replaces
 * that station's knowledge_chunks rows (delete-then-insert by
 * source_station_id, safe to rerun). With no approved entries left, the
 * station's chunks are deleted. One chunk per entry; entries are short, so no
 * further splitting. Station content is never restricted-tier.
 */
export async function ingestStationContent(
  stationId: string,
  supabase: SupabaseClient<Database>,
): Promise<IngestStationResult> {
  const content = await loadApprovedStationContent(stationId, supabase);
  if (!content) throw new Error(`Station ${stationId} not found.`);
  const { station, entries } = content;
  if (!station.venue_id) throw new Error(`Station ${stationId} has no venue.`);

  // Embed before deleting, so a Voyage failure leaves the old chunks in place
  // rather than leaving the station with nothing.
  const embeddings = entries.length > 0 ? await embedTexts(entries, "document") : [];

  const { error: deleteError } = await supabase.from("knowledge_chunks").delete().eq("source_station_id", stationId);
  if (deleteError) throw new Error(deleteError.message);

  if (entries.length > 0) {
    const { error: insertError } = await supabase.from("knowledge_chunks").insert(
      entries.map((text, i) => ({
        venue_id: station.venue_id,
        source_station_id: stationId,
        content_chunk: text,
        is_restricted: false,
        embedding: embeddings[i] as unknown as string,
      })),
    );
    if (insertError) throw new Error(insertError.message);
  }

  return { chunkCount: entries.length, stationName: station.name };
}

/**
 * Best-effort wrapper for request handlers: a status change has already been
 * saved, so an embedding failure is logged, not surfaced as a failed request.
 * The backfill script (scripts/ingest-stations.ts) repairs any station left
 * stale.
 */
export async function ingestStationContentBestEffort(
  stationId: string,
  supabase: SupabaseClient<Database>,
  context: string,
): Promise<void> {
  try {
    await ingestStationContent(stationId, supabase);
  } catch (err) {
    console.error(`[${context}] station ingest failed for ${stationId}:`, err instanceof Error ? err.message : err);
  }
}
