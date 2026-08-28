import { createClient } from "@/lib/supabase/server";
import { ResolveEscalationButton } from "@/components/owner/ResolveEscalationButton";

export default async function OwnerEscalationsPage() {
  const supabase = await createClient();

  const { data: escalations } = await supabase
    .from("chat_messages")
    .select("id, message, created_at, escalation_status, app_users(name), stations(name)")
    .eq("is_escalation", true)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">Escalations</h1>
        <div className="space-y-3">
          {(escalations ?? []).map((e) => (
            <div
              key={e.id}
              className={`rounded-2xl border-2 px-4 py-4 ${
                e.escalation_status === "resolved" ? "border-bay-green" : "border-preserve-red"
              }`}
            >
              <p className="font-mono text-xs text-clay-brown">
                {e.app_users?.name ?? "Unknown staff"}
                {e.stations?.name ? ` · ${e.stations.name}` : ""} ·{" "}
                {e.created_at ? new Date(e.created_at).toLocaleString() : ""}
              </p>
              <p className="font-sans text-ink">{e.message}</p>
              {e.escalation_status === "resolved" ? (
                <p className="font-sans text-sm text-bay-green">Resolved</p>
              ) : (
                <ResolveEscalationButton chatMessageId={e.id} />
              )}
            </div>
          ))}
          {(escalations ?? []).length === 0 && (
            <p className="font-sans text-sm text-clay-brown">No escalations yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
