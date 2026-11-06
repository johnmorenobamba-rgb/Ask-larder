import { LoadingOverlay } from "@/components/shared/LoadingOverlay";

// Covers owner login and reset-password, plus the first entry into owner/(protected), whose layout awaits the owner session above its own inner loading boundary.
export default function OwnerVenueLoading() {
  return <LoadingOverlay />;
}
