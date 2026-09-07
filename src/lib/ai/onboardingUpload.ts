import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

// Shared by the three onboarding wizard parsing routes (parse-menu,
// parse-sop, parse-cert) -- all three receive only a storagePath (per
// UploadPhotoForm.tsx's client-uploads-then-sends-path convention, Q2 §4)
// and need the actual file bytes server-side for Claude's vision API, which
// takes bytes/a URL, not a browser File object. Downloaded via the
// admin/service-role client per the task brief -- the caller (owner/manager)
// already has their own venue's read policy on this bucket
// (onboarding_uploads_venue_isolation_select), but the admin client avoids a
// second RLS round-trip and lets us fail fast with a clear error from the
// explicit venue-folder check below rather than a generic "not found".

export type OnboardingFileKind = "image" | "pdf" | "text" | "unsupported";

export type OnboardingImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export interface FetchedOnboardingFile {
  kind: OnboardingFileKind;
  mediaType: OnboardingImageMediaType | "application/pdf" | null;
  base64: string | null; // populated for kind === "image" | "pdf"
  text: string | null; // populated for kind === "text"
}

const IMAGE_EXTENSIONS: Record<string, OnboardingImageMediaType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function extensionOf(path: string): string {
  const idx = path.lastIndexOf(".");
  return idx === -1 ? "" : path.slice(idx + 1).toLowerCase();
}

/**
 * Fetches a file previously uploaded to the `onboarding-uploads` bucket
 * (folder-per-venue) and classifies it for either a non-AI text fast path
 * or a Claude vision call. Throws on a storagePath that doesn't belong to
 * the caller's own venue folder (defense in depth -- the bucket's RLS
 * policy already enforces this on a non-admin client, but this route uses
 * the admin client, which bypasses RLS entirely, so this check is the only
 * thing standing between a caller-supplied path and another venue's file).
 */
export async function fetchOnboardingUpload(storagePath: string, venueId: string): Promise<FetchedOnboardingFile> {
  if (!storagePath.startsWith(`${venueId}/`)) {
    throw new Error("storagePath does not belong to this venue.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("onboarding-uploads").download(storagePath);
  if (error || !data) {
    throw new Error(error?.message ?? "Couldn't read the uploaded file.");
  }

  const ext = extensionOf(storagePath);

  // Non-AI fast path: a plain text/markdown SOP source needs no extraction
  // at all, just a decode. PDFs deliberately are NOT fast-pathed here even
  // though some are text-layer PDFs -- this codebase has no PDF text-layer
  // parsing dependency (checked package.json), and a scanned/photographed
  // PDF (the common real-world case for a venue's actual SOP binder) has no
  // text layer to extract anyway, so every PDF goes through Claude vision,
  // which handles both cases without needing to first detect which one it is.
  if (ext === "txt" || ext === "md") {
    const text = await data.text();
    return { kind: "text", mediaType: null, base64: null, text };
  }

  if (ext === "pdf") {
    const buf = Buffer.from(await data.arrayBuffer());
    return { kind: "pdf", mediaType: "application/pdf", base64: buf.toString("base64"), text: null };
  }

  const imageMediaType = IMAGE_EXTENSIONS[ext];
  if (imageMediaType) {
    const buf = Buffer.from(await data.arrayBuffer());
    return { kind: "image", mediaType: imageMediaType, base64: buf.toString("base64"), text: null };
  }

  return { kind: "unsupported", mediaType: null, base64: null, text: null };
}

/** Builds the Claude content block for a fetched image or PDF file. */
export function buildVisionContentBlock(
  file: FetchedOnboardingFile,
): Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam {
  if (file.kind === "image" && file.base64 && file.mediaType && file.mediaType !== "application/pdf") {
    return {
      type: "image",
      source: { type: "base64", media_type: file.mediaType, data: file.base64 },
    };
  }
  if (file.kind === "pdf" && file.base64) {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: file.base64 },
    };
  }
  throw new Error("File is not an image or PDF -- no vision content block can be built for it.");
}
