import { ContentSkeleton } from "@/components/shared/ContentSkeleton";

// Next.js App Router Suspense fallback -- covers every navigation between
// pages under owner/(protected) (dashboard, modules, modules/[id]/edit,
// modules/[id]/versions, staff, certs, stations, escalations, near-misses,
// photo-library, completions) automatically. A content area skeleton, not a
// full screen overlay: the owner header and its nav drawer stay on screen and
// usable while the next page loads (performance plan, Phase 3).
export default function OwnerProtectedLoading() {
  return <ContentSkeleton area="owner" />;
}
