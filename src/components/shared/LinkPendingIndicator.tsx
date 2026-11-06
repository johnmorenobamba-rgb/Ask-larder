"use client";

import { useLinkStatus } from "next/link";
import { InlineSpinner } from "./InlineSpinner";

/**
 * Tap feedback for a client navigation. Must render INSIDE a next/link
 * <Link> (or PressableLink / PendingLink, which wrap one): useLinkStatus
 * reads the pending state of the nearest parent Link only.
 *
 * While the tapped link's navigation is in flight it renders a small
 * spinner and sets `data-link-pending`, which `.pending-link` (globals.css)
 * picks up with `:has()` to dim the whole tile. Both the dim and the
 * spinner wait ~100ms before showing (CSS delay, not a JS timer), so a
 * prefetched navigation that lands instantly never flashes either.
 *
 * Deliberately not the Stamp and not the ChitMark: the Stamp is reserved
 * for the four trust moments, and the ChitMark's glow loop is the full
 * route overlay's job. This is the small, quiet, per item version.
 *
 * `placement="corner"` pins the spinner to the tile's top right, beside a
 * card's heading line (the parent must be `relative`; PendingLink and
 * PressableLink add it). Rows with content on their right edge use
 * inline and place the indicator themselves.
 * `placement="inline"` flows it after the link text, for nav rows and
 * text links.
 */
export function LinkPendingIndicator({
  placement = "corner",
  className = "",
}: {
  placement?: "corner" | "inline";
  className?: string;
}) {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  const position =
    placement === "corner"
      ? "pointer-events-none absolute right-4 top-4 z-10 inline-flex"
      : "ml-2 inline-flex shrink-0 align-middle";

  return (
    <span data-link-pending="" aria-hidden="true" className={`link-pending-in ${position} ${className}`}>
      <InlineSpinner />
    </span>
  );
}
