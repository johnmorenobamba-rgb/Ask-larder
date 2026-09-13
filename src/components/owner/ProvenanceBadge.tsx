"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Provenance = "owner_sourced" | "ai_standard_fill" | "ai_manual_sourced" | "ai_recommended_pending" | "ai_recommended_confirmed";

// Custom line-icon glyphs, matching the nav drawer / bento cell icon
// language (24x24 viewBox, 1.5 stroke weight) -- no stock icon library,
// per the Branding Kit's standing rule. A small chit-bubble outline reads
// as "this came from Larder", distinct from a generic sparkle/robot icon.
function LarderMarkGlyph({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3.5V16.5H6.5a2 2 0 0 1-2-2z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckGlyph({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The provenance-aware approval badge (CLAUDE.md liability model: an owner
 * must see what's theirs vs. what Larder proposed before approving it).
 * Deliberately NOT the Stamp -- Stamp is locked to exactly four trust
 * moments (module completion, passed quiz, certificate verification,
 * e-signature confirmation) and this is a fifth, different kind of moment
 * (confirming an AI-drafted default, not completing/attesting to
 * something), so it gets its own quieter, inline treatment: a small pill,
 * not a circular seal.
 *
 * owner_sourced renders nothing -- the unmarked default IS the signal that
 * this is the owner's own words, matching "no badge" for the common case
 * rather than labeling everything.
 */
export function ProvenanceBadge({
  provenance,
  citation,
  manufacturer,
  confirmUrl,
}: {
  provenance: Provenance;
  citation?: string | null;
  /** Only used for the ai_manual_sourced label ("from the {manufacturer} manual"). */
  manufacturer?: string | null;
  /**
   * Present only for ai_recommended_pending rows -- the API route this
   * badge POSTs to when the owner confirms. A plain URL string, not a
   * callback, so this component stays usable directly from a Server
   * Component page (a closure prop can't cross that boundary; a string can).
   */
  confirmUrl?: string;
}) {
  if (provenance === "owner_sourced") return null;

  if (provenance === "ai_recommended_confirmed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-clay-brown/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-clay-brown">
        <CheckGlyph color="var(--color-clay-brown)" />
        Confirmed by you
      </span>
    );
  }

  if (provenance === "ai_recommended_pending") {
    return <PendingRecommendationBadge citation={citation} confirmUrl={confirmUrl} />;
  }

  const isManual = provenance === "ai_manual_sourced";
  const color = isManual ? "var(--color-bay-green)" : "var(--color-clay-brown)";
  const bg = isManual ? "bg-bay-green/10" : "bg-clay-brown/10";
  const label = isManual
    ? `Added by Larder, from the ${manufacturer ? `${manufacturer} manual` : "manufacturer manual"}`
    : "Added by Larder, standard practice";

  return (
    <div className="space-y-1">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${bg}`}
        style={{ color }}
      >
        <LarderMarkGlyph color={color} />
        {label}
      </span>
      {citation && <p className="pl-1 font-sans text-xs text-clay-brown/80">Source: {citation}</p>}
    </div>
  );
}

function PendingRecommendationBadge({ citation, confirmUrl }: { citation?: string | null; confirmUrl?: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!confirmUrl || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch(confirmUrl, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't confirm this.");
      }
      setConfirmed(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't confirm this.");
    } finally {
      setConfirming(false);
    }
  }

  if (confirmed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-clay-brown/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-clay-brown">
        <CheckGlyph color="var(--color-clay-brown)" />
        Confirmed by you
      </span>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border-2 border-saffron/50 bg-saffron/10 px-3 py-2.5">
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-clay-brown">
        <LarderMarkGlyph color="var(--color-saffron)" />
        Larder suggests this, review and confirm
      </span>
      {citation && <p className="font-sans text-xs text-clay-brown/80">Source: {citation}</p>}
      {confirmUrl && (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirming}
          className="rounded-full bg-preserve-red px-4 py-1.5 font-sans text-xs font-medium text-parchment disabled:opacity-50"
        >
          {confirming ? "Confirming…" : "Confirm this content"}
        </button>
      )}
      {error && <p className="font-sans text-xs text-preserve-red">{error}</p>}
    </div>
  );
}
