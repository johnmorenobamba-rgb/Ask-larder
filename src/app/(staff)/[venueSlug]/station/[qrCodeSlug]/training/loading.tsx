import { LoadingOverlay } from "@/components/shared/LoadingOverlay";

// Station training. A loading.tsx per station screen, because moving between siblings (hub to training) only suspends at the new segment's own boundary.
export default function StationTrainingLoading() {
  return <LoadingOverlay />;
}
