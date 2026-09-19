import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentStaff } from "@/lib/auth/session";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import { fetchPhotoLibraryImageBytes } from "@/lib/owner/photoLibraryUrl";

// Wizard-adjacency fix (CLAUDE.md standing principle) -- suggests
// manufacturer/model/serial from a nameplate photo so the owner can confirm
// or correct them, same "propose, never auto-save" convention as
// parse-cert/route.ts and parse-menu/route.ts. This route only reads the
// photo and returns a suggestion; nothing is written to the stations row
// here -- that happens via PATCH /api/owner/stations/[id] once the owner
// confirms, matching parse-cert's split between "read" and "save".

const MODEL = "claude-sonnet-5";

const proposeNameplateDetailsTool: Anthropic.Tool = {
  name: "propose_nameplate_details",
  description: "Return the manufacturer/model/serial read off an equipment nameplate photo, for the owner to confirm before anything is saved.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      manufacturer: { type: "string", description: "The equipment manufacturer/brand name as printed. Empty string if not legible." },
      model: { type: "string", description: "The model name or number as printed. Empty string if not legible." },
      serial: { type: "string", description: "The serial number as printed. Empty string if not legible." },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Confidence these fields were read correctly from the photo (photo quality, glare, worn sticker, etc.).",
      },
    },
    required: ["manufacturer", "model", "serial", "confidence"],
    additionalProperties: false,
  },
};

interface ProposedNameplateDetails {
  manufacturer: string;
  model: string;
  serial: string;
  confidence: "high" | "medium" | "low";
}

function isProposedNameplateDetails(value: unknown): value is ProposedNameplateDetails {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.manufacturer === "string" &&
    typeof v.model === "string" &&
    typeof v.serial === "string" &&
    typeof v.confidence === "string"
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const storagePath = typeof body?.storagePath === "string" ? body.storagePath : "";
  if (!storagePath) {
    return NextResponse.json({ error: "storagePath is required." }, { status: 400 });
  }

  let image;
  try {
    image = await fetchPhotoLibraryImageBytes(storagePath, staff.venue_id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't read the uploaded photo." },
      { status: 400 },
    );
  }

  const client = createAnthropicClient();
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system:
        "You are reading an equipment nameplate or model sticker photo (a fryer, dishwasher, fridge, or similar piece of hospitality equipment), for an owner to confirm before it's saved. Read only what's actually printed or stamped on the nameplate. Never guess or infer a manufacturer, model, or serial number that isn't legible -- return an empty string for that field instead, and reflect the real uncertainty in confidence.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
            { type: "text", text: "Read this equipment nameplate's details." },
          ],
        },
      ],
      tools: [proposeNameplateDetailsTool],
      tool_choice: { type: "tool", name: "propose_nameplate_details" },
      output_config: { effort: "medium" },
    });

    const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUseBlock || !isProposedNameplateDetails(toolUseBlock.input)) {
      throw new Error("Model did not return the expected structured response.");
    }

    const result = toolUseBlock.input;
    return NextResponse.json({
      manufacturer: result.manufacturer,
      model: result.model,
      serial: result.serial,
      confidence: result.confidence,
    });
  } catch (err) {
    console.error(`nameplate-analyze error for station ${id}:`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't read this nameplate right now." }, { status: 502 });
  }
}
