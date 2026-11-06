import { LoadingOverlay } from "@/components/shared/LoadingOverlay";

// Covers staff routes outside (protected): login, module-updates, and the first entry into the station and (protected) layouts, whose own awaits (session, venue iPad mode) sit above their inner loading boundaries.
export default function StaffVenueLoading() {
  return <LoadingOverlay />;
}
