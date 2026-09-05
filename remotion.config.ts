import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";
import path from "node:path";

// `__dirname` inside this config file does NOT reliably resolve to the
// repo root under Remotion's config-loading mechanism (confirmed live --
// it resolved into @remotion/cli's own installed package directory
// instead), so every path below is built from `process.cwd()` (this repo,
// since `npx remotion ...` is always invoked from here) rather than
// `__dirname`.
const ROOT = process.cwd();

// Dedicated public dir under remotion/ (not the Next.js app's own
// public/) so the video's audio asset doesn't get mixed into the app's
// static files.
Config.setPublicDir(path.resolve(ROOT, "remotion/public"));

// Block N3 -- the explainer video imports real app components (ChitMark,
// BentoGrid, OwnerDashboardBoard) directly, so it never drifts out of sync
// with the live product. Those components have two Next.js-only imports
// that don't exist in Remotion's standalone bundler: `useRouter` from
// next/navigation (BentoGrid, used only inside one onClick -- irrelevant
// during a render, nothing ever clicks) and `Link` from next/link
// (OwnerDashboardBoard, same reasoning). Both are aliased to tiny no-op
// shims below rather than forking the components. Tailwind v4 is the
// real app's own setup (globals.css's `@import "tailwindcss"` +
// @tailwindcss/postcss, no JS config) -- reused via the real file, not
// duplicated tokens.
Config.overrideBundlerConfig((currentConfiguration) => {
  const withTailwind = enableTailwind(currentConfiguration);
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      alias: {
        ...(withTailwind.resolve?.alias ?? {}),
        "next/navigation": path.resolve(ROOT, "remotion/shims/next-navigation.ts"),
        "next/link": path.resolve(ROOT, "remotion/shims/next-link.tsx"),
        "@": path.resolve(ROOT, "src"),
      },
    },
  };
});
