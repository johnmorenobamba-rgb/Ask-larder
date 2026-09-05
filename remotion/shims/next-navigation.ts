// Block N3 -- BentoGrid.tsx calls useRouter() from next/navigation, used
// only inside one onClick handler (navigating to a module). Nothing ever
// clicks during a Remotion render, so a no-op stub is sufficient -- this
// is not a reimplementation of routing, just enough surface for the real
// component to import without a Next.js runtime present.
export function useRouter() {
  return {
    push: () => {},
    replace: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  };
}
