import type { SopDocumentContent } from "@/lib/ai/generateSopDocument";

// Block R2 -- the professional SOP document format. Structural reference
// only (Purpose/Scope/Who performs it/Materials/Procedure/Safety-critical
// callouts/Definition of done/Escalation, per the Module Content &
// Assessment Standard's Part 0 shape), rendered entirely in Larder's own
// brand kit -- no reference to any outside template's styling.
//
// print:bg-white on the outer container is a print-practicality call, not a
// brand deviation: the screen view keeps the Parchment surface every other
// owner page uses, but a printed page defaults to white so this doesn't
// burn a full page of tinted ink on every copy -- the brand accent colors
// (Ink text, Preserve Red for safety-critical, IBM Plex Mono for the
// header/footer meta) still carry the document's visual identity on paper.
export function SopDocumentView({
  venueName,
  legalName,
  address,
  moduleTitle,
  approvedByName,
  approvedAt,
  generatedAt,
  roleNames,
  content,
}: {
  venueName: string;
  legalName: string | null;
  address: string | null;
  moduleTitle: string;
  approvedByName: string | null;
  approvedAt: string | null;
  generatedAt: string;
  roleNames: string[];
  content: SopDocumentContent;
}) {
  return (
    <article className="mx-auto w-full max-w-2xl bg-parchment px-8 py-10 print:bg-white print:px-0 print:py-0">
      <header className="space-y-4 border-b-2 border-ink pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Standard operating procedure</p>
          <h1 className="font-display text-3xl font-bold text-ink">{moduleTitle}</h1>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs">
          <MetaRow label="Venue (trading name)" value={venueName} />
          <MetaRow label="Legal name" value={legalName} flagIfMissing />
          <MetaRow label="Address" value={address} flagIfMissing />
          <MetaRow label="Department / role" value={roleNames.length > 0 ? roleNames.join(", ") : "All roles"} />
          <MetaRow label="Prepared by" value="Larder (generated from venue-approved content)" />
          <MetaRow
            label="Effective date"
            value={approvedAt ? new Date(approvedAt).toLocaleDateString() : null}
            flagIfMissing
          />
          <MetaRow label="Approved by" value={approvedByName} flagIfMissing />
          <MetaRow label="Document generated" value={new Date(generatedAt).toLocaleDateString()} />
        </dl>
      </header>

      <div className="mt-6 space-y-6">
        <Section title="Purpose">
          <p className="font-sans text-ink">{content.purpose}</p>
        </Section>

        <Section title="Scope">
          <p className="font-sans text-ink">{content.scope}</p>
        </Section>

        <Section title="Who performs it">
          <p className="font-sans text-ink">{content.whoPerformsIt}</p>
        </Section>

        {content.materials.length > 0 && (
          <Section title="Materials">
            <ul className="list-disc space-y-1 pl-5 font-sans text-ink">
              {content.materials.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Procedure">
          <ol className="list-decimal space-y-2 pl-5 font-sans text-ink">
            {content.procedure.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </Section>

        {content.safetyCriticalCallouts.length > 0 && (
          <div className="space-y-2 rounded-lg border-2 border-preserve-red bg-preserve-red/5 px-4 py-3 print:bg-white">
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-preserve-red">Safety critical</p>
            <ul className="list-disc space-y-1 pl-5 font-sans text-ink">
              {content.safetyCriticalCallouts.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        <Section title="Definition of done">
          <p className="font-sans text-ink">{content.definitionOfDone}</p>
        </Section>

        <Section title="Escalation contact">
          <p className="font-sans text-ink">{content.escalationContact}</p>
        </Section>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-clay-brown">{title}</h2>
      {children}
    </section>
  );
}

function MetaRow({
  label,
  value,
  flagIfMissing = false,
}: {
  label: string;
  value: string | null;
  flagIfMissing?: boolean;
}) {
  const missing = !value;
  return (
    <div>
      <dt className="text-clay-brown">{label}</dt>
      <dd className={missing && flagIfMissing ? "font-bold text-preserve-red" : "text-ink"}>
        {value ?? "Not recorded"}
      </dd>
    </div>
  );
}
