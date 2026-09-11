import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { getWeeklyDigest, type DigestQuestion } from "@/lib/reports/weeklyDigest";

export default async function WeeklyReportPage() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const digest = await getWeeklyDigest(supabase, staff!.venue_id!, since.toISOString());

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Weekly report</h1>
          <p className="font-sans text-sm text-clay-brown">
            What staff asked Ask Larder in the last 7 days — use the gaps below to update your SOPs.
          </p>
        </div>

        <div className="rounded-2xl bg-clay-brown/10 px-4 py-3">
          <p className="font-display text-2xl text-ink">{digest.totalQuestions}</p>
          <p className="font-mono text-[10px] uppercase tracking-wide text-clay-brown">Questions asked this week</p>
        </div>

        <Section
          title="Not covered by any SOP"
          empty="No unanswered questions this week — Ask Larder covered everything staff asked."
          questions={digest.outOfScope}
          accent="border-preserve-red"
        />

        <Section
          title="Needed a supervisor"
          empty="No escalations this week."
          questions={digest.escalations}
          accent="border-saffron"
        />
      </div>
    </main>
  );
}

function Section({
  title,
  empty,
  questions,
  accent,
}: {
  title: string;
  empty: string;
  questions: DigestQuestion[];
  accent: string;
}) {
  return (
    <div className="space-y-2">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      {questions.length === 0 && <p className="font-sans text-sm text-clay-brown">{empty}</p>}
      {questions.map((q) => (
        <div key={q.question} className={`rounded-2xl border-2 ${accent} px-4 py-3`}>
          <p className="font-sans text-ink">{q.question}</p>
          <p className="font-mono text-xs text-clay-brown">
            Asked {q.count} time{q.count === 1 ? "" : "s"} · last {new Date(q.lastAskedAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
