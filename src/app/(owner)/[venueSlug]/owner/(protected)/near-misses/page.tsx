import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getNearMissPhotoUrl } from "@/lib/owner/nearMissPhotoUrl";
import { ResolveNearMissButton } from "@/components/owner/ResolveNearMissButton";
import { ScrollStackList } from "@/components/shared/ScrollStackList";

export default async function OwnerNearMissesPage({
  params,
  searchParams,
}: {
  params: Promise<{ venueSlug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { venueSlug } = await params;
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("near_miss_reports")
    .select("id, description, photo_ref, status, created_at, is_anonymous, app_users(name), stations(name)")
    .order("created_at", { ascending: false });
  if (status === "unresolved") query = query.eq("status", "open");
  const { data: reports } = await query;

  const withPhotoUrls = await Promise.all(
    (reports ?? []).map(async (r) => ({
      ...r,
      photoUrl: r.photo_ref ? await getNearMissPhotoUrl(r.photo_ref) : null,
    })),
  );

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold text-ink">Near-miss reports</h1>
          {status === "unresolved" && (
            <Link href={`/${venueSlug}/owner/near-misses`} className="font-mono text-xs text-clay-brown underline">
              Clear filter
            </Link>
          )}
        </div>
        <ScrollStackList className="space-y-3">
          {withPhotoUrls.map((r) => (
            <div
              key={r.id}
              className={`rounded-2xl border-2 bg-parchment px-4 py-4 ${
                r.status === "resolved" ? "border-bay-green" : "border-preserve-red"
              }`}
            >
              <p className="font-mono text-xs text-clay-brown">
                {r.is_anonymous ? "Anonymous" : (r.app_users?.name ?? "Unknown staff")}
                {r.stations?.name ? ` · ${r.stations.name}` : ""} ·{" "}
                {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
              </p>
              <p className="font-sans text-ink">{r.description}</p>
              {r.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not worth next/image's optimization pipeline
                <img src={r.photoUrl} alt="Near-miss report photo" className="mt-2 max-h-48 rounded-xl" />
              )}
              {r.status === "resolved" ? (
                <p className="font-sans text-sm text-bay-green">Resolved</p>
              ) : (
                <ResolveNearMissButton reportId={r.id} />
              )}
            </div>
          ))}
          {withPhotoUrls.length === 0 && (
            <p className="font-sans text-sm text-clay-brown">No reports yet.</p>
          )}
        </ScrollStackList>
      </div>
    </main>
  );
}
