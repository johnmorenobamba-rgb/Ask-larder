"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteStationButton({ stationId }: { stationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!confirm("Delete this station?")) return;
    setLoading(true);
    await fetch(`/api/owner/stations/${stationId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={loading}
      className="font-mono text-xs text-preserve-red underline disabled:opacity-50"
    >
      Delete
    </button>
  );
}
