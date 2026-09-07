"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { errorClass } from "./fieldStyles";

export type ParsedMenuItem = {
  name: string;
  category: string;
  base_allergens: string[];
  description: string;
  // Q5's parse-menu route returns a three-tier enum, not a 0-1 float.
  confidence: "high" | "medium" | "low";
  modifiers: { group: string; name: string; allergens_added: string[]; allergens_removed: string[] }[];
};

/**
 * Uploads a menu file to the onboarding-uploads bucket, then calls Q5's
 * POST /api/owner/onboarding/parse-menu — that route reads the file and
 * proposes rows but never writes menu_items itself; onParsed hands the
 * proposal up to MenuReviewTable, which is the one write path (manual grid
 * and this parse flow both end at the same POST /api/owner/onboarding/
 * menu-items call).
 */
export function MenuUploadStep({ venueId, onParsed }: { venueId: string; onParsed: (items: ParsedMenuItem[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file || loading) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const path = `${venueId}/menu/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("onboarding-uploads").upload(path, file);
      if (uploadError) throw new Error(uploadError.message);

      const res = await fetch("/api/owner/onboarding/parse-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath: path }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't read that menu file.");
      }
      const body = await res.json();
      onParsed(body.items ?? []);
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that menu file.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
      {loading && <LoadingOverlay />}
      <p className="font-display text-ink">Upload a menu</p>
      <p className="font-sans text-sm text-ink/70">
        A PDF, photo, or spreadsheet of the menu. Larder reads it and proposes items below. Nothing is
        saved until you confirm each one.
      </p>
      <label className="flex w-full cursor-pointer items-center justify-between rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink transition-colors hover:border-preserve-red">
        <span>{file ? file.name : "Choose a file"}</span>
        <span className="font-mono text-xs text-clay-brown">Browse</span>
        <input
          type="file"
          accept="image/*,.pdf,.csv,.xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </label>
      {error && <p className={errorClass}>{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={loading || !file}
        className="rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
      >
        {loading ? "Reading…" : "Read menu"}
      </button>
    </div>
  );
}
