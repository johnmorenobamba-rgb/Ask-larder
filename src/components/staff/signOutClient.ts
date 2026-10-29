"use client";

import { createClient } from "@/lib/supabase/client";

/** Ends the current session on this iPad: server cookie and browser session. */
export async function signOutEverywhere(): Promise<void> {
  try {
    await fetch("/api/auth/sign-out", { method: "POST" });
  } catch {
    // The browser sign out below still clears the local session.
  }
  try {
    await createClient().auth.signOut();
  } catch {
    // Nothing more to clear.
  }
}
