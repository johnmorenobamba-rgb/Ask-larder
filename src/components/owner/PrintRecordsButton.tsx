"use client";

export function PrintRecordsButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-12 rounded-full bg-ink px-6 font-sans text-base font-medium text-parchment"
    >
      Print records
    </button>
  );
}
