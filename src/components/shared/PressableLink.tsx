"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SPRING_PRESS } from "@/lib/motion/springPress";

const MotionLink = motion.create(Link);

/**
 * Block L8 -- shared springy hover/press feedback for list-row links,
 * replacing each page's own flat `hover:scale-[1.0x]` Tailwind transition
 * with the one shared spring config. A client component specifically so
 * the server-component list pages that use it (settings, modules, certs)
 * don't have to become client components themselves just for this.
 */
export function PressableLink({
  href,
  className = "",
  hoverScale = 1.01,
  children,
}: {
  href: string;
  className?: string;
  hoverScale?: number;
  children: React.ReactNode;
}) {
  return (
    <MotionLink
      href={href}
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING_PRESS}
      className={className}
    >
      {children}
    </MotionLink>
  );
}
