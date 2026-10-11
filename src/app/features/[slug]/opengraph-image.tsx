import { ImageResponse } from "next/og";
import { FEATURE_SLUGS, getFeature } from "@/data/features";

export const alt = "Larder feature";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return FEATURE_SLUGS.map((slug) => ({ slug }));
}

// One generated card per feature: Ink background, Parchment headline, a Saffron rule and the Larder wordmark.
export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = getFeature(slug);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1F1B16",
          color: "#F2E9D8",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>Larder</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", width: 120, height: 8, background: "#E8A93B", marginBottom: 32 }} />
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>{feature?.h1 ?? "Larder features"}</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#E8A93B" }}>Staff onboarding and training for independent venues</div>
      </div>
    ),
    size,
  );
}
