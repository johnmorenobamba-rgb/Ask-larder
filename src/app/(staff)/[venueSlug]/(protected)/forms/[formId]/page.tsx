import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PassSlide } from "@/components/staff/PassSlide";
import { GenericComplianceForm } from "@/components/staff/GenericComplianceForm";
import { getStaffDepartment } from "@/lib/compliance/b2Data";
import { getGenericForm } from "@/lib/compliance/engine/forms";
import { canFillStage, canOpenForm, isFormOn } from "@/lib/compliance/engine/activation";
import { loadActivationContext, loadActivationRows } from "@/lib/compliance/engine/hubData";
import { loadFormPage } from "@/lib/compliance/engine/formPageData";
import { FORM_TAG_LABELS } from "@/lib/compliance/engine/types";
import { formatHour } from "@/lib/compliance/engine/due";

export const dynamic = "force-dynamic";

// One generic compliance form for staff (everything except the B2 temperature log, which keeps its own page).
export default async function ComplianceFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ venueSlug: string; formId: string }>;
  searchParams: Promise<{ stage?: string; chain?: string }>;
}) {
  const { venueSlug, formId } = await params;
  const sp = await searchParams;
  if (formId === "B2") redirect(`/${venueSlug}/temperature`);
  const def = getGenericForm(formId);
  if (!def) notFound();

  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);
  if (!staff.staff_role_id && !staff.isManagerTier) redirect(`/${venueSlug}/roles`);

  const supabase = await createClient();
  const admin = createAdminClient();
  const dept = await getStaffDepartment(supabase, staff.staff_role_id);
  const who = { isManagerTier: staff.isManagerTier, department: dept.department };
  if (dept.ok && !canOpenForm(def, who)) redirect(`/${venueSlug}/forms`);

  const [{ ctx }, { rows }] = await Promise.all([loadActivationContext(supabase, admin, staff.venue_id!), loadActivationRows(supabase, staff.venue_id!)]);
  const on = isFormOn(def, rows.get(def.id), ctx);

  const wantedStage = typeof sp.stage === "string" ? sp.stage : null;
  const data = await loadFormPage(supabase, admin, { venueId: staff.venue_id!, staffId: staff.id, def, stageKey: wantedStage });
  const staged = !!def.stages;
  const showingStage = staged && wantedStage && data.stage ? data.stage : null;
  const chainId = typeof sp.chain === "string" ? sp.chain : null;

  const backHref = `/${venueSlug}/forms`;

  return (
    <main className="min-h-screen bg-parchment px-6 pb-44 pt-24">
      <PassSlide>
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="space-y-2">
            <Link href={staged && showingStage ? `/${venueSlug}/forms/${def.id}` : backHref} className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-wide text-clay-brown hover:text-ink">
              {staged && showingStage ? `Back to ${def.title}` : "Back to forms"}
            </Link>
            <h1 className="font-display text-3xl font-bold text-ink">{showingStage ? `${def.title}: ${showingStage.label}` : def.title}</h1>
            <p className="font-sans text-base text-ink/70">{showingStage ? showingStage.blurb : def.summary}</p>
            <p className="font-sans text-sm text-ink/70">
              <span className="mr-2 inline-block rounded-full border border-clay-brown px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-clay-brown">
                {FORM_TAG_LABELS[def.tag]}
              </span>
              {def.cadenceNote} About {def.estMinutes} {def.estMinutes === 1 ? "minute" : "minutes"}.
              {def.dueAfterHour !== undefined ? ` Due by ${formatHour(def.dueAfterHour)}.` : ""}
            </p>
            <p className="font-sans text-sm text-ink/70">{def.tagNote}</p>
            {def.ruleTag && (
              <p className="font-sans text-sm text-ink/80">
                <span className="mr-2 inline-block rounded-full border border-clay-brown px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-clay-brown">
                  {FORM_TAG_LABELS[def.ruleTag.tag]}
                </span>
                {def.ruleTag.text}
              </p>
            )}
            {def.defaultList && (
              <p className="font-sans text-sm text-ink/70">
                Default list, review before use. <span className="sr-only">The owner should check it suits this venue.</span>
              </p>
            )}
          </div>

          {(data.degraded || !dept.ok) && (
            <p role="alert" className="rounded-2xl border-2 border-preserve-red px-4 py-3 font-sans text-base text-preserve-red">
              Couldn&apos;t load everything on this page. What you see may be incomplete. Reload the page to try again.
            </p>
          )}

          {!on ? (
            <p className="rounded-2xl border-2 border-clay-brown px-4 py-4 font-sans text-base text-ink">
              This form is switched off for your venue. Ask your manager if you think it should be on.
            </p>
          ) : staged && !showingStage ? (
            <StageHome venueSlug={venueSlug} formId={def.id} data={data} def={def} who={who} />
          ) : (
            <GenericComplianceForm
              key={`${def.id}-${showingStage?.key ?? "x"}-${chainId ?? "new"}`}
              formId={def.id}
              title={def.title}
              blurb={def.summary}
              stage={showingStage?.key ?? null}
              stageLabel={showingStage?.label ?? null}
              chainId={chainId}
              fields={data.fields}
              failRules={data.failRules}
              allowCorrection={def.allowCorrection}
              cosign={!!def.cosign}
              cosigners={data.cosigners}
              isRegister={def.kind === "register"}
              event={!!def.event}
              records={data.records}
              registerRows={data.registerRows}
              doneNote={data.doneNote}
              backHref={backHref}
            />
          )}

          <p className="font-sans text-sm text-ink/70">{def.failBehaviour}</p>
        </div>
      </PassSlide>
    </main>
  );
}

