// No `server-only` guard -- same reasoning as anthropic.ts: this needs to
// stay importable from a standalone tsx script for headless testing
// (server-only throws unconditionally outside Next's bundler).
import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import { checkVerbatimOverlap } from "@/lib/ai/verbatimOverlapCheck";

const MODEL = "claude-sonnet-5";
const MAX_LOOP_TURNS = 8;
const MAX_FETCH_TEXT_CHARS = 12000;

export interface EquipmentContentResult {
  foundRealSource: boolean;
  citationTitle: string | null;
  citationUrl: string | null;
  sopContent: string;
  moduleSections: string[];
  faqs: { question: string; answer: string }[];
  troubleshooting: { issueTitle: string; diagnosisSteps: string; resolutionText: string; escalationRequired: boolean }[];
  // Per-field verbatim-overlap outcome, so the caller (and the report to
  // the founder) can see exactly what was withheld and why, rather than
  // silently dropping content.
  withheldFields: string[];
}

interface ProposedContent {
  found_real_source: boolean;
  citation_title: string;
  citation_url: string;
  sop_content: string;
  module_sections: string[];
  faqs: { question: string; answer: string }[];
  troubleshooting: { issue_title: string; diagnosis_steps: string; resolution_text: string; escalation_required: boolean }[];
}

const proposeContentTool: Anthropic.Tool = {
  name: "propose_equipment_content",
  description: "Return the final drafted content for this piece of equipment, once research is complete (or once you've determined no reliable source exists).",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      found_real_source: {
        type: "boolean",
        description: "True only if you found a genuine, specific, reasonably reliable source for THIS model (a real manufacturer manual, support page, or parts/FAQ page that actually names this model). False if search/fetch turned up nothing specific enough to trust.",
      },
      citation_title: {
        type: "string",
        description: "The real source's title/name if found_real_source is true. If false, exactly: 'Standard hospitality practice'.",
      },
      citation_url: {
        type: "string",
        description: "The real source URL if found_real_source is true. Empty string if false.",
      },
      sop_content: {
        type: "string",
        description: "A 3-6 paragraph SOP-style procedure write-up for operating, cleaning, and maintaining this equipment, in Larder's own plain onboarding voice. Must be a genuine rewrite of anything sourced -- never copy sentences from the source, even lightly edited. If found_real_source is false, this must be generic best-practice content for this equipment TYPE, with no model-specific claims (no specific error codes, cycle times, or settings that could be wrong for this exact unit).",
      },
      // minItems is only accepted by the API for values of 0 or 1 in strict
      // mode (confirmed live: anything higher 400s the request), so it
      // cannot structurally guarantee "3-5" here -- that's enforced by the
      // post-generation count check + retry in researchEquipmentContent
      // below instead. minItems:1 still catches a truly empty array.
      module_sections: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        description: "EXACTLY 2 to 4 short training-module section texts (markdown, matching this app's module content style) breaking the SOP into digestible training content. Never fewer than 2, regardless of how much or little source material you found -- a generic fallback still needs real, useful training content, not a token gesture.",
      },
      faqs: {
        type: "array",
        items: {
          type: "object",
          properties: { question: { type: "string" }, answer: { type: "string" } },
          required: ["question", "answer"],
          additionalProperties: false,
        },
        minItems: 1,
        description: "EXACTLY 3 to 5 real FAQs a staff member would actually ask about this equipment (how-to and common confusion points). Never fewer than 3 -- if you found less model-specific material, use more generic-but-genuinely-useful FAQs about this equipment type to reach the minimum, don't just stop at 1.",
      },
      troubleshooting: {
        type: "array",
        items: {
          type: "object",
          properties: {
            issue_title: { type: "string", description: "e.g. 'Won't turn on', 'Error code E4', 'Not reaching temperature'." },
            diagnosis_steps: { type: "string" },
            resolution_text: { type: "string" },
            escalation_required: { type: "boolean", description: "True if this issue should never be attempted by staff and must go straight to a technician/supervisor." },
          },
          required: ["issue_title", "diagnosis_steps", "resolution_text", "escalation_required"],
          additionalProperties: false,
        },
        minItems: 1,
        description: "EXACTLY 3 to 5 real troubleshooting entries. If found_real_source is true and the source mentions actual error codes, use them (reworded, not copied). If false, use only generic issues true of this equipment type (won't power on, not heating/cooling, unusual noise), never invented model-specific error codes. Never fewer than 3.",
      },
    },
    required: ["found_real_source", "citation_title", "citation_url", "sop_content", "module_sections", "faqs", "troubleshooting"],
    additionalProperties: false,
  },
};

