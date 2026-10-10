import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { template: "%s | Larder", default: "Features | Larder" },
};

export default function FeaturesLayout({ children }: LayoutProps<"/features">) {
  return children;
}
