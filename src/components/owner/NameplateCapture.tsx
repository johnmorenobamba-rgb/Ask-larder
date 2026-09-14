"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Stage = "idle" | "uploading" | "analyzing" | "confirming" | "saving";

/**
 * Wizard-adjacency fix (CLAUDE.md standing principle) -- a dedicated
 * nameplate/model-sticker capture, separate from StationPhotoUpload's
 * general ambience photo. Upload -> vision OCR suggests manufacturer/
 * model/serial -> owner reviews and edits the actual text inputs before
 * anything is saved, same "propose, don't auto-save" convention as the
 * cert/menu parsing steps elsewhere in onboarding. This is the first input
 * to the manufacturer-sourced content pipeline (station QR / troubleshooting
 * work) -- without a confirmed model/serial here, that pipeline has nothing
 * to search a manual for.
 */
export function NameplateCapture({ venueId, stationId }: { venueId: string; stationId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<"high" | "medium" | "low" | null>(null);
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");

  async function handleFile(file: File) {
    setStage("uploading");
    setError(null);
    try {
      // Deliberately NOT run through compressImageFile (see other upload
      // components) -- this photo goes straight into Claude Vision OCR to
      // read small printed text off an equipment nameplate, feeding the
      // manufacturer-sourced content pipeline. Downscaling/re-encoding
      // risks degrading exactly the fine detail OCR accuracy depends on,
      // for a comparatively small file-size win on a one-off capture (not
      // something staff load repeatedly like module/station photos).
      const supabase = createClient();
      const path = `${venueId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("photo-library").upload(path, file);
      if (uploadError) throw new Error(uploadError.message);

      const savePhotoRes = await fetch("/api/owner/photo-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath: path, tag: "nameplate", stationId }),
      });
      const savePhotoBody = await savePhotoRes.json().catch(() => null);
      if (!savePhotoRes.ok) throw new Error(savePhotoBody?.error ?? "Couldn't save this photo.");

      setStage("analyzing");
      const analyzeRes = await fetch(`/api/owner/stations/${stationId}/nameplate-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath: path }),
      });
      const analyzeBody = await analyzeRes.json().catch(() => null);
      if (!analyzeRes.ok) throw new Error(analyzeBody?.error ?? "Couldn't read this nameplate.");

      setPhotoId(savePhotoBody.id);
      setManufacturer(analyzeBody.manufacturer ?? "");
      setModel(analyzeBody.model ?? "");
      setSerial(analyzeBody.serial ?? "");
      setConfidence(analyzeBody.confidence ?? null);
      setStage("confirming");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't process this photo.");
      setStage("idle");
    }
  }

  async function confirm() {
    setStage("saving");
    setError(null);
    try {
      const res = await fetch(`/api/owner/stations/${stationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentManufacturer: manufacturer.trim() || null,
          equipmentModel: model.trim() || null,
          equipmentSerial: serial.trim() || null,
          nameplatePhotoId: photoId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't save these details.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save these details.");
      setStage("confirming");
    }
  }

  if (stage === "confirming" || stage === "saving") {
    return (
      <div className="space-y-2 rounded-xl border-2 border-saffron/50 bg-saffron/10 px-3 py-3">
        <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">
          Confirm what was read off the nameplate
          {confidence === "low" && " (low confidence, check carefully)"}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            type="text"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            placeholder="Manufacturer"
            className="rounded-lg border-2 border-clay-brown/40 bg-parchment px-3 py-2 font-sans text-sm text-ink"
          />
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Model"
            className="rounded-lg border-2 border-clay-brown/40 bg-parchment px-3 py-2 font-sans text-sm text-ink"
          />
          <input
            type="text"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="Serial number"
            className="rounded-lg border-2 border-clay-brown/40 bg-parchment px-3 py-2 font-sans text-sm text-ink"
          />
        </div>
        {error && <p className="font-sans text-xs text-preserve-red">{error}</p>}
        <button
          type="button"
          onClick={confirm}
          disabled={stage === "saving"}
          className="rounded-full bg-preserve-red px-4 py-2 font-sans text-xs font-medium text-parchment disabled:opacity-60"
        >
          {stage === "saving" ? "Saving…" : "Confirm and save"}
        </button>
      </div>
    );
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
        disabled={stage === "uploading" || stage === "analyzing"}
        className="rounded-full border-2 border-clay-brown px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink disabled:opacity-60"
      >
        {stage === "uploading" ? "Uploading…" : stage === "analyzing" ? "Reading nameplate…" : "Photograph nameplate"}
      </button>
      {error && <p className="mt-1 font-sans text-xs text-preserve-red">{error}</p>}
    </div>
  );
}
