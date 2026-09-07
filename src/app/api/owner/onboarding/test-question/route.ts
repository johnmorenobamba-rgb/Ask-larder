import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import { embedTexts } from "@/lib/ai/voyage";

// Block Q5 -- wizard Page 12 gap-detection loop, the actual self-consistency
// check (docs/block-q/q2-wizard-flow-and-schema.md §3 Page 12 step 3; Q1
// Part D.2.3). Deliberately uses match_knowledge_chunks_for_authoring
// (migration 20260907130000) instead of match_knowledge_chunks -- see that
// migration's own comment for why the status='live' filter would make this
// route return nothing for every draft module.

const MODEL = "claude-sonnet-5";

const answerFromRetrievedTool: Anthropic.Tool = {
  name: "answer_from_retrieved_content",
  description: "Answer the test question using only the retrieved content, and say plainly whether it was actually answerable from that content alone.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      answer: {
        type: "string",
        description: "The answer, drawn only from the retrieved content. If the content doesn't cover this, say so plainly instead of guessing.",
      },
      could_answer: {
        type: "boolean",
        description:
          "True if the retrieved content addresses what the question is actually asking, even if the content itself honestly says a detail is unconfirmed or names who to check with instead of stating a fact outright -- that is a real, correct answer, not a gap. False only if you had to guess or infer something the content never states, or the content doesn't address this question's topic at all. Do not set false merely because some fact adjacent to the answer is uncertain -- judge whether the QUESTION was answered, not whether every fact mentioned in doing so is independently confirmed.",
      },
    },
    required: ["answer", "could_answer"],
    additionalProperties: false,
  },
};

function isAnswerResult(value: unknown): value is { answer: string; could_answer: boolean } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.answer === "string" && typeof v.could_answer === "boolean";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const moduleId = typeof body?.moduleId === "string" ? body.moduleId : "";
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!moduleId || !question) {
    return NextResponse.json({ error: "moduleId and question are required." }, { status: 400 });
  }

  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();

  // Also serves as the "topic_key -- look it up via the module" source
  // (task brief, module-sections spec): modules has no dedicated topic_key
  // column (the wizard's topicKey field is never persisted there -- only
  // module-sections' request carries it, transiently, for that call), and
  // onboarding_content_checks.topic_key is a plain, unconstrained text
  // column, not an FK -- so the module's own title is the most useful
  // stable label available to log here.
  const { data: moduleRow, error: moduleError } = await supabase
    .from("modules")
    .select("id, venue_id, title")
    .eq("id", moduleId)
    .maybeSingle();
  if (moduleError) {
    console.error("test-question module lookup error:", moduleError.message);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  if (!moduleRow || moduleRow.venue_id !== staff.venue_id) {
    return NextResponse.json({ error: "Module not found for this venue." }, { status: 404 });
  }

  let queryEmbedding: number[];
  try {
    [queryEmbedding] = await embedTexts([question], "query");
  } catch (err) {
    console.error("test-question embedding error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't process that question right now." }, { status: 502 });
  }

  const { data: chunks, error: retrievalError } = await supabase.rpc("match_knowledge_chunks_for_authoring", {
    p_query_embedding: queryEmbedding as unknown as string,
    p_source_module_id: moduleId,
    p_match_count: 8,
  });
  if (retrievalError) {
    console.error("test-question retrieval error:", retrievalError.message);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  const retrievedText =
    chunks && chunks.length > 0
      ? chunks.map((c, i) => `[${i + 1}] ${c.content_chunk}`).join("\n\n")
      : "(no matching content found in this module yet)";

  const client = createAnthropicClient();
  let toolResult: { answer: string; could_answer: boolean };
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "You are running a draft-content spot check for an onboarding specialist authoring a staff training module -- not answering a real staff member's question. Answer the test question using ONLY the retrieved content below. Never use general knowledge, and never guess or fill a gap with a plausible-sounding answer.\n\n" +
        "Judge could_answer on whether the QUESTION was answered, not on whether every fact mentioned along the way is independently confirmed. An honest answer that directly addresses the question -- including one that says a specific detail isn't confirmed yet and names who to check with, or gives a real procedure to follow instead of a fact -- is a correct, complete answer and should be marked could_answer: true. This is the same no-fabrication discipline the rest of this product is built on: content that honestly reports uncertainty is doing its job correctly, and this check exists to catch content that's actually silent or evasive on the question's topic, not to demand every adjacent fact be nailed down.\n\n" +
        "Set could_answer to false only when the retrieved content doesn't address what this question is actually asking about, or when answering it would require guessing or inferring something never stated. If that happens, say so plainly (e.g. \"this isn't covered in what's written yet\") -- that is the real, useful gap this check exists to find.",
      messages: [
        {
          role: "user",
          content: `Retrieved module content:\n${retrievedText}\n\nTest question: ${question}`,
        },
      ],
      tools: [answerFromRetrievedTool],
      tool_choice: { type: "tool", name: "answer_from_retrieved_content" },
      output_config: { effort: "medium" },
    });

    const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUseBlock || !isAnswerResult(toolUseBlock.input)) {
      throw new Error("Model did not return the expected structured response.");
    }
    toolResult = toolUseBlock.input;
  } catch (err) {
    console.error("test-question generation error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't get an answer right now." }, { status: 502 });
  }

  const { error: insertError } = await supabase.from("onboarding_content_checks").insert({
    venue_id: staff.venue_id,
    module_id: moduleId,
    topic_key: moduleRow.title,
    test_question: question,
    answer: toolResult.answer,
    could_answer: toolResult.could_answer,
    self_consistency_checked: false,
  });
  if (insertError) {
    // Don't fail the request over a logging write -- the owner still gets
    // the gap-detection result, but this is worth knowing about.
    console.error("test-question log insert error:", insertError.message);
  }

  return NextResponse.json({ answer: toolResult.answer, couldAnswer: toolResult.could_answer });
}
