"use client";

import { useBusyState } from "@/lib/hooks/useBusyNavigation";
import { useRouter } from "next/navigation";

export function DeleteStationButton({ stationId }: { stationId: string }) {
  const router = useRouter();
  // Stays busy until the refresh/navigation below has rendered.
  const [loading, setLoading, navigate] = useBusyState();

  async function remove() {
    if (!confirm("Delete this station?")) return;
    setLoading(true);
    await fetch(`/api/owner/stations/${stationId}`, { method: "DELETE" });
    setLoading(false);
    navigate(() => router.refresh());
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
