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
const MAX_429_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Batches requests to stay under Voyage's per-request input limits.
 * `inputType` must match how the text will be used: "document" for content
 * being indexed (ingestion), "query" for a question being embedded for
 * retrieval — Voyage's asymmetric embeddings need this to match well.
 *
 * Retries a 429 a couple of times with a short backoff (respecting
 * Retry-After when Voyage sends one) rather than failing the whole staff
 * question outright — real accounts on a free/no-payment-method tier are
 * capped as low as 3 requests/minute, confirmed live during Block D
 * testing, so a second staff member asking within the same minute is a
 * realistic case, not just a test artifact. Capped at 2 retries so a
 * genuinely sustained rate limit still fails fast instead of leaving a
 * staff member staring at "Thinking…" indefinitely.
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

    let res: Response;
    let attempt = 0;
    for (;;) {
      res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: batch, model: VOYAGE_MODEL, input_type: inputType }),
      });

      if (res.status !== 429 || attempt >= MAX_429_RETRIES) break;
      const retryAfterHeader = Number(res.headers.get("retry-after"));
      const delayMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : DEFAULT_RETRY_DELAY_MS * (attempt + 1);
      await sleep(delayMs);
      attempt++;
    }

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
