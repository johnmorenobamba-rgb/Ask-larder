"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/photos/compressImageFile";

// Same upload mechanism as UploadPhotoForm.tsx (Storage upload, then a
// photo_library insert), just scoped to one station and always tag
// "station" -- a one-click affordance right on the Stations page itself,
// instead of sending an owner to the separate Photos tab and hunting for
// this station in a dropdown there.
export function StationPhotoUpload({ venueId, stationId }: { venueId: string; stationId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const compressed = await compressImageFile(file);
      const supabase = createClient();
      const path = `${venueId}/${crypto.randomUUID()}-${compressed.name}`;
      const { error: uploadError } = await supabase.storage.from("photo-library").upload(path, compressed);
      if (uploadError) throw new Error(uploadError.message);

      const res = await fetch("/api/owner/photo-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath: path, tag: "station", stationId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't save this photo.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this photo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded-full border-2 border-clay-brown px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink disabled:opacity-60"
      >
        {uploading ? "Uploading…" : "Upload photo"}
      </button>
      {error && <p className="mt-1 font-sans text-xs text-preserve-red">{error}</p>}
    </div>
  );
}
