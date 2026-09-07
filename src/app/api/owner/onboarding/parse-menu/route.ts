import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentStaff } from "@/lib/auth/session";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import { buildVisionContentBlock, fetchOnboardingUpload } from "@/lib/ai/onboardingUpload";

// Block Q5 -- wizard Page 8a (docs/block-q/q2-wizard-flow-and-schema.md §3,
// "menu-upload-parse"). Propose-only: this route never writes to
// menu_items. Q4's MenuReviewTable renders the response, the owner
// edits/confirms, and Q4's own menu-items route does the actual write --
// deliberately keeping exactly one write path into menu_items (manual grid
// and upload-parse both land there), so an unreviewed AI extraction can
// never hit the table directly.

const MODEL = "claude-sonnet-5";

// Confidence is a three-tier enum (high/medium/low), not a 0-1 float --
// simpler for the model to reason about consistently than a bare number,
// and just as usable for Q4's "visually flag uncertain extractions" UI.
type Confidence = "high" | "medium" | "low";

interface ProposedModifier {
  group: string;
  name: string;
  allergens_added: string[];
  allergens_removed: string[];
}

interface ProposedMenuItem {
  name: string;
  category: string;
  base_allergens: string[];
  description: string;
  confidence: Confidence;
  modifiers: ProposedModifier[];
}

const proposeMenuItemsTool: Anthropic.Tool = {
  name: "propose_menu_items",
  description:
    "Return the menu items extracted from the uploaded menu file, for owner review before anything is written to the database.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            category: { type: "string", description: "'food' or 'drink'." },
            base_allergens: {
              type: "array",
              items: { type: "string" },
              description:
                "Allergens inherent to the item as standardly served. Only include one the source genuinely indicates (an ingredient list, an allergen key/asterisk, or an obviously allergen-bearing dish, e.g. a milk-based drink containing dairy) -- never guess.",
            },
            description: { type: "string" },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Confidence this item and its fields were read correctly from the source file.",
            },
            modifiers: {
              type: "array",
              description:
                "Swap options explicitly shown for this item (GF bread, dairy-free milk, vegan protein, etc.). Empty array if the item has none -- never invent a swap the source doesn't actually offer.",
              items: {
                type: "object",
                properties: {
                  group: { type: "string", description: "e.g. 'Milk type', 'Bread', 'Protein swap'." },
                  name: { type: "string" },
                  allergens_added: {
                    type: "array",
                    items: { type: "string" },
                    description: "Allergens this option introduces vs. the base item.",
                  },
                  allergens_removed: {
                    type: "array",
                    items: { type: "string" },
                    description: "Allergens this option removes vs. the base item.",
                  },
                },
                required: ["group", "name", "allergens_added", "allergens_removed"],
                additionalProperties: false,
              },
            },
          },
          required: ["name", "category", "base_allergens", "description", "confidence", "modifiers"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
};

function isProposedItemsResult(value: unknown): value is { items: ProposedMenuItem[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Record<string, unknown>).items)
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const storagePath = typeof body?.storagePath === "string" ? body.storagePath : "";
  if (!storagePath) {
    return NextResponse.json({ error: "storagePath is required." }, { status: 400 });
  }

  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let file;
  try {
    file = await fetchOnboardingUpload(storagePath, staff.venue_id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't read the uploaded file." },
      { status: 400 },
    );
  }
  if (file.kind !== "image" && file.kind !== "pdf") {
    return NextResponse.json({ error: "Menu file must be a photo, image, or PDF." }, { status: 400 });
  }

  const client = createAnthropicClient();
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are extracting a structured menu from a photo or PDF of a real venue menu, for an owner to review and correct before anything is saved. Read every item carefully. Only include an allergen if the source genuinely indicates it -- never guess or invent one; leave base_allergens empty rather than inventing a plausible answer, and reflect real uncertainty in confidence instead. Capture swap options only when the menu explicitly shows them (e.g. 'GF bread +$1', 'sub oat milk', 'vegan available') -- do not invent modifiers the source doesn't offer.",
      messages: [
        {
          role: "user",
          content: [buildVisionContentBlock(file), { type: "text", text: "Extract every menu item from this file." }],
        },
      ],
      tools: [proposeMenuItemsTool],
      tool_choice: { type: "tool", name: "propose_menu_items" },
      output_config: { effort: "medium" },
    });

    const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUseBlock || !isProposedItemsResult(toolUseBlock.input)) {
      throw new Error("Model did not return the expected structured response.");
    }

    return NextResponse.json({ items: toolUseBlock.input.items });
  } catch (err) {
    console.error("parse-menu error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't parse this menu right now." }, { status: 502 });
  }
}
