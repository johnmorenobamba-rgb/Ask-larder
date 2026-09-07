// Shared className strings so every wizard form matches CreateStationForm's
// exact input/button treatment without re-typing the same long Tailwind
// strings in twenty components.
export const inputClass =
  "w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red";
export const monoInputClass =
  "w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-mono text-sm text-ink outline-none focus:border-preserve-red";
export const selectClass = inputClass;
export const labelClass = "font-mono text-xs uppercase tracking-wide text-clay-brown";
export const cardClass = "space-y-4 rounded-2xl border-2 border-clay-brown/40 px-4 py-5 md:px-6";
export const primaryButtonClass =
  "rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50";
export const secondaryButtonClass =
  "rounded-full border-2 border-clay-brown/40 px-6 py-3 font-sans font-medium text-ink disabled:opacity-50 hover:border-ink";
export const errorClass = "font-sans text-sm text-preserve-red";
export const rowClass = "flex items-center justify-between gap-3 rounded-2xl border-2 border-clay-brown/20 px-4 py-3";
export const pageTitleClass = "font-display text-3xl font-bold text-ink";
export const pageIntroClass = "font-sans text-sm text-ink/70";
