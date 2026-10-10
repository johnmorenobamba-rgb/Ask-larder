import type { FeatureIconName } from "@/data/features";

// Line icons in the same 24x24, 1.5 stroke language as the rest of the marketing glyphs (no stock icon library).
export function FeatureIcon({ name, size = 26 }: { name: FeatureIconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const;
  const s = { stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "chat":
      return (
        <svg {...common}>
          <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-4 4v-4H6a2 2 0 0 1-2-2Z" {...s} />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M6 3.5h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" {...s} />
          <path d="M9 3.5v18M12 8h4M12 12h4" {...s} />
        </svg>
      );
    case "forms":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="17" rx="1.5" {...s} />
          <path d="M9 3h6v3H9zM8.5 11l1.5 1.5L13 9.5M8.5 17l1.5 1.5L13 15.5M15 11h1.5M15 17h1.5" {...s} />
        </svg>
      );
    case "badge":
      return (
        <svg {...common}>
          <circle cx="12" cy="10" r="6" {...s} />
          <path d="m8.5 15-1.5 6 5-2 5 2-1.5-6" {...s} />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" {...s} />
          <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" {...s} />
          <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" {...s} />
          <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" {...s} />
        </svg>
      );
    case "station":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6" height="6" rx="1" {...s} />
          <rect x="14" y="4" width="6" height="6" rx="1" {...s} />
          <rect x="4" y="14" width="6" height="6" rx="1" {...s} />
          <path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2" {...s} />
        </svg>
      );
  }
}
