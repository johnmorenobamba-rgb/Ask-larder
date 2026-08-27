"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = { id: string; name: string };

export function RoleSelectGrid({ roles, modulesHref }: { roles: Role[]; modulesHref: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function selectRole(roleId: string) {
    setSaving(true);
    await fetch("/api/staff/set-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId }),
    });
    router.push(modulesHref);
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {roles.map((role) => (
        <button
          key={role.id}
          type="button"
          disabled={saving}
          onClick={() => selectRole(role.id)}
          className="rounded-2xl border-2 border-clay-brown/40 px-4 py-5 text-left transition-transform duration-150 hover:scale-[1.03] hover:border-preserve-red disabled:opacity-50"
        >
          <span className="font-display text-lg text-ink">{role.name}</span>
        </button>
      ))}
    </div>
  );
}
