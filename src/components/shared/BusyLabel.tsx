import { InlineSpinner } from "./InlineSpinner";

/**
 * A button's label that follows its verb while busy: "Save" becomes a
 * spinner plus "Saving", "Approve" becomes "Approving". Pair it with
 * `disabled={busy}` and `aria-busy={busy}` on the button itself, and drive
 * `busy` from useBusyNavigation so it stays on until the next screen has
 * rendered, not just until the request returns.
 *
 * Busy copy is plain ("Saving"), no trailing ellipsis or dash.
 */
export function BusyLabel({
  busy,
  idle,
  busyText,
  spinnerSize = 16,
}: {
  busy: boolean;
  idle: React.ReactNode;
  busyText: React.ReactNode;
  spinnerSize?: number;
}) {
  if (!busy) return <>{idle}</>;
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <InlineSpinner size={spinnerSize} />
      <span>{busyText}</span>
    </span>
  );
}
