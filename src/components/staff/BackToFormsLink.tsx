"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Shown under the "saved" message on a compliance form so a person can get back to the list without hunting for the
// menu. The venue slug is the first part of the path (/[venueSlug]/forms/... or /[venueSlug]/temperature).
export function BackToFormsLink() {
  const slug = usePathname()?.split("/")[1];
  if (!slug) return null;
  return (
    <Link
      href={`/${slug}/forms`}
      className="mt-1 inline-flex min-h-11 items-center rounded-full border-2 border-ink px-5 font-sans text-sm font-medium text-ink hover:bg-ink hover:text-parchment"
    >
      Back to compliance forms
    </Link>
  );
}
