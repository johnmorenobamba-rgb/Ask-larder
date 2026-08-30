import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { getPhotoLibraryUrl } from "@/lib/owner/photoLibraryUrl";
import { UploadPhotoForm } from "@/components/owner/UploadPhotoForm";

const TAGS = ["station", "module", "general", "hero"] as const;

export default async function OwnerPhotoLibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ venueSlug: string }>;
  searchParams: Promise<{ tag?: string }>;
}) {
  const { venueSlug } = await params;
  const { tag } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  let query = supabase
    .from("photo_library")
    .select("id, storage_path, tag, stations(name), modules(title), created_at")
    .order("created_at", { ascending: false });
  if (tag) query = query.eq("tag", tag);

  const [{ data: photos }, { data: stations }, { data: modules }] = await Promise.all([
    query,
    supabase.from("stations").select("id, name").order("name"),
    supabase.from("modules").select("id, title").order("title"),
  ]);

  const withUrls = await Promise.all(
    (photos ?? []).map(async (p) => ({ ...p, url: await getPhotoLibraryUrl(p.storage_path) })),
  );

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">Photo library</h1>

        <UploadPhotoForm venueId={staff!.venue_id!} stations={stations ?? []} modules={modules ?? []} />

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${venueSlug}/owner/photo-library`}
            className={`rounded-full border-2 px-4 py-1 font-mono text-xs uppercase ${
              !tag ? "border-preserve-red text-preserve-red" : "border-clay-brown/40 text-clay-brown"
            }`}
          >
            All
          </Link>
          {TAGS.map((t) => (
            <Link
              key={t}
              href={`/${venueSlug}/owner/photo-library?tag=${t}`}
              className={`rounded-full border-2 px-4 py-1 font-mono text-xs uppercase ${
                tag === t ? "border-preserve-red text-preserve-red" : "border-clay-brown/40 text-clay-brown"
              }`}
            >
              {t}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {withUrls.map((p) => (
            <div key={p.id} className="space-y-1 rounded-2xl border-2 border-clay-brown/20 p-2">
              {p.url && (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not worth next/image's optimization pipeline
                <img src={p.url} alt="" className="aspect-square w-full rounded-xl object-cover" />
              )}
              <p className="font-mono text-xs uppercase text-clay-brown">{p.tag}</p>
              {p.stations?.name && <p className="font-sans text-xs text-ink">{p.stations.name}</p>}
              {p.modules?.title && <p className="font-sans text-xs text-ink">{p.modules.title}</p>}
            </div>
          ))}
          {withUrls.length === 0 && (
            <p className="col-span-full font-sans text-sm text-clay-brown">No photos yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
