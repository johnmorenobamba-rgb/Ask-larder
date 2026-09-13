import type Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import { hasDashViolationDeep, stripDashArtifacts } from "@/lib/ai/dashCheck";

const MODEL = "claude-sonnet-5";

export interface IntakeAnswerForCuration {
  questionKey: string;
  prompt: string;
  questionType: string;
  answerText: string | null;
  attachmentExtractedText: string | null;
}

export interface CuratedSection {
  content: string;
  isRestricted: boolean;
}

export interface CuratedCheckQuestion {
  question: string;
  sectionIndex: number;
  options: string[];
  correctOptionIndex: number;
  correctiveText?: string;
}

export interface CurateModuleContentResult {
  sections: CuratedSection[];
  checkQuestions: CuratedCheckQuestion[];
}

// Block T5, call 1 of 2 -- turns one topic's guided-intake answers into the
// actual staff-facing module: sections plus multiple-choice check
// questions, in the same "## Heading" prose style this project's own
// content already uses (see scripts/seed-block-p-*.mjs). Source is the
// structured interview transcript, not free prose a specialist composed --
// the whole point of Block T is that this generation step has real,
// concrete answers to work from instead of guessing what belongs.
const SYSTEM_PROMPT = `You write staff training content for a hospitality venue's onboarding tool, from a structured interview transcript a specialist just ran with the venue.

Write in plain, direct, sentence-case language -- the way you'd explain it to a new hire standing next to you, not a formal policy document. Use "## Heading" for each section's title and occasional "**bold**" for a genuinely important phrase, matching this project's existing house style. Split the answers into 2-5 sections, grouped by what a new hire would actually need to know together, not one section per question.

Never invent a fact, a name, a number, a contact, or a step that isn't actually in the answers you were given. If an answer is thin or says "not applicable," don't pad it with generic filler -- write what's actually there, or skip a section entirely if there's nothing real to say.

If a safety-honesty answer states real, specific risk (e.g. "yes, there's genuine cross-contamination risk, we can't guarantee X"), that honesty must survive into the section content exactly that plainly -- never soften it into vague reassurance like "we take this seriously" or "we do our best." A safety-critical fact stated plainly in the interview must be written plainly in the module.

Mark a section isRestricted=true only if it states an actual secret a staff member would need tiered access to see (a safe combination, an alarm code, a till override) -- never for ordinary procedural content, even safety-critical procedural content.

For each section (except a restricted one -- a restricted section never gets a check question, since the question would have to reference the secret itself), write one multiple-choice check question with 2-4 options and mark which is correct. Questions should test whether someone actually read and understood the section, not trivia.

Never use a hyphen, en dash, or em dash as punctuation anywhere -- not standalone, not for an aside, not for a numeric range ("9am to 5pm," never "9am-5pm"). Rewrite the sentence structure around it; don't substitute a comma in the exact same spot. Genuine compound words (self-serve, e-signature) are fine, that's spelling, not punctuation. Never write the literal text of a unicode escape sequence for a dash either (like \\u2014) -- that string of characters is the same violation as the character itself.`;

const curateModuleTool: Anthropic.Tool = {
  name: "produce_module_content",
  description: "Return the staff-facing module content generated from this topic's guided intake answers.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            content: { type: "string", description: "Markdown-ish prose starting with a '## Heading' line." },
            isRestricted: { type: "boolean" },
          },
          required: ["content", "isRestricted"],
          additionalProperties: false,
        },
      },
      checkQuestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            sectionIndex: { type: "integer", description: "0-based index into the sections array this question checks." },
            options: { type: "array", items: { type: "string" }, description: "2 to 4 answer options." },
            correctOptionIndex: { type: "integer" },
            correctiveText: { type: "string", description: "Shown if the wrong option is picked. Empty string if not needed." },
          },
          required: ["question", "sectionIndex", "options", "correctOptionIndex", "correctiveText"],
          additionalProperties: false,
        },
      },
    },
    required: ["sections", "checkQuestions"],
    additionalProperties: false,
  },
};

function isCurateModuleContentResult(value: unknown): value is CurateModuleContentResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.sections) &&
    v.sections.every(
      (s) => typeof s === "object" && s !== null && typeof (s as Record<string, unknown>).content === "string" && typeof (s as Record<string, unknown>).isRestricted === "boolean",
    ) &&
    Array.isArray(v.checkQuestions)
  );
}

export async function curateModuleContent(
  topicLabel: string,
  venueName: string,
  answers: IntakeAnswerForCuration[],
): Promise<CurateModuleContentResult> {
  const transcriptBlock = answers
    .map((a) => {
      const attachment = a.attachmentExtractedText ? `\nAttached material: ${a.attachmentExtractedText}` : "";
      return `Q (${a.questionType}): ${a.prompt}\nA: ${a.answerText?.trim() || "(no answer given)"}${attachment}`;
    })
    .join("\n\n");

  const client = createAnthropicClient();
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    { type: "text", text: `Venue: ${venueName}\nTopic: ${topicLabel}\n\nInterview transcript:\n\n${transcriptBlock}` },
  ];

  async function produce(userMessage: string): Promise<CurateModuleContentResult> {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemBlocks,
      messages: [{ role: "user", content: userMessage }],
      tools: [curateModuleTool],
      tool_choice: { type: "tool", name: "produce_module_content" },
      output_config: { effort: "high" },
    });
    const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUseBlock || !isCurateModuleContentResult(toolUseBlock.input)) {
      throw new Error("Model did not return the expected module content structure.");
    }
    return toolUseBlock.input;
  }

  let result = await produce("Produce the module content for this topic.");
  if (hasDashViolationDeep(result)) {
    result = await produce(
      "Produce the module content for this topic again. Your previous attempt used a dash character (or the literal text of a dash's unicode escape sequence) somewhere, which this content can never contain -- rewrite every section and question so no hyphen, en dash, or em dash appears anywhere as punctuation, restructuring sentences instead of substituting a comma in the same spot. Genuine compound words are fine.",
    );
  }
  if (hasDashViolationDeep(result)) {
    result = {
      sections: result.sections.map((s) => ({ ...s, content: stripDashArtifacts(s.content) })),
      checkQuestions: result.checkQuestions.map((q) => ({
        ...q,
        question: stripDashArtifacts(q.question),
        options: q.options.map(stripDashArtifacts),
        correctiveText: q.correctiveText ? stripDashArtifacts(q.correctiveText) : q.correctiveText,
      })),
    };
  }

  const { sections, checkQuestions } = result;
  // Defensive, not trusting the model alone: a restricted section can never
  // carry a check question, matching persistModuleContent's own hard
  // validation -- drop rather than let a well-formed module fail to save
  // over a single mistaken question.
  const safeCheckQuestions = checkQuestions.filter((q) => !sections[q.sectionIndex]?.isRestricted);

  return { sections, checkQuestions: safeCheckQuestions };
}
