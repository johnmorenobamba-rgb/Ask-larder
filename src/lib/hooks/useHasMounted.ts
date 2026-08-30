import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * True only after client-side mount. Needed wherever a value legitimately
 * differs between server and client (clock, navigator, localStorage) —
 * useSyncExternalStore is the React-endorsed way to read this without
 * tripping react-hooks/set-state-in-effect, which flags even the
 * conventional `useEffect(() => setState(true), [])` mount-flag idiom.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
