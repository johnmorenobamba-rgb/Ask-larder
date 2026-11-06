"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

/**
 * One busy flag for the "fetch, then router.push / router.refresh" pattern.
 *
 * The bug this replaces: components set `busy = false` in `finally` right
 * after the request, but router.push / router.refresh are async (they run
 * in a React transition while the next RSC payload loads), so the button
 * re-enabled and the old screen sat there looking idle until the new one
 * finally arrived, inviting a second tap.
 *
 * Usage:
 *
 *   const { busy, begin, navigate, fail } = useBusyNavigation();
 *
 *   async function save() {
 *     if (!begin()) return;               // already busy: ignore the tap
 *     const res = await fetch(...);
 *     if (!res.ok) { setError(...); fail(); return; }
 *     navigate(() => router.push(next));  // stays busy until it renders
 *   }
 *
 *   <button disabled={busy} aria-busy={busy}>{busy ? "Saving" : "Save"}</button>
 *
 * `busy` is (request in flight) OR (transition pending), so there is no gap
 * between the request finishing and the navigation starting. `begin()`
 * takes a ref lock synchronously, so two taps landing before React has
 * re-rendered the disabled button still only send one request.
 *
 * `end()` releases the busy state for a request that does NOT navigate
 * (it shows a result in place). Same as `fail()`, named for intent.
 *
 * Never call `fail()` / `end()` (or reset your own busy state) after
 * `navigate()`.
 */
export function useBusyNavigation() {
  const [isPending, startTransition] = useTransition();
  const [requesting, setRequesting] = useState(false);
  const lock = useRef(false);

  const begin = useCallback(() => {
    if (lock.current) return false;
    lock.current = true;
    setRequesting(true);
    return true;
  }, []);

  const navigate = useCallback((go: () => void) => {
    // Start the transition first, then drop the request flag: both land in
    // the same render, so isPending is already true when requesting goes
    // false and `busy` never blinks off. The lock stays held; the effect
    // below releases it once the navigation has actually rendered.
    startTransition(go);
    setRequesting(false);
  }, []);

  useEffect(() => {
    if (!requesting && !isPending) lock.current = false;
  }, [requesting, isPending]);

  const fail = useCallback(() => {
    setRequesting(false);
    lock.current = false;
  }, []);

  return { busy: requesting || isPending, isPending, begin, navigate, fail, end: fail };
}

/**
 * Drop in replacement for `const [busy, setBusy] = useState(false)` in a
 * component that already manages its own busy flag around a request and
 * then calls router.refresh / router.push. Same [busy, setBusy] shape, so
 * the existing set calls stay as they are; the only other change is
 * routing the navigation through the returned `navigate`:
 *
 *   const [saving, setSaving, navigate] = useBusyState();
 *   ...
 *   setSaving(false);
 *   navigate(() => router.refresh());
 *
 * `busy` stays true while that transition is pending, so the button no
 * longer re-enables while the old content is still on screen. Both calls
 * in the same tick (or setSaving(false) in a `finally` right after) batch
 * into one render, so there is no gap.
 */
export function useBusyState(): [boolean, (value: boolean) => void, (go: () => void) => void] {
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const navigate = useCallback((go: () => void) => startTransition(go), []);
  return [busy || isPending, setBusy, navigate];
}
