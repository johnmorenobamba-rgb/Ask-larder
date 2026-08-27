"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Stamp } from "./Stamp";
import { PassSlide } from "./PassSlide";

export function CertUploadForm({
  venueSlug,
  venueId,
  userId,
  certTypeId,
  certTypeName,
  existingIssuedDate,
  existingExpiryDate,
  existingPhotoRef,
  existingPhotoUrl,
}: {
  venueSlug: string;
  venueId: string;
  userId: string;
  certTypeId: string;
  certTypeName: string;
  existingIssuedDate: string | null;
  existingExpiryDate: string | null;
  existingPhotoRef: string | null;
  existingPhotoUrl: string | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [issuedDate, setIssuedDate] = useState(existingIssuedDate ?? "");
  const [expiryDate, setExpiryDate] = useState(existingExpiryDate ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!issuedDate || !expiryDate || (!file && !existingPhotoRef)) return;
    setLoading(true);
    setError(null);

    try {
      let photoRef = existingPhotoRef;

      if (file) {
        const supabase = createClient();
        const path = `${venueId}/${userId}/${certTypeId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("certs").upload(path, file, {
          upsert: true,
        });
        if (uploadError) throw new Error(uploadError.message);
        photoRef = path;
      }

      const res = await fetch("/api/staff/upload-cert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateTypeId: certTypeId, photoRef, issuedDate, expiryDate }),
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
    <main className="min-h-screen bg-parchment px-6 py-10">
      <PassSlide>
        <div className="mx-auto w-full max-w-md space-y-6">
          <h1 className="font-display text-3xl font-bold text-ink">{certTypeName}</h1>

          <div className="space-y-2">
            <label className="font-mono text-xs text-clay-brown">Photo of certificate</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full font-sans text-sm text-ink"
            />
            {existingPhotoUrl && !file && (
              <p className="font-mono text-xs text-clay-brown">
                A photo is already on file — choose a new one to replace it.
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

          <div className="space-y-2">
            <label className="font-mono text-xs text-clay-brown">Expiry date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-mono text-ink focus:border-preserve-red outline-none"
            />
          </div>

          {error && <p className="text-preserve-red font-sans text-sm">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={loading || !issuedDate || !expiryDate || (!file && !existingPhotoRef)}
            className="w-full rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save certificate"}
          </button>
        </div>
      </PassSlide>
    </main>
  );
}
