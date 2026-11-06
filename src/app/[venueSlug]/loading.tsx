import { LoadingOverlay } from "@/components/shared/LoadingOverlay";

// Venue gateway (/venueSlug). Async: reads the venue roster before rendering.
export default function VenueGatewayLoading() {
  return <LoadingOverlay />;
}
