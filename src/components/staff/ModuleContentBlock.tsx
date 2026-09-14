/**
 * Renders a section's authored content as real structural elements instead
 * of raw text -- a section written as:
 *   ## Heading
 *   Body paragraph with **an emphasised phrase**.
 *   [CALLOUT] Safety-critical line.
 * becomes an actual heading, a paragraph with a real <strong>, and a styled
 * callout box, rather than the literal "## " / "**" / "[CALLOUT] " characters
 * showing on screen. Numbered steps ("1. ...", "2. ...") are left as plain
 * text -- they already read correctly as a list without markup.
 *
 * Some older content still uses the pre-[CALLOUT] "**Callout: ...**"
 * convention at the block level -- inline-bold rendering means it at least
 * shows as real bold text instead of literal asterisks, but it won't get
 * the accent-bar box below. That's a content-authoring decision (migrate
 * old content vs. keep supporting both conventions), not something to
 * silently resolve here.
 */
function renderInlineBold(text: string, keyPrefix: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

export function ModuleContentBlock({ content }: { content: string }) {
  const blocks = content.split(/\n\s*\n/).filter(Boolean);

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={i} className="font-display text-xl font-bold text-ink">
              {renderInlineBold(block.slice(3), `h-${i}`)}
            </h2>
          );
        }
        if (block.startsWith("[CALLOUT] ")) {
          return (
            <div key={i} className="rounded-r-lg border-l-4 border-preserve-red bg-preserve-red/5 py-3 pl-4 pr-3">
              <p className="whitespace-pre-wrap font-sans text-ink">{renderInlineBold(block.slice(10), `c-${i}`)}</p>
            </div>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap font-sans text-ink">
            {renderInlineBold(block, `p-${i}`)}
          </p>
        );
      })}
    </div>
  );
}
