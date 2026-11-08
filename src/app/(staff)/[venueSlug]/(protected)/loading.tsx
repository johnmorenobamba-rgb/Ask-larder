import { ContentSkeleton } from "@/components/shared/ContentSkeleton";

// Next.js App Router Suspense fallback for every page under (protected) (home, modules, modules/[id], certs,
// certs/[id], settings, roles, welcome, intro, signature, complete), each a real async Server Component doing its own
// data fetch. A content area skeleton, not a full screen overlay: the header, nav drawer and floating buttons from the
// layout stay on screen and usable while the next page loads (performance plan, Phase 3).
export default function StaffProtectedLoading() {
  return <ContentSkeleton area="staff" />;
}
