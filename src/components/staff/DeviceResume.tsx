"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Login page on a paired venue iPad: signs the iPad in as the venue's device account without anyone typing anything.
// If the pairing is missing, revoked or fails, the PIN picker (children) is shown instead.
export function DeviceResume({ venueSlug, children }: { venueSlug: string; children: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/device/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ venueSlug }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.access_token) throw new Error("not paired");
        const { error } = await createClient().auth.setSession({
          access_token: body.access_token,
          refresh_token: body.refresh_token,
        });
        if (error) throw error;
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`/${venueSlug}/device`);
      } catch {
        setFailed(true);
      }
    })();
  }, [venueSlug]);

  if (failed) return <>{children}</>;
  return <p className="font-sans text-ink/70">Getting the venue iPad ready.</p>;
}
