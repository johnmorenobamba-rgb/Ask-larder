type ModuleState = "not_started" | "in_progress" | "completed";

/**
 * Checklist row state indicator. Not-started: Clay Brown outline dot.
 * In-progress: Bay Green partial ring. Complete: mini Stamp — the full-size
 * Stamp only fires live, once, at the actual completion moment.
 */
export function ModuleStateChip({ state }: { state: ModuleState }) {
  if (state === "completed") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-label="Completed" role="img">
        <circle cx="10" cy="10" r="9" fill="none" stroke="var(--color-preserve-red)" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="6" fill="none" stroke="var(--color-preserve-red)" strokeWidth="1" />
      </svg>
    );
  }

  if (state === "in_progress") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-label="In progress" role="img">
        <circle cx="10" cy="10" r="8" fill="none" stroke="var(--color-bay-green)" strokeWidth="2" strokeDasharray="16 34" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-label="Not started" role="img">
      <circle cx="10" cy="10" r="8" fill="none" stroke="var(--color-clay-brown)" strokeWidth="1.5" />
    </svg>
  );
}
