import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { SuggestionFeed } from "@/components/owner/SuggestionFeed";
import { logQueryError } from "@/lib/supabase/logQueryError";

export default async function OwnerSuggestionsPage() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: suggestions, error } = await supabase
    .from("content_suggestions")
    .select("id, status, signal_type, evidence, headline, reasoning, proposed_content, blocked_reason, created_at, modules(id, title)")
    .eq("venue_id", staff!.venue_id!)
    .order("created_at", { ascending: false });
  logQueryError("owner suggestions", error);

  const pending = (suggestions ?? []).filter((s) => s.status === "pending");
  const resolved = (suggestions ?? []).filter((s) => s.status !== "pending").slice(0, 10);

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Suggestions</h1>
          <p className="font-sans text-sm text-clay-brown">
            Concrete, evidence backed ideas for strengthening your procedures, drawn from what staff have actually
            asked and reported. Every one is a draft. Nothing goes live until you approve it, the same review your
            own modules already go through.
          </p>
        </div>
        <SuggestionFeed pending={pending} resolved={resolved} />
      </div>
    </main>
  );
}
