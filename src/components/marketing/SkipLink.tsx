export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-full bg-ink px-5 py-3 font-sans text-sm font-medium text-parchment focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]"
    >
      Skip to content
    </a>
  );
}
