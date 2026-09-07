/**
 * Q1 D.1.5 pass condition for a "NO CURRENT COLUMN/TABLE" field: the wizard
 * must visibly label a freetext capture as not yet a structured field,
 * rather than silently writing it into an unrelated column or dropping the
 * question. Used next to individual crowd controller licence numbers
 * (Page 5b) and anywhere else a field is deliberately captured as freetext
 * into an adjacent table's notes column.
 */
export function NotYetStructuredBadge() {
  return (
    <span className="inline-block rounded-full border border-clay-brown/50 px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-clay-brown">
      Not yet a structured field
    </span>
  );
}
