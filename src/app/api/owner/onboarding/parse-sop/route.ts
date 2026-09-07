import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import { buildVisionContentBlock, fetchOnboardingUpload } from "@/lib/ai/onboardingUpload";

// Block Q5 -- wizard Page 12, intake step 1 (docs/block-q/q2-wizard-flow-and-schema.md
// §3, "sop-ingest-and-chunk"). Writes a sop_source_documents row so the raw
// source material is retained and the gap-detection loop's downstream
// authoring step (module-sections, this session) has real text to work
// from -- no automated module generator exists anywhere in this codebase,
// so this route's only job is getting clean raw_content into the database,
// never generating module content itself.

const MODEL = "claude-sonnet-5";

const extractSopTextTool: Anthropic.Tool = {
  name: "extract_sop_text",
  description: "Return the full text content of the uploaded SOP source document or photo, transcribed as faithfully as possible.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      raw_content: {
        type: "string",
        description:
          "The complete extracted text, in reading order. Transcribe exactly what's written -- do not summarize, paraphrase, or fill in anything illegible. Where a word or section is genuinely unreadable, write '[illegible]' inline rather than guessing.",
      },
    },
    required: ["raw_content"],
    additionalProperties: false,
  },
};

function isExtractedText(value: unknown): value is { raw_content: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).raw_content === "string"
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const storagePath = typeof body?.storagePath === "string" ? body.storagePath : "";
  const venueId = typeof body?.venueId === "string" ? body.venueId : "";
  if (!storagePath || !venueId) {
    return NextResponse.json({ error: "storagePath and venueId are required." }, { status: 400 });
  }

  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (staff.venue_id !== venueId) {
    return NextResponse.json({ error: "venueId does not match the signed-in venue." }, { status: 403 });
  }

  let file;
  try {
    file = await fetchOnboardingUpload(storagePath, venueId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't read the uploaded file." },
      { status: 400 },
    );
  }
  if (file.kind === "unsupported") {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a .txt/.md file, a PDF, or a photo of the document." },
      { status: 400 },
    );
  }

  let rawContent: string;
  if (file.kind === "text") {
    // Non-AI fast path -- a plain text/markdown source needs no extraction.
    rawContent = file.text ?? "";
  } else {
    const client = createAnthropicClient();
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 8192,
        system:
          "You transcribe uploaded SOP source material (a scanned document, a photo of a printed page, or a PDF) into plain text for a training-content authoring pipeline. Transcribe faithfully -- every real word, in reading order -- never summarize or invent content that isn't legible.",
        messages: [
          {
            role: "user",
            content: [buildVisionContentBlock(file), { type: "text", text: "Transcribe this document's full text." }],
          },
        ],
        tools: [extractSopTextTool],
        tool_choice: { type: "tool", name: "extract_sop_text" },
        output_config: { effort: "medium" },
      });

      const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (!toolUseBlock || !isExtractedText(toolUseBlock.input)) {
        throw new Error("Model did not return the expected structured response.");
      }
      rawContent = toolUseBlock.input.raw_content;
    } catch (err) {
      console.error("parse-sop extraction error:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "Couldn't read this document right now." }, { status: 502 });
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sop_source_documents")
    .insert({
      venue_id: venueId,
      file_ref: storagePath,
      raw_content: rawContent,
      processed_status: "parsed",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("parse-sop insert error:", error?.message);
    return NextResponse.json({ error: "Couldn't save the parsed document." }, { status: 500 });
  }

  return NextResponse.json({ sopSourceDocumentId: data.id, rawContent });
}
