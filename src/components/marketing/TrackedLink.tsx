"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { track } from "@/lib/analytics/track";

type EventName = "hub_feature_card_click" | "feature_cta_click";

/** A normal link that also sends one PostHog event on click. The wrapper no-ops until NEXT_PUBLIC_POSTHOG_KEY is set. */
export function TrackedLink({
  event,
  eventProps,
  onClick,
  ...rest
}: ComponentProps<typeof Link> & { event: EventName; eventProps: Record<string, unknown> }) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        track(event, eventProps);
        onClick?.(e);
      }}
    />
  );
}
