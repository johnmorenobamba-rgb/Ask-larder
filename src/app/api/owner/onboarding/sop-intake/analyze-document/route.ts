import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { PART_B_TOPICS } from "@/lib/onboarding/constants";
import { getQuestionsForTopic } from "@/lib/onboarding/sopQuestions";
import { detectSopGaps } from "@/lib/ai/detectSopGaps";
import { scanForSensitiveContent } from "@/lib/security/detectSensitiveContent";

// Block U2 -- the upload-first half of guided intake. The client already
// has rawContent from calling the existing /api/owner/onboarding/parse-sop
// endpoint (same upload mechanism SopInterview already uses per-question);
// this route records that as a topic-level source document, runs gap
// detection against the full question scaffold, and auto-fills every
// covered question into sop_intake_answers (answer_source:'document') so
// the specialist is only ever asked about genuine gaps afterward.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const venueId = staff.venue_id;

  const body = await request.json().catch(() => null);
  const topicKey = typeof body?.topicKey === "string" ? body.topicKey : "";
  const storagePath = typeof body?.storagePath === "string" ? body.storagePath : "";
  const rawContent = typeof body?.rawContent === "string" ? body.rawContent : "";
  if (!topicKey || !storagePath || !rawContent.trim()) {
    return NextResponse.json({ error: "topicKey, storagePath, and rawContent are required." }, { status: 400 });
  }

  const topic = PART_B_TOPICS.find((t) => t.key === topicKey);
  if (!topic) {
    return NextResponse.json({ error: "Unknown topic key." }, { status: 400 });
  }

  // Block V1 -- belt-and-suspenders alongside parse-sop's own scan: this
  // route persists sop_source_documents independently (topic-level upload,
  // not the per-question path parse-sop otherwise guards), so it re-checks
  // rather than trusting the client already went through a scanned path.
  const rawFindings = scanForSensitiveContent(rawContent);
  if (rawFindings.length > 0) {
    return NextResponse.json({ error: rawFindings[0].message, sensitiveContentBlocked: true }, { status: 422 });
  }

  const supabase = await createClient();
  const { error: sourceError } = await supabase.from("sop_source_documents").insert({
    venue_id: venueId,
    topic_key: topicKey,
    file_ref: storagePath,
    raw_content: rawContent,
    processed_status: "parsed",
  });
  if (sourceError) {
    console.error("analyze-document source insert error:", sourceError.message);
    return NextResponse.json({ error: "Couldn't save the uploaded document." }, { status: 500 });
  }

  const questions = getQuestionsForTopic(topicKey);
  let gaps;
  try {
    gaps = await detectSopGaps(topic.label, rawContent, questions);
  } catch (err) {
    console.error("analyze-document gap detection error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't analyze this document. Try again." }, { status: 502 });
  }

  // A per-question extracted answer is a newly-derived string, not just a
  // slice of rawContent already scanned above -- the model could restate or
  // reformat a sensitive value even when the raw scan didn't trip on the
  // source document's own formatting, so each one gets checked again before
  // it's stored. A question that trips this never silently disappears: it's
  // demoted back to a gap so the specialist is asked directly, rather than
  // being dropped from both `covered` and `gapKeys` and never asked at all.
  const coveredAll = gaps.filter((g) => g.covered && g.extractedAnswer?.trim());
  const covered = coveredAll.filter((g) => scanForSensitiveContent(g.extractedAnswer).length === 0);
  const sensitiveKeys = new Set(coveredAll.filter((g) => scanForSensitiveContent(g.extractedAnswer).length > 0).map((g) => g.questionKey));
  if (covered.length > 0) {
    const questionsByKey = new Map(questions.map((q) => [q.key, q]));
    const { error: answersError } = await supabase.from("sop_intake_answers").upsert(
      covered.map((g) => ({
        venue_id: venueId,
        topic_key: topicKey,
        question_key: g.questionKey,
        question_type: questionsByKey.get(g.questionKey)?.type ?? "universal",
        answer_text: g.extractedAnswer,
        answer_source: "document",
        attachment_storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "venue_id,topic_key,question_key" },
    );
    if (answersError) {
      console.error("analyze-document answers upsert error:", answersError.message);
      return NextResponse.json({ error: "Couldn't save the answers found in this document." }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    covered: covered.map((g) => ({ questionKey: g.questionKey, answerText: g.extractedAnswer })),
    gapKeys: gaps.filter((g) => !g.covered || sensitiveKeys.has(g.questionKey)).map((g) => g.questionKey),
  });
}
