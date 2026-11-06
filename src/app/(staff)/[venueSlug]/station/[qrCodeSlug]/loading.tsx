import { LoadingOverlay } from "@/components/shared/LoadingOverlay";

// Station hub (QR scan landing). Each station screen is an async Server Component, and the station tree sits outside (protected), so it never inherited that loading boundary.
export default function StationHubLoading() {
  return <LoadingOverlay />;
}
