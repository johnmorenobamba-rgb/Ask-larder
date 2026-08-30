"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tag = "station" | "module" | "general" | "hero";

export function UploadPhotoForm({
  venueId,
  stations,
  modules,
}: {
  venueId: string;
  stations: { id: string; name: string }[];
  modules: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [tag, setTag] = useState<Tag>("general");
  const [stationId, setStationId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file || loading) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const path = `${venueId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("photo-library").upload(path, file);
      if (uploadError) throw new Error(uploadError.message);

      const res = await fetch("/api/owner/photo-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: path,
          tag,
          stationId: stationId || null,
          moduleId: moduleId || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Couldn't save this photo.");
      }

      setFile(null);
      setStationId("");
      setModuleId("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this photo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
      <p className="font-display text-ink">Upload a photo</p>

      <label className="flex w-full cursor-pointer items-center justify-between rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink transition-colors hover:border-preserve-red">
        <span>{file ? file.name : "Choose a photo"}</span>
        <span className="font-mono text-xs text-clay-brown">Browse</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </label>

      <select
        value={tag}
        onChange={(e) => setTag(e.target.value as Tag)}
        className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
      >
        <option value="general">General</option>
        <option value="station">Station</option>
        <option value="module">Module</option>
        <option value="hero">Hero</option>
      </select>

      {tag === "station" && (
        <select
          value={stationId}
          onChange={(e) => setStationId(e.target.value)}
          className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
        >
          <option value="">No station</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}

      {tag === "module" && (
        <select
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
          className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
        >
          <option value="">No module</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      )}

      {error && <p className="font-sans text-sm text-preserve-red">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={loading || !file}
        className="rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
      >
        {loading ? "Uploading…" : "Upload"}
      </button>
    </div>
  );
}
