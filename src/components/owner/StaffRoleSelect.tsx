"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type RoleOption = { id: string; name: string; department: string | null; tier: "frontline" | "authorized" };

const DEPARTMENT_LABELS: Record<string, string> = { BOH: "Back of house", FOH: "Front of house", BAR: "Bar" };

// Change an existing person's job role. The server and the database enforce the same rules; this just explains them:
// only the owner touches Authorized roles, a manager moves people between Frontline roles, nobody changes their own role.
export function StaffRoleSelect({
  staffUserId,
  staffName,
  currentRoleId,
  currentTier,
  roles,
  viewerIsOwner,
  isSelf,
  canChange,
}: {
  staffUserId: string;
  staffName: string;
  currentRoleId: string | null;
  currentTier: "frontline" | "authorized" | null;
  roles: RoleOption[];
  viewerIsOwner: boolean;
  isSelf: boolean;
  canChange: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentRoleId ?? "");
  const [loading, setLoading] = useState(false);
  const [okText, setOkText] = useState("");
  const [errorText, setErrorText] = useState("");

  const lockedReason = !canChange
    ? "Only the owner or a manager can change roles."
    : isSelf
      ? "You can't change your own role."
      : !viewerIsOwner && currentTier === "authorized"
        ? "Only the owner can change an Authorized role."
        : null;
  const selectable = (r: RoleOption) => viewerIsOwner || r.tier === "frontline";
  const frontline = roles.filter((r) => r.tier === "frontline");
  const authorized = roles.filter((r) => r.tier === "authorized");
  const label = (r: RoleOption) => `${r.name}${r.department ? `, ${DEPARTMENT_LABELS[r.department] ?? r.department}` : ""}`;
  const selectId = `role-${staffUserId}`;
  const hintId = `role-hint-${staffUserId}`;

  async function change(next: string) {
    if (!next || next === value) return;
    const previous = value;
    setValue(next);
    setLoading(true);
    setOkText("");
    setErrorText("");
    const res = await fetch(`/api/owner/staff/${staffUserId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId: next }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setValue(previous);
      setErrorText(body?.error ?? "Couldn't change this role. Try again.");
      return;
    }
    setOkText(`Role changed to ${body?.roleName ?? "the new role"}.`);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <label className="block font-mono text-xs text-clay-brown" htmlFor={selectId}>
        Role
      </label>
      <select
        id={selectId}
        aria-label={`Role for ${staffName}`}
        aria-describedby={lockedReason ? hintId : undefined}
        value={value}
        disabled={loading || lockedReason !== null}
        onChange={(e) => void change(e.target.value)}
        className="min-h-11 w-full rounded-2xl border-2 border-clay-brown/60 bg-parchment px-3 py-2 font-sans text-base text-ink disabled:cursor-not-allowed disabled:bg-ink/5 disabled:text-ink/70 sm:max-w-xs"
      >
        {!currentRoleId && <option value="">No role yet</option>}
        {frontline.length > 0 && (
          <optgroup label="Frontline roles">
            {frontline.map((r) => (
              <option key={r.id} value={r.id} disabled={!selectable(r)}>
                {label(r)}
              </option>
            ))}
          </optgroup>
        )}
        {authorized.length > 0 && (
          <optgroup label="Authorized roles">
            {authorized.map((r) => (
              <option key={r.id} value={r.id} disabled={!selectable(r)}>
                {label(r)}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {lockedReason && (
        <p id={hintId} className="font-sans text-xs text-ink/75">
          {lockedReason}
        </p>
      )}
      <p role="status" className="font-sans text-sm text-bay-green">
        {okText}
      </p>
      <p role="alert" className="font-sans text-sm text-preserve-red">
        {errorText}
      </p>
    </div>
  );
}
