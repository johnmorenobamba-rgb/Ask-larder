import { createClient } from "@/lib/supabase/server";

export default async function OwnerCompletionsPage() {
  const supabase = await createClient();

  const { data: modules } = await supabase
    .from("modules")
    .select("id, title")
    .eq("status", "live")
    .order("title");

  const { data: staff } = await supabase.from("app_users").select("id, name").order("name");

  const { data: progress } = await supabase
    .from("staff_module_progress")
    .select("user_id, module_id, status, completed_at");

  const progressByKey = new Map(
    (progress ?? []).map((p) => [`${p.user_id}:${p.module_id}`, p]),
  );

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">Completion tracking</h1>
        {(modules ?? []).length === 0 ? (
          <p className="font-sans text-sm text-clay-brown">No live modules yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-sans text-sm">
              <thead>
                <tr>
                  <th className="border-b-2 border-clay-brown/40 px-3 py-2 text-left text-ink">Staff</th>
                  {(modules ?? []).map((m) => (
                    <th key={m.id} className="border-b-2 border-clay-brown/40 px-3 py-2 text-left text-ink">
                      {m.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(staff ?? []).map((s) => (
                  <tr key={s.id}>
                    <td className="border-b border-clay-brown/20 px-3 py-2 text-ink">{s.name}</td>
                    {(modules ?? []).map((m) => {
                      const p = progressByKey.get(`${s.id}:${m.id}`);
                      const status = p?.status ?? "not_started";
                      const label =
                        status === "completed" ? "Completed" : status === "in_progress" ? "In progress" : "Not started";
                      const color =
                        status === "completed"
                          ? "text-bay-green"
                          : status === "in_progress"
                            ? "text-saffron"
                            : "text-clay-brown/60";
                      return (
                        <td key={m.id} className={`border-b border-clay-brown/20 px-3 py-2 ${color}`}>
                          {label}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
