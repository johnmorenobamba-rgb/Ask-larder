"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SPRING_PRESS } from "@/lib/motion/springPress";
import { LinkPendingIndicator } from "./LinkPendingIndicator";

const MotionLink = motion.create(Link);

/**
 * Block L8 -- shared springy hover/press feedback for list-row links,
 * replacing each page's own flat `hover:scale-[1.0x]` Tailwind transition
 * with the one shared spring config. A client component specifically so
 * the server-component list pages that use it (settings, modules, certs)
 * don't have to become client components themselves just for this.
 *
 * Also carries the shared pending state (LinkPendingIndicator): once
 * tapped, the row dims and shows a small spinner until the next screen
 * renders. `indicator="corner"` (default) for cards whose top right is
 * free; `"inline"` flows it at the end of a flex row (pass
 * `indicatorClassName="ml-auto"` to push it right); `"none"` when the
 * caller places a LinkPendingIndicator itself (it still has to sit inside
 * this link).
 */
export function PressableLink({
  href,
  className = "",
  hoverScale = 1.01,
  indicator = "corner",
  indicatorClassName = "",
  children,
}: {
  href: string;
  className?: string;
  hoverScale?: number;
  indicator?: "corner" | "inline" | "none";
  indicatorClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <MotionLink
      href={href}
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING_PRESS}
      className={`pending-link ${indicator === "corner" ? "relative" : ""} ${className}`}
    >
      {children}
      {indicator !== "none" && <LinkPendingIndicator placement={indicator} className={indicatorClassName} />}
    </MotionLink>
  );
}
