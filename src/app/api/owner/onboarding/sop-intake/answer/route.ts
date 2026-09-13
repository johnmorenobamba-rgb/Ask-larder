import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { scanForSensitiveContent } from "@/lib/security/detectSensitiveContent";

// Block T4 -- saves one answer from the guided-intake interview. Upserts on
// (venue_id, topic_key, question_key), same full-replace-on-resave
// convention used elsewhere in this wizard (a specialist can revisit and
// edit any answer, not just append).
//
// Block V1 -- both answerText (typed directly) and attachmentExtractedText
// (from a per-question photo/document upload) are scanned before this ever
// reaches the database. Blocking here, not just at generation time, is what
// keeps a card number or credential out of sop_intake_answers entirely --
// curateModuleContent/curateSopDocumentFromIntake can only leak what
// actually got stored.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const topicKey = typeof body?.topicKey === "string" ? body.topicKey : "";
  const questionKey = typeof body?.questionKey === "string" ? body.questionKey : "";
  const questionType = typeof body?.questionType === "string" ? body.questionType : "";
  const answerText = typeof body?.answerText === "string" ? body.answerText : "";
  const attachmentStoragePath = typeof body?.attachmentStoragePath === "string" ? body.attachmentStoragePath : null;
  const attachmentExtractedText = typeof body?.attachmentExtractedText === "string" ? body.attachmentExtractedText : null;

  if (!topicKey || !questionKey || !questionType) {
    return NextResponse.json({ error: "topicKey, questionKey, and questionType are required." }, { status: 400 });
  }

  const findings = [...scanForSensitiveContent(answerText), ...scanForSensitiveContent(attachmentExtractedText)];
  if (findings.length > 0) {
    return NextResponse.json({ error: findings[0].message, sensitiveContentBlocked: true }, { status: 422 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sop_intake_answers").upsert(
    {
      venue_id: staff.venue_id,
      topic_key: topicKey,
      question_key: questionKey,
      question_type: questionType,
      answer_text: answerText || null,
      attachment_storage_path: attachmentStoragePath,
      attachment_extracted_text: attachmentExtractedText,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "venue_id,topic_key,question_key" },
  );

  if (error) {
    console.error("sop-intake answer unexpected error:", error.message);
    return NextResponse.json({ error: "Couldn't save that answer." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
