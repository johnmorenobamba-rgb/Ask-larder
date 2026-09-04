import { LoadingOverlay } from "@/components/shared/LoadingOverlay";

// Next.js App Router Suspense fallback -- covers every navigation between
// pages under owner/(protected) (dashboard, modules, modules/[id]/edit,
// modules/[id]/versions, staff, certs, stations, escalations, near-misses,
// photo-library, completions) automatically.
export default function OwnerProtectedLoading() {
  return <LoadingOverlay />;
}
