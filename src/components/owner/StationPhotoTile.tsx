"use client";

/**
 * The owner Stations page's tile image, extracted out of that (server)
 * page so it can catch a stale signed URL at the browser's actual fetch
 * (expired token, or the underlying object gone) and fall back to the
 * station's QR code instead of rendering a blank tile -- see
 * photoLibraryUrl.ts's TTL comment for the root cause this guards against.
 */
export function StationPhotoTile({
  photoUrl,
  qrDataUrl,
  name,
}: {
  photoUrl: string | null;
  qrDataUrl: string;
  name: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- server-generated data URL / short-lived signed URL, neither benefits from next/image
    <img
      src={photoUrl ?? qrDataUrl}
      alt={photoUrl ? name : `QR code for ${name}`}
      className={photoUrl ? "h-20 w-20 rounded-xl object-cover" : "h-20 w-20"}
      onError={(e) => {
        if (e.currentTarget.src !== qrDataUrl) e.currentTarget.src = qrDataUrl;
      }}
    />
  );
}
