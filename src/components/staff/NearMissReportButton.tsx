"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMagneticPull } from "@/lib/hooks/useMagneticPull";
import { onAskLarderOverlayStateChange } from "@/lib/askLarderBus";

/**
 * Persistent, low-friction "something felt unsafe" report — fire-and-forget,
 * ~10 second submission per the PRD, not a form to dread. Interim placement
 * is the protected layout (see layout.tsx) until a real Ask Larder/dashboard
 * view exists as the "general" entry point the PRD describes.
 */
export function NearMissReportButton({
  venueId,
  stationId,
}: {
  venueSlug: string;
  venueId: string;
  stationId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [askLarderOpen, setAskLarderOpen] = useState(false);
  const magneticRef = useMagneticPull<HTMLButtonElement>();

  // Hides while the Ask Larder overlay is open -- two competing floating
  // actions both visible/tappable with a modal already up read as clutter,
  // and it also removes any question of this button showing through/over
  // that overlay regardless of z-index specifics.
  useEffect(() => onAskLarderOverlayStateChange(setAskLarderOpen), []);

  function reset() {
    setOpen(false);
    setDescription("");
    setFile(null);
    setIsAnonymous(false);
    setError(null);
    setDone(false);
  }

  async function submit() {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);

    try {
      let photoRef: string | null = null;

      if (file) {
        const supabase = createClient();
        // Venue-scoped only, deliberately no user id segment — keeps an
        // anonymous report anonymous at the storage layer too, not just in
        // the near_miss_reports row.
        const path = `${venueId}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("near-miss-photos")
          .upload(path, file);
        if (uploadError) throw new Error(uploadError.message);
        photoRef = path;
      }

      const res = await fetch("/api/staff/report-near-miss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, stationId, photoRef, isAnonymous }),
      });
      const resBody = await res.json();
      if (!res.ok) throw new Error(resBody.error ?? "Couldn't send this report.");

      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send this report.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    if (askLarderOpen) return null;
    return (
      <button
        ref={magneticRef}
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-ink px-5 py-3 font-sans text-sm font-medium text-parchment shadow-lg"
      >
        Something felt unsafe?
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-6 sm:items-center">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-parchment p-6">
        {done ? (
          <div className="space-y-4 text-center">
            <p className="font-display text-xl text-ink">Thanks. That&apos;s been sent.</p>
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-display text-xl font-bold text-ink">Something felt unsafe?</h2>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened?"
              rows={3}
              className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink focus:border-preserve-red outline-none"
            />
            <div className="space-y-2">
              <label className="font-mono text-xs text-clay-brown">Photo (optional)</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full font-sans text-sm text-ink"
              />
            </div>
            <label className="flex items-center gap-2 font-sans text-sm text-ink">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              Report anonymously
            </label>
            {error && <p className="text-preserve-red font-sans text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={reset}
                className="flex-1 rounded-full border-2 border-clay-brown/40 px-6 py-3 font-sans text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={loading || !description.trim()}
                className="flex-1 rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
