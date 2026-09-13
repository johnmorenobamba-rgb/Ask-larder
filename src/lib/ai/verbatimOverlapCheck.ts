// Shared safeguard for any pipeline that rewrites third-party source
// material into Larder's own words (the sop-intake structural-coverage
// pass, and the equipment manufacturer-content pipeline): an instruction to
// "rewrite, never verbatim" is not itself a check -- models sometimes lift
// phrasing despite being told not to. This is a real, mechanical check
// against the actual source text, run before any rewritten content is
// allowed into a draft.
//
// Method: normalize both texts, break the candidate into overlapping
// word-shingles (fixed-length runs of consecutive words), and measure what
// fraction of those shingles appear verbatim in the source. A rewrite that
// genuinely re-expresses the source in new sentences will share very few
// long runs of identical words with it; a rewrite that copied a sentence
// (or lightly edited one) will share long runs almost entirely.

export interface VerbatimOverlapResult {
  overlapFraction: number; // 0..1, fraction of candidate shingles found verbatim in source
  flagged: boolean;
  matchedShingle: string | null; // one real example of a matched run, for a human to inspect
}

const SHINGLE_LENGTH = 8; // consecutive words per shingle
const FLAG_THRESHOLD = 0.35; // >35% of the candidate's 8-word runs found verbatim in source

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function shingles(words: string[], length: number): string[] {
  if (words.length < length) return words.length > 0 ? [words.join(" ")] : [];
  const out: string[] = [];
  for (let i = 0; i <= words.length - length; i++) {
    out.push(words.slice(i, i + length).join(" "));
  }
  return out;
}

/**
 * Checks a rewritten/candidate text against its real source text for
 * verbatim (or near-verbatim) copying. Call this on every piece of content
 * a rewrite pipeline proposes to draft from third-party source material,
 * before it's allowed into module_sections / station_faqs /
 * station_troubleshooting_issues -- never trust the model's own instruction
 * to "paraphrase" as sufficient on its own.
 */
export function checkVerbatimOverlap(candidateText: string, sourceText: string): VerbatimOverlapResult {
  const sourceWords = normalize(sourceText);
  const candidateWords = normalize(candidateText);
  const candidateShingles = shingles(candidateWords, SHINGLE_LENGTH);
  if (candidateShingles.length === 0) {
    return { overlapFraction: 0, flagged: false, matchedShingle: null };
  }

  const sourceShingleSet = new Set(shingles(sourceWords, SHINGLE_LENGTH));
  let matches = 0;
  let example: string | null = null;
  for (const s of candidateShingles) {
    if (sourceShingleSet.has(s)) {
      matches++;
      if (!example) example = s;
    }
  }

  const overlapFraction = matches / candidateShingles.length;
  return { overlapFraction, flagged: overlapFraction > FLAG_THRESHOLD, matchedShingle: example };
}
