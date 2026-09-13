// Block R's "distilled Part 0" shape, extracted out of generateSopDocument.ts
// into its own guard-free module. generateSopDocument.ts still owns actually
// producing this shape from module_sections prose and keeps its own
// `server-only` guard (it's only ever called from Next API routes); Block
// T's curateSopDocumentFromIntake.ts needs the same type + validation guard
// but must stay importable from a standalone Node/tsx script for headless
// testing, which a transitive `server-only` import would block.
export interface SopDocumentContent {
  purpose: string;
  scope: string;
  whoPerformsIt: string;
  materials: string[];
  procedure: string[];
  safetyCriticalCallouts: string[];
  definitionOfDone: string;
  escalationContact: string;
}

export function isSopDocumentContent(value: unknown): value is SopDocumentContent {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.purpose === "string" &&
    typeof v.scope === "string" &&
    typeof v.whoPerformsIt === "string" &&
    Array.isArray(v.materials) &&
    v.materials.every((m) => typeof m === "string") &&
    Array.isArray(v.procedure) &&
    v.procedure.every((p) => typeof p === "string") &&
    Array.isArray(v.safetyCriticalCallouts) &&
    v.safetyCriticalCallouts.every((s) => typeof s === "string") &&
    typeof v.definitionOfDone === "string" &&
    typeof v.escalationContact === "string"
  );
}
