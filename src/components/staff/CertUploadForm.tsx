"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Stamp } from "./Stamp";
import { PassSlide } from "./PassSlide";
import { SyncingIndicator } from "./SyncingIndicator";
import { compressImageFile } from "@/lib/photos/compressImageFile";
import { computeCertDueDate, type TrackingType } from "@/lib/certs/certTracking";

export function CertUploadForm({
  venueSlug,
  venueId,
  userId,
  certTypeId,
  certTypeName,
  trackingType,
  validityYears,
  existingIssuedDate,
  existingPhotoRef,
  existingPhotoUrl,
}: {
  venueSlug: string;
  venueId: string;
  userId: string;
  certTypeId: string;
  certTypeName: string;
  trackingType: TrackingType;
  validityYears: number;
  existingIssuedDate: string | null;
  existingPhotoRef: string | null;
  existingPhotoUrl: string | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [issuedDate, setIssuedDate] = useState(existingIssuedDate ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const dueDate = issuedDate ? computeCertDueDate(issuedDate, validityYears) : null;
  const dueDateLabel = trackingType === "hard_expiry" ? "Expires" : "Refresher recommended by";

  async function submit() {
    if (!issuedDate || (!file && !existingPhotoRef)) return;
    setLoading(true);
    setError(null);

    try {
      let photoRef = existingPhotoRef;

      if (file) {
        const compressed = await compressImageFile(file);
        const supabase = createClient();
        const path = `${venueId}/${userId}/${certTypeId}/${Date.now()}-${compressed.name}`;
        const { error: uploadError } = await supabase.storage.from("certs").upload(path, compressed, {
          upsert: true,
        });
        if (uploadError) throw new Error(uploadError.message);
        photoRef = path;
      }

      const res = await fetch("/api/staff/upload-cert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateTypeId: certTypeId, photoRef, issuedDate }),
      });
      const resBody = await res.json();
      if (!res.ok) throw new Error(resBody.error ?? "Couldn't save this certificate.");

      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this certificate.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-parchment flex items-center justify-center px-6">
        <div className="text-center space-y-6">
          <Stamp label={`${certTypeName} uploaded`} />
          <button
            type="button"
            onClick={() => router.push(`/${venueSlug}/certs`)}
            className="rounded-full bg-preserve-red px-8 py-3 font-sans font-medium text-parchment"
          >
            Back to certificates
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-parchment px-6 pb-10 pt-24">
      <PassSlide>
        <div className="mx-auto w-full max-w-md space-y-6">
          <h1 className="font-display text-3xl font-bold text-ink">{certTypeName}</h1>

          <div className="space-y-2">
            <label className="font-mono text-xs text-clay-brown">Photo of certificate</label>
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
            {existingPhotoUrl && !file && (
              <p className="font-mono text-xs text-clay-brown">
                A photo is already on file. Choose a new one to replace it.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs text-clay-brown">Issued date</label>
            <input
              type="date"
              value={issuedDate}
              onChange={(e) => setIssuedDate(e.target.value)}
              className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-mono text-ink focus:border-preserve-red outline-none"
            />
          </div>

          <div className="space-y-1">
            <p className="font-mono text-xs text-clay-brown">{dueDateLabel}</p>
            <p className="font-sans text-ink">
              {dueDate ? `${dueDate} (${validityYears} year(s) from the issued date)` : "Enter the issued date to see this"}
            </p>
          </div>

          {error && <p className="text-preserve-red font-sans text-sm">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={loading || !issuedDate || (!file && !existingPhotoRef)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
          >
            {loading && <SyncingIndicator />}
            {loading ? "Verifying…" : "Save certificate"}
          </button>
        </div>
      </PassSlide>
    </main>
  );
}
