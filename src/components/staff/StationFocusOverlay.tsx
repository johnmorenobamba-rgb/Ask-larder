"use client";

export type FocusedStation = {
  id: string;
  name: string;
  department: string;
  number: string;
  photoUrl: string;
  qrDataUrl: string;
  href: string;
};

/**
 * Block J5 redo — click-to-focus zoom, repurposed from the reference
 * carousel's "click image -> zoom into overlay" behavior. Bigger photo,
 * full station details, and a larger QR chip -- mainly useful for an
 * owner double-checking a printed code matches the right station, since
 * real scanning happens off the physical code, not this screen.
 */
export function StationFocusOverlay({
  station,
  onClose,
}: {
  station: FocusedStation | null;
  onClose: () => void;
}) {
  if (!station) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={station.name}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-surface animate-focus-in w-full max-w-sm overflow-hidden rounded-3xl"
      >
        <div className="relative h-56 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed/stock URL, no benefit from next/image */}
          <img src={station.photoUrl} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink/70 text-parchment"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">
            {station.number} · {station.department}
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{station.name}</p>
          <div className="mt-4 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- server-generated data URL, no benefit from next/image */}
            <img
              src={station.qrDataUrl}
              alt={`QR code for ${station.name}`}
              className="h-28 w-28 shrink-0 rounded-xl border-2 border-clay-brown/20 bg-white p-2"
            />
            <p className="font-sans text-sm text-clay-brown">
              Staff scan the printed code at this station to open its content directly — this is just here to confirm
              it matches the right station.
            </p>
          </div>
          <a
            href={station.href}
            className="mt-4 block rounded-full bg-ink px-5 py-3 text-center font-sans text-sm font-medium text-parchment"
          >
            Open station content
          </a>
        </div>
      </div>
    </div>
  );
}
