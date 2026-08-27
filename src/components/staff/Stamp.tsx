/**
 * The Stamp — the one signature trust-moment element in the brand system.
 * Fires ONLY at module completion, certificate upload, and e-signature
 * confirmation. Never use this for decoration or any other completion state
 * (no confetti, no generic checkmarks — see Branding Kit).
 */
export function Stamp({
  label,
  size = "default",
}: {
  label: string;
  size?: "default" | "large";
}) {
  const dimension = size === "large" ? 160 : 88;

  return (
    <div className="flex flex-col items-center gap-3 animate-stamp">
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 100 100"
        role="img"
        aria-label={label}
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="var(--color-preserve-red)"
          strokeWidth="3"
        />
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="var(--color-preserve-red)"
          strokeWidth="1.5"
        />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fontSize="11"
          fontFamily="var(--font-mono)"
          fill="var(--color-preserve-red)"
          letterSpacing="0.5"
        >
          APPROVED
        </text>
      </svg>
      <p className="font-mono text-sm text-ink text-center">{label}</p>
    </div>
  );
}
