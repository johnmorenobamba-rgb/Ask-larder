import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import { SplashScreen } from "@/components/shared/SplashScreen";
import "./globals.css";

// Block L2 (Decision Log, 31 Aug 2026) — Fraunces retired as the
// display/headline face for a bold geometric sans. Space Grotesk is the
// confirmed pick: a real geometric-sans display face with a genuine bold
// weight (Fraunces' actual role here), not just a swapped variable name.
// Inter/IBM Plex Mono are unchanged -- see globals.css's --font-display.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  weight: ["500", "700"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ask Larder",
  description: "Staff onboarding and training, built from your venue's own way of doing things.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SplashScreen>{children}</SplashScreen>
      </body>
    </html>
  );
}