const fetchUrlTool: Anthropic.Tool = {
  name: "fetch_url",
  description: "Fetch a web page or PDF's real content by URL, to read beyond a search result's snippet. Use this on the most promising search result(s) before drafting anything.",
  input_schema: {
    type: "object",
    properties: { url: { type: "string", description: "The exact URL to fetch." } },
    required: ["url"],
    additionalProperties: false,
  },
};

async function fetchUrlContent(url: string): Promise<(Anthropic.TextBlockParam | Anthropic.DocumentBlockParam)[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LarderResearchBot/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [{ type: "text", text: `Fetch failed: HTTP ${res.status}` }];

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/pdf")) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 25 * 1024 * 1024) return [{ type: "text", text: "PDF too large to read (over 25MB)." }];
      return [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } }];
    }

    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    return [{ type: "text", text: text.slice(0, MAX_FETCH_TEXT_CHARS) }];
  } catch (err) {
    return [{ type: "text", text: `Fetch failed: ${err instanceof Error ? err.message : "unknown error"}` }];
  }
}

// A truncated tool call has, in practice, produced structurally-valid JSON
// (passes the shape check below) whose string fields contain leaked
// tool-call/XML serialization fragments instead of real prose -- confirmed
// live at max_tokens:4096. isProposedContent alone can't catch that; this
// looks for the actual telltale markers.
function looksCorrupted(text: string): boolean {
  return /<\/?(antml|parameter)[_:]/i.test(text) || /<parameter name=/i.test(text);
}

const MIN_MODULE_SECTIONS = 2;
const MIN_FAQS = 3;
const MIN_TROUBLESHOOTING = 3;

function describeThinness(value: ProposedContent): string | null {
  const issues: string[] = [];
  if (value.module_sections.length < MIN_MODULE_SECTIONS) issues.push(`only ${value.module_sections.length} module section(s), need at least ${MIN_MODULE_SECTIONS}`);
  if (value.faqs.length < MIN_FAQS) issues.push(`only ${value.faqs.length} FAQ(s), need at least ${MIN_FAQS}`);
  if (value.troubleshooting.length < MIN_TROUBLESHOOTING) issues.push(`only ${value.troubleshooting.length} troubleshooting entry(ies), need at least ${MIN_TROUBLESHOOTING}`);
  return issues.length > 0 ? issues.join("; ") : null;
}

function isProposedContent(value: unknown): value is ProposedContent {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (
    typeof v.found_real_source !== "boolean" ||
    typeof v.sop_content !== "string" ||
    !Array.isArray(v.module_sections) ||
    !Array.isArray(v.faqs) ||
    !Array.isArray(v.troubleshooting)
  ) {
    return false;
  }
  if (looksCorrupted(v.sop_content) || looksCorrupted(String(v.citation_title ?? "")) || looksCorrupted(String(v.citation_url ?? ""))) {
    return false;
  }
  return true;
}

/**
 * Equipment-sourced content pipeline (Correction 2): a real multi-turn
 * agentic loop -- web_search (Anthropic's server-side tool) plus a custom
 * fetch_url tool for full page/PDF content beyond a search snippet -- that
 * searches for the actual manufacturer manual/FAQ/error-code content for a
 * specific model/serial, reads what it finds, and drafts SOP + module +
 * FAQ + troubleshooting content rewritten in Larder's voice. Falls back to
 * generic standard-fill content (never a fabricated model-specific claim)
 * when nothing reliable turns up. Every fetched page's text is retained
 * and used to run checkVerbatimOverlap against every drafted field before
 * this function returns -- a flagged field gets one rewrite attempt, then
 * is withheld (returned empty, listed in withheldFields) rather than risk
 * shipping copied text.
 */
