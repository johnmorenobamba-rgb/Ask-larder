import type { AnchorHTMLAttributes, ReactNode } from "react";

// Block N3 -- OwnerDashboardBoard.tsx uses next/link's <Link> purely for
// its href (navigation), never clicked during a Remotion render. A plain
// anchor with the same children/className surface is sufficient.
export default function Link({
  href,
  children,
  ...rest
}: { href: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
