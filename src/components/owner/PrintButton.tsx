"use client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded-full border-2 border-clay-brown px-5 py-2 font-sans text-sm font-medium text-ink"
    >
      {label}
    </button>
  );
}
