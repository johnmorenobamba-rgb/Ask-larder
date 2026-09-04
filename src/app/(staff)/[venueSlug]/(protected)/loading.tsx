import { LoadingOverlay } from "@/components/shared/LoadingOverlay";

// Next.js App Router Suspense fallback -- covers every navigation between
// pages under (protected) (home, modules, modules/[id], certs, certs/[id],
// settings, roles, welcome, intro, signature, complete) automatically,
// since each is a real async Server Component doing its own data fetch.
export default function StaffProtectedLoading() {
  return <LoadingOverlay />;
}
