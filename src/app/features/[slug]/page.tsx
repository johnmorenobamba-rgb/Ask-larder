import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeaturePage } from "@/components/marketing/FeaturePage";
import { FEATURE_SLUGS, getFeature } from "@/data/features";

export const dynamicParams = false;

export function generateStaticParams() {
  return FEATURE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/features/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) return {};
  return {
    title: feature.seo.title,
    description: feature.seo.description,
    alternates: { canonical: `/features/${feature.slug}` },
    openGraph: {
      title: feature.seo.title,
      description: feature.seo.description,
      url: `/features/${feature.slug}`,
      siteName: "Larder",
      locale: "en_AU",
      type: "website",
    },
  };
}

export default async function FeatureRoute({ params }: PageProps<"/features/[slug]">) {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) notFound();
  return <FeaturePage feature={feature} />;
}
