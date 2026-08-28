// No `server-only` guard: this is imported both by the Next.js API route and
// by scripts/ingest-module.ts, a standalone script run outside Next's
// bundler, where `server-only` throws unconditionally (it relies on
// Next/webpack's module aliasing, not a runtime check).

export type VoyageInputType = "document" | "query";

interface VoyageEmbeddingsResponse {
  data: { embedding: number[]; index: number }[];
}

const VOYAGE_MODEL = "voyage-2";
const BATCH_SIZE = 32;

/**
 * Batches requests to stay under Voyage's per-request input limits.
 * `inputType` must match how the text will be used: "document" for content
 * being indexed (ingestion), "query" for a question being embedded for
 * retrieval — Voyage's asymmetric embeddings need this to match well.
 */
export async function embedTexts(texts: string[], inputType: VoyageInputType): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not set.");
  }

  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: batch, model: VOYAGE_MODEL, input_type: inputType }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Voyage embeddings request failed (${res.status}): ${body}`);
    }

    const json = (await res.json()) as VoyageEmbeddingsResponse;
    for (const item of json.data) {
      embeddings[i + item.index] = item.embedding;
    }
  }

  return embeddings;
}
