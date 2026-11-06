"use client";

import { useState, useTransition } from "react";
import { InlineSpinner } from "@/components/shared/InlineSpinner";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SPRING_PRESS } from "@/lib/motion/springPress";

type Role = { id: string; name: string; department: string | null };

const CONFIRM_DELAY_MS = 250;

export function RoleSelectGrid({ roles, modulesHref }: { roles: Role[]; modulesHref: string }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Lets the role save and the push to the checklist run as one transition.
  const [, startTransition] = useTransition();

  function selectRole(roleId: string) {
    if (selectedId) return;
    setSelectedId(roleId);
    // New-Hire Flow spec: ~250ms confirm delay after selection, then Pass
    // Slide to the checklist — no separate "confirm" button, keeps it fast.
    window.setTimeout(async () => {
      await fetch("/api/staff/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      startTransition(() => router.push(modulesHref));
    }, CONFIRM_DELAY_MS);
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {roles.map((role) => (
        <motion.button
          key={role.id}
          type="button"
          disabled={selectedId !== null}
          aria-busy={selectedId === role.id}
          onClick={() => selectRole(role.id)}
          whileHover={selectedId === null ? { scale: 1.03 } : undefined}
          whileTap={selectedId === null ? { scale: 0.97 } : undefined}
          animate={selectedId === role.id ? { scale: 1.03 } : { scale: 1 }}
          transition={SPRING_PRESS}
          className={`rounded-2xl border-2 px-4 py-5 text-left disabled:opacity-50 ${
            selectedId === role.id ? "border-preserve-red" : "border-clay-brown/40 hover:border-preserve-red"
          }`}
        >
          {role.department && (
            <span className="block font-mono text-xs uppercase tracking-wide text-clay-brown">
              {role.department}
            </span>
          )}
          <span className="flex items-center gap-2 font-display text-lg text-ink">
            {role.name}
            {/* Chosen role stays marked as working until the checklist renders
                (selectedId is never cleared: this screen is left behind). */}
            {selectedId === role.id && <InlineSpinner className="text-clay-brown" />}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