export async function researchEquipmentContent(params: {
  stationName: string;
  manufacturer: string;
  model: string;
  serial: string;
}): Promise<EquipmentContentResult> {
  const client = createAnthropicClient();
  const { stationName, manufacturer, model, serial } = params;

  const systemPrompt = `You are researching real-world documentation for one specific piece of hospitality equipment, to help draft staff training content for it.

Equipment: ${manufacturer} ${model} (serial ${serial}), used at the "${stationName}" station.

Your job:
1. Use web_search to find the actual manufacturer's manual, support page, FAQ, or error-code documentation for THIS SPECIFIC MODEL. Try a few different real search queries if the first doesn't turn up a specific match.
2. Use fetch_url on the most promising result(s) to actually read the content -- a search snippet alone isn't enough to draft from.
3. Judge honestly whether what you found is genuinely specific to this model (not just the brand in general, not a different model in the same product line unless it's close enough that its operation is genuinely representative). If you can't find anything reliably model-specific, that's a normal, expected outcome -- say so plainly rather than stretching a loose match.
4. Once you've either found real source material or concluded nothing reliable exists, call propose_equipment_content with your final answer.

Non-negotiable rules:
- Never present model-specific detail (an exact error code, a specific cycle time, a specific setting) unless you actually read it in a real source for this model. If you're falling back to generic content, keep it genuinely generic -- true of this equipment TYPE broadly, not invented specifics dressed up as fact.
- Everything you write must be a genuine rewrite in your own words, in a plain, direct onboarding-training voice -- never copy or lightly edit sentences from a source. This is a real copyright requirement, not a style preference.
- Call propose_equipment_content exactly once, when you're actually done researching -- don't call it prematurely just to end the conversation.`;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Research and draft content for the ${manufacturer} ${model} at the ${stationName} station.` },
  ];

  const fetchedTexts: string[] = [];
  let proposed: ProposedContent | null = null;

  for (let turn = 0; turn < MAX_LOOP_TURNS && !proposed; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      // The full propose_equipment_content payload (SOP + 2-4 sections +
      // 3-5 FAQs + 3-5 troubleshooting entries) legitimately runs well past
      // 4096 tokens -- confirmed live: at 4096 the call truncated mid-JSON,
      // which both corrupted string fields with partial tool-serialization
      // artifacts AND left a dangling, unresolved tool_use block that broke
      // the *next* API call with a 400 (every tool_use needs a matching
      // tool_result in the following message, including a truncated one).
      max_tokens: 8192,
      system: systemPrompt,
      messages,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }, fetchUrlTool, proposeContentTool],
    });

    messages.push({ role: "assistant", content: response.content });

    const clientToolCalls = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    const fetchCalls = clientToolCalls.filter((b) => b.name === "fetch_url");
    const proposeCall = clientToolCalls.find((b) => b.name === "propose_equipment_content");

    // Every tool_use in this turn needs a tool_result in the very next
    // message, unconditionally -- including propose_equipment_content
    // (even a successful one still needs a tool_result acknowledging the
    // call before the conversation could continue), and including a
    // propose_equipment_content that came back truncated/malformed
    // (stop_reason 'max_tokens' cutting the JSON mid-field). Skipping this
    // for "the terminal case" is exactly the bug that crashed Wash-up.
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    if (proposeCall) {
      const thinness = isProposedContent(proposeCall.input) ? describeThinness(proposeCall.input) : null;
      if (response.stop_reason === "max_tokens" || !isProposedContent(proposeCall.input)) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: proposeCall.id,
          content: [{ type: "text", text: "That call didn't come through completely. Try again with a more concise draft." }],
        });
      } else if (thinness) {
        // Real bug found live (Moretti Forni P110E, generic-fallback run):
        // the model can return a structurally-valid but far-too-thin
        // response (1 section/1 FAQ/1 issue against Bar/Cellar's 4-5 each
        // on the exact same fallback path) -- strict mode's minItems can
        // only enforce "at least 1" (confirmed: values above 1 400 the
        // request), so this application-level check + forced retry is the
        // real enforcement mechanism, not the schema description text.
        toolResults.push({
          type: "tool_result",
          tool_use_id: proposeCall.id,
          content: [{ type: "text", text: `Too thin: ${thinness}. Provide the full 2-4 module sections, 3-5 FAQs, and 3-5 troubleshooting entries as instructed, even on a generic fallback -- call propose_equipment_content again with the complete set.` }],
        });
      } else {
        proposed = proposeCall.input;
        toolResults.push({ type: "tool_result", tool_use_id: proposeCall.id, content: [{ type: "text", text: "Received." }] });
      }
    }

    for (const call of fetchCalls) {
      const url = (call.input as { url?: string }).url ?? "";
      const content = await fetchUrlContent(url);
      for (const block of content) {
        if (block.type === "text") fetchedTexts.push(block.text);
      }
      toolResults.push({ type: "tool_result", tool_use_id: call.id, content });
    }

    if (proposed) break;

    if (toolResults.length > 0) {
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Model used web_search only (server-resolved within this same turn,
    // no client action needed) or stopped without proposing -- nudge it to
    // finish rather than silently giving up after one loop.
    if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
      messages.push({
        role: "user",
        content: "Continue researching if you haven't found a specific enough source yet, or call propose_equipment_content now with your final answer.",
      });
    }
  }

  if (!proposed) {
    // Fail-safe: never leave a station with nothing. Generic fallback,
    // clearly marked, no fabricated model-specific detail.
    return {
      foundRealSource: false,
      citationTitle: "Standard hospitality practice",
      citationUrl: null,
      sopContent: `Research for the ${manufacturer} ${model} did not complete with a usable result. This entry needs manual authoring -- do not treat this placeholder as real content.`,
      moduleSections: [],
      faqs: [],
      troubleshooting: [],
      withheldFields: ["all (research loop did not complete)"],
    };
  }

  const allFetchedText = fetchedTexts.join("\n\n");
  const withheldFields: string[] = [];

  async function verifyOrRewrite(fieldLabel: string, text: string, rewriteInstruction: string): Promise<string> {
    if (!text.trim() || allFetchedText.length === 0) return text;
    let candidate = text;
    let overlap = checkVerbatimOverlap(candidate, allFetchedText);
    if (!overlap.flagged) return candidate;

    // One retry: ask for a genuinely different rewrite of this exact field.
    const retryResponse = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: "You previously drafted content that was too close to verbatim to its source. Rewrite it substantially differently -- different sentence structure and phrasing -- while preserving the real meaning. Do not just swap a few synonyms.",
      messages: [
        {
          role: "user",
          content: `Original source excerpt this was drawn from:\n"""${allFetchedText.slice(0, 4000)}"""\n\nYour previous ${fieldLabel} (too close to verbatim):\n"""${candidate}"""\n\n${rewriteInstruction}`,
        },
      ],
    });
    const retryText = retryResponse.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
    overlap = checkVerbatimOverlap(retryText, allFetchedText);
    if (!overlap.flagged && retryText.trim()) return retryText;

    withheldFields.push(fieldLabel);
    return "";
  }

  const sopContent = await verifyOrRewrite("sopContent", proposed.sop_content, "Rewrite the SOP content.");
  const moduleSections: string[] = [];
  for (let i = 0; i < proposed.module_sections.length; i++) {
    const rewritten = await verifyOrRewrite(`moduleSections[${i}]`, proposed.module_sections[i], "Rewrite this training-module section.");
    if (rewritten) moduleSections.push(rewritten);
  }
  const faqs: { question: string; answer: string }[] = [];
  for (let i = 0; i < proposed.faqs.length; i++) {
    const answer = await verifyOrRewrite(`faqs[${i}].answer`, proposed.faqs[i].answer, "Rewrite this FAQ answer.");
    if (answer) faqs.push({ question: proposed.faqs[i].question, answer });
  }
  const troubleshooting: EquipmentContentResult["troubleshooting"] = [];
  for (let i = 0; i < proposed.troubleshooting.length; i++) {
    const t = proposed.troubleshooting[i];
    const resolutionText = await verifyOrRewrite(`troubleshooting[${i}].resolutionText`, t.resolution_text, "Rewrite this resolution text.");
    if (resolutionText) {
      troubleshooting.push({
        issueTitle: t.issue_title,
        diagnosisSteps: t.diagnosis_steps,
        resolutionText,
        escalationRequired: t.escalation_required,
      });
    }
  }

  // Defensive sanitization: a malformed/truncated tool call has, in
  // practice, produced garbage (partial tool-serialization syntax) inside
  // these two plain string fields even when isProposedContent's structural
  // check passed. A citation the founder might actually see should never
  // be an unvalidated raw model string.
  const sanitizedCitationUrl = /^https?:\/\/\S+$/.test(proposed.citation_url?.trim() ?? "") ? proposed.citation_url.trim() : null;
  const rawTitle = (proposed.citation_title ?? "").trim();
  const sanitizedCitationTitle =
    rawTitle && rawTitle.length < 200 && !rawTitle.includes("<") && !rawTitle.includes(">")
      ? rawTitle
      : proposed.found_real_source
        ? null
        : "Standard hospitality practice";

  return {
    foundRealSource: proposed.found_real_source,
    citationTitle: sanitizedCitationTitle,
    citationUrl: sanitizedCitationUrl,
    sopContent,
    moduleSections,
    faqs,
    troubleshooting,
    withheldFields,
  };
}