function StageHome({
  venueSlug,
  formId,
  data,
  def,
  who,
}: {
  venueSlug: string;
  formId: string;
  data: Awaited<ReturnType<typeof loadFormPage>>;
  def: NonNullable<ReturnType<typeof getGenericForm>>;
  who: { isManagerTier: boolean; department: string | null | undefined };
}) {
  const stages = def.stages!;
  const first = stages[0];
  const canStart = canFillStage(def, first, who);
  return (
    <div className="space-y-6">
      {canStart && (
        <Link
          href={`/${venueSlug}/forms/${formId}?stage=${first.key}`}
          className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-preserve-red px-8 font-sans text-lg font-medium text-parchment sm:w-auto"
        >
          {first.label}
        </Link>
      )}
      <section aria-label="Waiting for the next step" className="space-y-2">
        <h2 className="font-mono text-xs uppercase tracking-wide text-clay-brown">Waiting for the next step</h2>
        {data.openChains.length === 0 ? (
          <p className="font-sans text-base text-ink/70">Nothing is waiting.</p>
        ) : (
          <ul className="space-y-2">
            {data.openChains.map((c) => {
              const stage = stages.find((s) => s.key === c.nextStage)!;
              const can = canFillStage(def, stage, who);
              return (
                <li key={c.chainId} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 ${c.overdue ? "border-preserve-red" : "border-clay-brown"}`}>
                  <div className="space-y-0.5">
                    <p className="font-sans text-base font-medium text-ink">{c.title}</p>
                    <p className="font-sans text-sm text-ink/70">{c.detail}</p>
                    {c.dueNote && <p className={`font-sans text-sm ${c.overdue ? "font-medium text-preserve-red" : "text-ink/70"}`}>{c.overdue ? `${c.dueNote}. Overdue.` : `${c.dueNote}.`}</p>}
                  </div>
                  {can ? (
                    <Link
                      href={`/${venueSlug}/forms/${formId}?stage=${c.nextStage}&chain=${c.chainId}`}
                      className="inline-flex min-h-12 items-center rounded-full border-2 border-ink px-5 font-sans text-base font-medium text-ink hover:bg-ink hover:text-parchment"
                    >
                      {c.nextStageLabel}
                    </Link>
                  ) : (
                    <p className="font-sans text-sm text-ink/70">Waiting for {stage.departments.includes("BOH") ? "the kitchen" : "front of house"}.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
