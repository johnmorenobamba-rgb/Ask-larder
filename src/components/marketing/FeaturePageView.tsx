"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";

/** Sends feature_page_view once per feature page load. Renders nothing. */
export function FeaturePageView({ slug }: { slug: string }) {
  useEffect(() => {
    track("feature_page_view", { slug });
  }, [slug]);
  return null;
}
