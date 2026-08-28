import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ModuleStatusActions } from "@/components/owner/ModuleStatusActions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  live: "Live",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "border-clay-brown/40",
  pending_approval: "border-saffron",
  approved: "border-bay-green",
  live: "border-bay-green",
};

export default async function OwnerModulesPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const supabase = await createClient();
  const { data: modules } = await supabase.from("modules").select("id, title, status, version").order("title");

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">Modules</h1>
        <div className="space-y-3">
          {(modules ?? []).map((m) => (
            <div key={m.id} className={`rounded-2xl border-2 ${STATUS_COLOR[m.status ?? "draft"]} px-4 py-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-ink">{m.title}</p>
                  <p className="font-mono text-xs text-clay-brown">
                    {STATUS_LABEL[m.status ?? "draft"]} · v{m.version}
                  </p>
                </div>
                <ModuleStatusActions moduleId={m.id} status={m.status ?? "draft"} />
              </div>
              <Link
                href={`/${venueSlug}/owner/modules/${m.id}/edit`}
                className="mt-2 inline-block font-mono text-xs text-clay-brown underline"
              >
                Edit content
              </Link>
              {m.status === "live" && (
                <Link
                  href={`/${venueSlug}/owner/modules/${m.id}/versions`}
                  className="mt-2 ml-3 inline-block font-mono text-xs text-clay-brown underline"
                >
                  Versions
                </Link>
              )}
            </div>
          ))}
          {(modules ?? []).length === 0 && (
            <p className="font-sans text-sm text-clay-brown">No modules yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
