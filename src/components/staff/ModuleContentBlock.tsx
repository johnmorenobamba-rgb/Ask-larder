/**
 * Renders a section's authored content as real structural elements instead
 * of raw text -- a section written as:
 *   ## Heading
 *   Body paragraph.
 *   [CALLOUT] Safety-critical line.
 * becomes an actual heading, a paragraph, and a styled callout box, rather
 * than the literal "## " / "[CALLOUT] " characters showing on screen.
 * Numbered steps ("1. ...", "2. ...") are left as plain text -- they
 * already read correctly as a list without markup.
 */
export function ModuleContentBlock({ content }: { content: string }) {
  const blocks = content.split(/\n\s*\n/).filter(Boolean);

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={i} className="font-display text-xl font-bold text-ink">
              {block.slice(3)}
            </h2>
          );
        }
        if (block.startsWith("[CALLOUT] ")) {
          return (
            <div key={i} className="rounded-r-lg border-l-4 border-preserve-red bg-preserve-red/5 py-3 pl-4 pr-3">
              <p className="whitespace-pre-wrap font-sans text-ink">{block.slice(10)}</p>
            </div>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap font-sans text-ink">
            {block}
          </p>
        );
      })}
    </div>
  );
}
