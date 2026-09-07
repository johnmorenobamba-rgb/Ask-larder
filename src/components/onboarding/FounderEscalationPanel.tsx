/**
 * Q1 Part C / Q2 §2: gaming/EGM entitlement and non-Victoria states both
 * route to a founder-escalation flag rather than the wizard attempting to
 * model an answer it has no real taxonomy for. This is a visible dead end
 * for the specific sub-topic only — the wizard keeps going (the owner can
 * still press Continue), it just never writes gaming data to any table, and
 * downstream licence-type/food-safety-class content is shown with an
 * explicit "calibrated for Victoria" caveat rather than silently reused.
 *
 * Not the Stamp — this is a warning moment, not a trust/completion one.
 */
export function FounderEscalationPanel({ title, body }: { title: string; body: string }) {
  return (
    <div role="status" className="space-y-1 rounded-2xl border-2 border-saffron bg-saffron/10 px-4 py-4">
      <p className="font-mono text-xs uppercase tracking-wide text-preserve-red">Flagged for founder review</p>
      <p className="font-display text-ink">{title}</p>
      <p className="font-sans text-sm text-ink/80">{body}</p>
    </div>
  );
}
