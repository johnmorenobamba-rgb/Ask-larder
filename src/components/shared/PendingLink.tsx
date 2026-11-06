"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { LinkPendingIndicator } from "./LinkPendingIndicator";

/**
 * Drop in replacement for next/link's <Link> on high traffic tap targets:
 * same props, plus an immediate (after ~100ms) pending state on the tapped
 * item, the item dims and shows a small spinner until the next screen
 * renders. See LinkPendingIndicator for the mechanics.
 *
 * `indicator="corner"` (default) suits tiles and cards; `"inline"` suits
 * nav rows and text links. The spinner is currentColor; on a dark tile
 * pass `indicatorClassName="text-parchment"`. A client component so server component pages
 * can use it without becoming client components themselves.
 */
export function PendingLink({
  className = "",
  indicator = "corner",
  indicatorClassName = "",
  children,
  ...props
}: ComponentProps<typeof Link> & { indicator?: "corner" | "inline"; indicatorClassName?: string }) {
  const positioning = indicator === "corner" ? "relative" : "";
  return (
    <Link {...props} className={`pending-link ${positioning} ${className}`}>
      {children}
      <LinkPendingIndicator placement={indicator} className={indicatorClassName} />
    </Link>
  );
}
