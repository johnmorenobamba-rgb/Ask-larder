import Link from "next/link";
import { ModuleContentBlock } from "@/components/staff/ModuleContentBlock";

type Section = { id: string; section_order: number; content: string | null };

// Training content for the shared venue iPad: every section on one page, no check questions, no completion. A person
// logs in with their own PIN to complete a module, so progress is always recorded under a name.
export function ReadOnlyModule({
  title,
  sections,
  backHref,
  backLabel,
}: {
  title: string;
  sections: Section[];
  backHref: string;
  backLabel: string;
}) {
  const ordered = [...sections].sort((a, b) => a.section_order - b.section_order);
  return (
    <main className="min-h-screen bg-parchment px-6 pb-16 pt-24">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <Link href={backHref} className="font-mono text-xs text-clay-brown underline">
          {backLabel}
        </Link>
        <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
        <p className="font-sans text-sm text-ink/70">
          You are reading on the venue iPad. Log in with your PIN to complete this module.
        </p>
        {ordered.map((s) => (
          <section key={s.id}>
            <ModuleContentBlock content={s.content ?? ""} />
          </section>
        ))}
      </div>
    </main>
  );
}
